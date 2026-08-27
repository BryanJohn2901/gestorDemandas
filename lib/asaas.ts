// Wrapper fino pra API do Asaas. Campos confirmados contra a documentação
// viva (docs.asaas.com) antes de escrever isso, não são suposição.

const BASE_URL =
  process.env.ASAAS_ENV === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";

async function asaasFetch<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: process.env.ASAAS_API_KEY!,
      ...init.headers,
    },
    // Sem isso, uma falha de rede até o Asaas deixa a Server Action/webhook
    // pendurado indefinidamente — mesmo raciocínio já usado no client do
    // Supabase em lib/supabase/middleware.ts.
    signal: AbortSignal.timeout(10_000),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Asaas ${path} falhou (${response.status}): ${JSON.stringify(data)}`
    );
  }

  return data as T;
}

function primeiraCobrancaHoje(): string {
  const agora = new Date();
  const data = agora.toISOString().slice(0, 10);
  return `${data} 00:00:00`;
}

type CheckoutSession = {
  id: string;
  link: string;
};

// Checkout hospedado do Asaas: cria o cliente (nome/e-mail/CPF-CNPJ) E a
// assinatura recorrente na própria página deles — não precisamos de
// formulário nosso pedindo esses dados antes de pagar.
export async function createCheckoutSession({
  token,
  planoValor,
  origin,
}: {
  token: string;
  planoValor: number;
  origin: string;
}): Promise<CheckoutSession> {
  return asaasFetch<CheckoutSession>("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      billingTypes: ["CREDIT_CARD", "PIX", "BOLETO"],
      chargeTypes: ["RECURRENT"],
      minutesToExpire: 60,
      externalReference: token,
      callback: {
        successUrl: `${origin}/criar-empresa?token=${token}`,
        cancelUrl: `${origin}/?checkout=cancelado`,
        expiredUrl: `${origin}/?checkout=expirado`,
      },
      items: [
        {
          name: "Assinatura TaskMonster",
          description: "Assinatura mensal",
          quantity: 1,
          value: planoValor,
        },
      ],
      // nextDueDate aqui é a data da PRIMEIRA cobrança (hoje, cobra na
      // hora) — formato confirmado no exemplo da documentação
      // ("YYYY-MM-DD HH:mm:ss").
      subscription: {
        cycle: "MONTHLY",
        nextDueDate: primeiraCobrancaHoje(),
      },
    }),
  });
}

type SubscriptionDetails = {
  id: string;
  nextDueDate: string;
};

// Fonte confiável de "próximo vencimento" — o dueDate de um payment já
// pago é da cobrança que acabou de sair, não da próxima.
export async function getSubscription(subscriptionId: string): Promise<SubscriptionDetails> {
  return asaasFetch<SubscriptionDetails>(`/subscriptions/${subscriptionId}`, {
    method: "GET",
  });
}
