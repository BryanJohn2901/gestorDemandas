import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSubscription } from "@/lib/asaas";

type AsaasPayment = {
  id: string;
  customer: string;
  subscription?: string;
  value: number;
  dueDate: string;
  status: string;
  externalReference?: string;
};

function tokenValido(recebido: string | null): boolean {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!recebido || !esperado) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Chamada servidor-a-servidor sem sessão — createAdminClient() em tudo.
export async function POST(request: NextRequest) {
  if (!tokenValido(request.headers.get("asaas-access-token"))) {
    return NextResponse.json({ error: "token inválido" }, { status: 401 });
  }

  const body = await request.json();
  const event: string = body.event;
  const payment: AsaasPayment | undefined = body.payment;

  if (!payment) {
    return NextResponse.json({ ok: true });
  }

  const confirmado = event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED";
  const atrasado = event === "PAYMENT_OVERDUE";

  if (!confirmado && !atrasado) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();

  // Correlação em ordem, não em dois caminhos independentes — uma
  // reentrega do webhook do 1º pagamento depois que a empresa já existe
  // teria os dois matches ao mesmo tempo (token usado + subscription_id
  // já setado). Empresa existente tem prioridade.
  const { data: empresaExistente } = payment.subscription
    ? await admin
        .from("empresas")
        .select("id")
        .eq("asaas_subscription_id", payment.subscription)
        .maybeSingle()
    : { data: null };

  if (empresaExistente) {
    // Renovação de assinatura já vinculada a uma empresa.
    let currentDueDate = payment.dueDate;
    if (payment.subscription) {
      try {
        const subscription = await getSubscription(payment.subscription);
        currentDueDate = subscription.nextDueDate;
      } catch (subscriptionError) {
        console.error("[webhook-asaas] getSubscription", subscriptionError);
      }
    }

    const { error: pagamentoError } = await admin.from("pagamentos").upsert(
      {
        empresa_id: empresaExistente.id,
        asaas_payment_id: payment.id,
        valor: payment.value,
        status: confirmado ? "pago" : "atrasado",
        vencimento: payment.dueDate,
        pago_em: confirmado ? new Date().toISOString() : null,
      },
      { onConflict: "asaas_payment_id" }
    );
    if (pagamentoError) {
      console.error("[webhook-asaas] upsert pagamento", pagamentoError);
    }

    const { error: empresaError } = await admin
      .from("empresas")
      .update({
        subscription_status: confirmado ? "ativa" : "atrasada",
        current_due_date: currentDueDate,
      })
      .eq("id", empresaExistente.id);
    if (empresaError) {
      console.error("[webhook-asaas] update empresa", empresaError);
    }

    return NextResponse.json({ ok: true });
  }

  // Sem empresa ainda vinculada — é o primeiro pagamento de alguém que
  // acabou de terminar o Checkout, correlaciona pelo token que mandamos
  // como externalReference.
  if (!payment.externalReference) {
    return NextResponse.json({ ok: true });
  }

  if (confirmado) {
    let vencimento = payment.dueDate;
    if (payment.subscription) {
      try {
        const subscription = await getSubscription(payment.subscription);
        vencimento = subscription.nextDueDate;
      } catch (subscriptionError) {
        console.error("[webhook-asaas] getSubscription", subscriptionError);
      }
    }

    const { error } = await admin
      .from("pre_cadastros")
      .update({
        status: "pago",
        asaas_customer_id: payment.customer,
        asaas_subscription_id: payment.subscription ?? null,
        primeiro_pagamento_id: payment.id,
        primeiro_pagamento_valor: payment.value,
        primeiro_pagamento_vencimento: vencimento,
      })
      .eq("token", payment.externalReference)
      .eq("status", "aguardando_pagamento");

    if (error) {
      console.error("[webhook-asaas] update pre_cadastro", error);
    }
  }

  return NextResponse.json({ ok: true });
}
