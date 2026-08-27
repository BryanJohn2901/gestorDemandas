"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  criarEmpresaFormSchema,
  type CriarEmpresaFormValues,
} from "@/lib/validations/criar-empresa";

type ActionResult = { success: false; error: string };

export async function criarEmpresaPosPagamento(
  token: string,
  input: CriarEmpresaFormValues
): Promise<ActionResult> {
  const parsed = criarEmpresaFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { empresaNome, nome, email, password } = parsed.data;

  const admin = createAdminClient();

  // CAS atômico primeiro, antes de criar qualquer coisa — reenviar o
  // formulário 2x (duplo clique, timeout+retry) não pode criar 2 empresas.
  // update...where narrowing é atômico no Postgres: 0 linhas afetadas =
  // já foi usado ou não tá pago, aborta.
  const { data: consumido, error: casError } = await admin
    .from("pre_cadastros")
    .update({ status: "usado" })
    .eq("token", token)
    .eq("status", "pago")
    .select(
      "asaas_customer_id, asaas_subscription_id, primeiro_pagamento_id, primeiro_pagamento_valor, primeiro_pagamento_vencimento"
    )
    .maybeSingle();

  if (casError || !consumido) {
    console.error("[criarEmpresaPosPagamento] CAS", token, casError);
    return {
      success: false,
      error: "Este link já foi usado ou o pagamento ainda não foi confirmado.",
    };
  }

  async function reverterConsumo() {
    await admin.from("pre_cadastros").update({ status: "pago" }).eq("token", token);
  }

  const { data: empresa, error: empresaError } = await admin
    .from("empresas")
    .insert({
      nome: empresaNome,
      asaas_customer_id: consumido.asaas_customer_id,
      asaas_subscription_id: consumido.asaas_subscription_id,
      subscription_status: "ativa",
      current_due_date: consumido.primeiro_pagamento_vencimento,
    })
    .select("id")
    .single();

  if (empresaError || !empresa) {
    console.error("[criarEmpresaPosPagamento] empresa", empresaError);
    await reverterConsumo();
    return { success: false, error: "Não foi possível criar a empresa. Tente de novo." };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    // empresa_id precisa ir junto aqui, não num update depois — o trigger
    // handle_new_user() insere o profile na hora do createUser, e a
    // constraint profiles_empresa_id_by_role checa nesse exato insert.
    user_metadata: { nome, cargo: "Admin", role: "admin", empresa_id: empresa.id },
  });

  if (error || !data.user) {
    await admin.from("empresas").delete().eq("id", empresa.id);
    await reverterConsumo();

    if (error?.code === "email_exists") {
      return {
        success: false,
        error:
          "Já existe uma conta com esse e-mail. Se você já pagou antes, faça login em vez de criar de novo — ou fale com o suporte.",
      };
    }
    console.error("[criarEmpresaPosPagamento] user", error);
    return { success: false, error: "Não foi possível criar sua conta. Tente de novo." };
  }

  if (consumido.primeiro_pagamento_id && consumido.primeiro_pagamento_valor != null) {
    const { error: pagamentoError } = await admin.from("pagamentos").insert({
      empresa_id: empresa.id,
      asaas_payment_id: consumido.primeiro_pagamento_id,
      valor: consumido.primeiro_pagamento_valor,
      status: "pago",
      vencimento: consumido.primeiro_pagamento_vencimento ?? new Date().toISOString().slice(0, 10),
      pago_em: new Date().toISOString(),
    });
    if (pagamentoError) {
      console.error("[criarEmpresaPosPagamento] pagamento", pagamentoError);
    }
  }

  // O admin client não tem cookie adapter — não consegue nunca setar
  // sessão. Só o client normal (cookie-aware) faz o login pegar de verdade.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    console.error("[criarEmpresaPosPagamento] signin", signInError);
    redirect("/login?error=Conta criada. Faça login com a senha que você escolheu.");
  }

  redirect("/dashboard");
}
