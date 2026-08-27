"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { RECOVERY_COOKIE } from "@/lib/auth";
import { logEvento } from "@/lib/eventos";

// Só permite redirecionar para um caminho relativo dentro do próprio app.
// Sem isso, um link como /login?redirect=https://evil.com levaria o usuário
// pra fora do site logo após o login (open redirect / phishing).
function safeRedirect(path: string): string {
  if (path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\")) {
    return path;
  }
  return "/dashboard";
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirect(String(formData.get("redirectTo") || "/dashboard"));

  if (!email || !password) {
    redirect(
      `/login?error=${encodeURIComponent("Informe e-mail e senha.")}&redirect=${encodeURIComponent(redirectTo)}`
    );
  }

  const ip = await getClientIp();
  // Por IP+e-mail: freia brute-force numa conta sem travar todo mundo atrás
  // do mesmo IP (rede corporativa, NAT) por causa de uma tentativa errada.
  const { allowed } = checkRateLimit(`signin:${ip}:${email}`, 5, 5 * 60_000);
  if (!allowed) {
    redirect(
      `/login?error=${encodeURIComponent("Muitas tentativas. Aguarde alguns minutos e tente de novo.")}&redirect=${encodeURIComponent(redirectTo)}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("[signIn]", ip, email, error.status, error.message);
    redirect(
      `/login?error=${encodeURIComponent("E-mail ou senha inválidos.")}&redirect=${encodeURIComponent(redirectTo)}`
    );
  }

  await logEvento("login");
  redirect(redirectTo);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect(
      `/forgot-password?error=${encodeURIComponent("Informe seu e-mail.")}`
    );
  }

  const ip = await getClientIp();
  // Limite mais apertado: cada envio dispara e-mail de verdade (custo e
  // possível spam pra vítima de um e-mail alheio usado maliciosamente).
  const { allowed } = checkRateLimit(`reset:${ip}`, 3, 15 * 60_000);
  if (!allowed) {
    // Mesma mensagem de "enviado" de sempre — não revela que foi limitado,
    // só não dispara e-mail de novo.
    redirect("/forgot-password?sent=1");
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/update-password`,
  });

  // Não revela erro pro cliente (evita enumeração de contas), mas loga no
  // servidor — sem isso, falha de config (redirect URL, rate limit do
  // provedor de e-mail, etc) fica invisível e a tela sempre diz "enviado".
  if (error) {
    console.error("[requestPasswordReset]", error.status, error.message);
  }

  redirect("/forgot-password?sent=1");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password || password.length < 8) {
    redirect(
      `/update-password?error=${encodeURIComponent("A senha deve ter no mínimo 8 caracteres.")}`
    );
  }

  if (password !== confirmPassword) {
    redirect(
      `/update-password?error=${encodeURIComponent("As senhas não coincidem.")}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("[updatePassword]", error.status, error.message);
    redirect(
      `/update-password?error=${encodeURIComponent("Não foi possível atualizar a senha. Solicite um novo link.")}`
    );
  }

  (await cookies()).delete(RECOVERY_COOKIE);
  redirect("/login?error=Senha atualizada. Faça login com a nova senha.");
}
