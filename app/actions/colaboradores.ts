"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateTempPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  colaboradorFormSchema,
  type ColaboradorFormValues,
} from "@/lib/validations/colaborador";

type ActionResult =
  | { success: false; error: string }
  | { success: true; tempPassword?: string };

export async function createColaborador(
  input: ColaboradorFormValues
): Promise<ActionResult> {
  const currentAdmin = await requireAdmin();

  // Guarda contra script/sessão comprometida criando usuários em massa —
  // uso normal (admin cadastrando o time) fica bem abaixo disso.
  const { allowed } = checkRateLimit(
    `create-colaborador:${currentAdmin.id}`,
    20,
    60 * 60_000
  );
  if (!allowed) {
    return {
      success: false,
      error: "Muitos colaboradores criados em pouco tempo. Aguarde um pouco.",
    };
  }

  const parsed = colaboradorFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { nome, email, cargo, role, avatar_url } = parsed.data;

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { nome, cargo, role },
  });

  if (error || !data.user) {
    if (error?.code === "email_exists") {
      return { success: false, error: "Já existe um usuário com esse e-mail." };
    }
    console.error("[createColaborador]", error);
    return { success: false, error: error?.message ?? "Não foi possível criar o colaborador." };
  }

  const { error: linkError } = await admin
    .from("profiles")
    .update({ empresa_id: currentAdmin.empresa_id, avatar_url: avatar_url || null })
    .eq("id", data.user.id);

  if (linkError) {
    console.error("[createColaborador] link", linkError);
    return { success: false, error: "Colaborador criado, mas houve um erro ao vinculá-lo à empresa. Contate o suporte." };
  }

  revalidatePath("/colaboradores");
  return { success: true, tempPassword };
}

export async function updateColaborador(
  id: string,
  input: ColaboradorFormValues
): Promise<ActionResult> {
  const currentAdmin = await requireAdmin();

  const parsed = colaboradorFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { nome, email, cargo, role, status, avatar_url } = parsed.data;

  const admin = createAdminClient();

  const { data: currentProfile } = await admin
    .from("profiles")
    .select("email, empresa_id")
    .eq("id", id)
    .single();

  // admin.from() usa a service-role key, que ignora RLS — sem essa checagem
  // explícita, um admin conseguiria editar colaborador de outra empresa.
  if (!currentProfile || currentProfile.empresa_id !== currentAdmin.empresa_id) {
    return { success: false, error: "Colaborador não encontrado." };
  }

  if (currentProfile.email !== email) {
    const { error: authError } = await admin.auth.admin.updateUserById(id, {
      email,
    });
    if (authError) {
      console.error("[updateColaborador] auth", id, authError);
      return { success: false, error: authError.message };
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({
      nome,
      email,
      cargo,
      role,
      status,
      avatar_url: avatar_url || null,
    })
    .eq("id", id);

  if (error) {
    console.error("[updateColaborador]", id, error);
    return { success: false, error: error.message };
  }

  revalidatePath("/colaboradores");
  return { success: true };
}

export async function deleteColaborador(id: string): Promise<ActionResult> {
  const currentAdmin = await requireAdmin();

  if (currentAdmin.id === id) {
    return { success: false, error: "Você não pode excluir seu próprio usuário." };
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("empresa_id")
    .eq("id", id)
    .single();

  // admin.auth.admin.deleteUser() usa a service-role key, que ignora RLS —
  // sem essa checagem explícita, um admin conseguiria excluir colaborador
  // de outra empresa.
  if (!target || target.empresa_id !== currentAdmin.empresa_id) {
    return { success: false, error: "Colaborador não encontrado." };
  }

  const { error } = await admin.auth.admin.deleteUser(id);

  if (error) {
    console.error("[deleteColaborador]", id, error);
    return { success: false, error: error.message };
  }

  revalidatePath("/colaboradores");
  return { success: true };
}

export async function toggleColaboradorStatus(
  id: string,
  status: "ativo" | "inativo"
): Promise<ActionResult> {
  const currentAdmin = await requireAdmin();

  if (currentAdmin.id === id) {
    return { success: false, error: "Você não pode inativar seu próprio usuário." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("[toggleColaboradorStatus]", id, error);
    return { success: false, error: error.message };
  }

  revalidatePath("/colaboradores");
  return { success: true };
}
