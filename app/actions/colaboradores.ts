"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateTempPassword } from "@/lib/password";
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
  await requireAdmin();

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
    return { success: false, error: error?.message ?? "Não foi possível criar o colaborador." };
  }

  if (avatar_url) {
    await admin
      .from("profiles")
      .update({ avatar_url })
      .eq("id", data.user.id);
  }

  revalidatePath("/colaboradores");
  return { success: true, tempPassword };
}

export async function updateColaborador(
  id: string,
  input: ColaboradorFormValues
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = colaboradorFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { nome, email, cargo, role, status, avatar_url } = parsed.data;

  const admin = createAdminClient();

  const { data: currentProfile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", id)
    .single();

  if (currentProfile && currentProfile.email !== email) {
    const { error: authError } = await admin.auth.admin.updateUserById(id, {
      email,
    });
    if (authError) {
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
  const { error } = await admin.auth.admin.deleteUser(id);

  if (error) {
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
    return { success: false, error: error.message };
  }

  revalidatePath("/colaboradores");
  return { success: true };
}
