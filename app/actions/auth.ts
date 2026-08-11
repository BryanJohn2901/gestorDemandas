"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent("E-mail ou senha inválidos.")}&redirect=${encodeURIComponent(redirectTo)}`
    );
  }

  redirect(redirectTo);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
