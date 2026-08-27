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
  empresa_id: null,
  nome: "Dev",
  email: "dev@local",
  cargo: "Desenvolvimento",
  role: "admin",
  status: "ativo",
  avatar_url: null,
  created_at: new Date().toISOString(),
  last_seen_at: null,
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

// Fire-and-forget, uma vez por request (cache() aqui é só pra não chamar de
// novo a cada requireProfile() dentro do mesmo request — o throttle real de
// "no máximo 1x por minuto" já é feito dentro da função SQL).
const touchLastSeen = cache(async () => {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("touch_last_seen");
    if (error) console.error("[touchLastSeen]", error);
  } catch (error) {
    console.error("[touchLastSeen]", error);
  }
});

// Toleram 3 dias de atraso depois do vencimento antes de bloquear —
// cobre fim de semana/feriado sem deixar inadimplência se acumular muito.
const TOLERANCIA_ATRASO_MS = 3 * 24 * 60 * 60_000;

// select só das colunas necessárias, nunca a linha inteira — RLS libera
// (empresas_select_own), mas não tem motivo pra puxar asaas_customer_id/
// asaas_subscription_id aqui.
const getEmpresaAcesso = cache(async (empresaId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("empresas")
    .select("status, subscription_status, current_due_date")
    .eq("id", empresaId)
    .maybeSingle();
  return data;
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    if (LOGIN_DISABLED) {
      return DEV_PROFILE;
    }
    redirect("/login");
  }

  await touchLastSeen();

  if (profile.status === "inativo") {
    redirect(
      `/login?error=${encodeURIComponent("Sua conta está inativa. Fale com o administrador.")}`
    );
  }

  if (profile.role !== "master" && profile.empresa_id) {
    const empresa = await getEmpresaAcesso(profile.empresa_id);

    if (empresa?.status === "inativo") {
      redirect(
        `/login?error=${encodeURIComponent("Sua empresa está inativa. Fale com o administrador.")}`
      );
    }

    if (empresa?.subscription_status === "atrasada" && empresa.current_due_date) {
      const atrasoMs = Date.now() - new Date(empresa.current_due_date).getTime();
      if (atrasoMs > TOLERANCIA_ATRASO_MS) {
        redirect(
          `/login?error=${encodeURIComponent("O pagamento da sua empresa está em atraso. Regularize pra continuar usando.")}`
        );
      }
    }
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

export async function requireMaster(): Promise<Profile> {
  const profile = await requireProfile();

  if (profile.role !== "master") {
    redirect("/dashboard");
  }

  return profile;
}
