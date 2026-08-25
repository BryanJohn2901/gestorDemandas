import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_DISABLED } from "@/lib/dev-flags";
import type { Profile } from "@/types/database";

// Nome do cookie que marca "essa sessão veio do link de recuperação de
// senha" — ver app/auth/confirm/route.ts e app/update-password/page.tsx.
export const RECOVERY_COOKIE = "pwd_recovery";

// Perfil usado enquanto o login tá desativado (LOGIN_DISABLED em
// lib/dev-flags.ts) — só pra telas renderizarem sem exigir sessão real.
// Não corresponde a um usuário de verdade no Supabase: consultas que
// dependem de RLS (auth.uid()) ainda podem voltar vazias/erro.
const DEV_PROFILE: Profile = {
  id: "00000000-0000-0000-0000-000000000000",
  nome: "Dev",
  email: "dev@local",
  cargo: "Desenvolvimento",
  role: "admin",
  status: "ativo",
  avatar_url: null,
  created_at: new Date().toISOString(),
};

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    if (LOGIN_DISABLED) {
      return DEV_PROFILE;
    }
    redirect("/login");
  }

  if (profile.status === "inativo") {
    redirect(
      `/login?error=${encodeURIComponent("Sua conta está inativa. Fale com o administrador.")}`
    );
  }

  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  return profile;
}
