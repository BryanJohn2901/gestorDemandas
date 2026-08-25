import { headers } from "next/headers";

// IP do cliente via header que a Vercel injeta. Fallback pra uma chave fixa
// (efetivamente 1 balde global) se não tiver — ainda assim melhor que nada.
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

// Rate limit em memória, por instância do processo. Não é distribuído — em
// produção na Vercel, cada instância de função tem seu próprio contador, e
// reinicia em cold start. Mesmo assim freia abuso básico (brute-force de
// login, spam de e-mail de reset) muito melhor do que nenhum limite. Se o
// tráfego justificar, trocar por algo compartilhado (Vercel KV/Upstash).
const hits = new Map<string, number[]>();

// Evita crescer pra sempre: limpa entradas velhas de vez em quando.
let lastSweep = Date.now();
function sweep(maxWindowMs: number) {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, timestamps] of hits) {
    const fresh = timestamps.filter((t) => now - t < maxWindowMs);
    if (fresh.length === 0) hits.delete(key);
    else hits.set(key, fresh);
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  sweep(windowMs);

  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    const retryAfterSeconds = Math.ceil(
      (windowMs - (now - timestamps[0])) / 1000
    );
    return { allowed: false, retryAfterSeconds };
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return { allowed: true, retryAfterSeconds: 0 };
}
