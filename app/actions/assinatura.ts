"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckoutSession } from "@/lib/asaas";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Endpoint público mais caro do app — cada tentativa dispara uma chamada
// de API paga/limitada no Asaas, não só um write no Supabase. Mais
// apertado que os outros rate limits.
export async function iniciarAssinatura() {
  const ip = await getClientIp();
  const { allowed } = checkRateLimit(`assinatura:${ip}`, 5, 60 * 60_000);
  if (!allowed) {
    redirect("/?erro=Muitas+tentativas.+Aguarde+um+pouco+e+tente+de+novo.");
  }

  const admin = createAdminClient();
  const { data: preCadastro, error } = await admin
    .from("pre_cadastros")
    .insert({})
    .select("token")
    .single();

  if (error || !preCadastro) {
    console.error("[iniciarAssinatura] pre_cadastro", error);
    redirect("/?erro=Não+foi+possível+iniciar+a+assinatura.+Tente+de+novo.");
  }

  const origin = (await headers()).get("origin")!;
  const planoValor = Number(process.env.ASAAS_PLANO_VALOR ?? "19.90");

  // redirect() do Next lança um sinal interno pra funcionar — não pode
  // ficar dentro do mesmo try/catch que trata erro do Asaas, senão o catch
  // pegaria o redirect de sucesso por engano.
  let checkoutLink: string;
  try {
    const checkout = await createCheckoutSession({
      token: preCadastro.token,
      planoValor,
      origin,
    });
    checkoutLink = checkout.link;
  } catch (checkoutError) {
    // Sem rollback necessário — só sobra uma linha órfã em pre_cadastros,
    // inofensiva (nunca vira empresa/usuário sem pagamento confirmado).
    console.error("[iniciarAssinatura] checkout", checkoutError);
    redirect("/?erro=Não+foi+possível+iniciar+a+assinatura.+Tente+de+novo.");
  }

  redirect(checkoutLink);
}
