"use server";

import { revalidatePath } from "next/cache";
import { requireMaster } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateTempPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  empresaFormSchema,
  empresaRenameSchema,
  type EmpresaFormValues,
  type EmpresaRenameValues,
} from "@/lib/validations/empresa";

type ActionResult =
  | { success: false; error: string }
  | { success: true; tempPassword?: string };

export async function createEmpresa(
  input: EmpresaFormValues
): Promise<ActionResult> {
  const master = await requireMaster();

  // Guarda contra script/sessão comprometida criando empresas em massa.
  const { allowed } = checkRateLimit(`create-empresa:${master.id}`, 20, 60 * 60_000);
  if (!allowed) {
    return {
      success: false,
      error: "Muitas empresas criadas em pouco tempo. Aguarde um pouco.",
    };
  }

  const parsed = empresaFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { nome, adminNome, adminEmail, adminCargo } = parsed.data;

  const supabase = await createClient();
  const { data: empresa, error: empresaError } = await supabase
    .from("empresas")
    .insert({ nome })
    .select("id")
    .single();

  if (empresaError || !empresa) {
    console.error("[createEmpresa]", empresaError);
    return { success: false, error: empresaError?.message ?? "Não foi possível criar a empresa." };
  }

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data, error } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: tempPassword,
    email_confirm: true,
    // empresa_id precisa ir junto aqui, não num update depois — o trigger
    // handle_new_user() insere o profile na hora do createUser, e a
    // constraint profiles_empresa_id_by_role checa nesse exato insert.
    user_metadata: { nome: adminNome, cargo: adminCargo, role: "admin", empresa_id: empresa.id },
  });

  if (error || !data.user) {
    // Empresa já foi criada — remove pra não ficar órfã sem admin.
    await supabase.from("empresas").delete().eq("id", empresa.id);

    if (error?.code === "email_exists") {
      return { success: false, error: "Já existe um usuário com esse e-mail." };
    }
    console.error("[createEmpresa] admin", error);
    return { success: false, error: error?.message ?? "Não foi possível criar o administrador." };
  }

  revalidatePath("/master");
  return { success: true, tempPassword };
}

export async function updateEmpresa(
  id: string,
  input: EmpresaRenameValues
): Promise<ActionResult> {
  await requireMaster();

  const parsed = empresaRenameSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("empresas")
    .update({ nome: parsed.data.nome })
    .eq("id", id);

  if (error) {
    console.error("[updateEmpresa]", id, error);
    return { success: false, error: error.message };
  }

  revalidatePath("/master");
  return { success: true };
}

export async function deleteEmpresa(id: string): Promise<ActionResult> {
  await requireMaster();

  const admin = createAdminClient();

  // Apaga primeiro os usuários no Auth (cada admin/colaborador da empresa)
  // — se apagássemos só a linha de `empresas`, o cascade no banco remove os
  // profiles, mas o login em auth.users ficaria órfão pra sempre (sem
  // profile, mas existindo e ocupando conta). demandas/comentarios são
  // removidos pelo cascade de empresa_id ao final.
  const { data: membros, error: membrosError } = await admin
    .from("profiles")
    .select("id")
    .eq("empresa_id", id);

  if (membrosError) {
    console.error("[deleteEmpresa] listar membros", id, membrosError);
    return { success: false, error: membrosError.message };
  }

  for (const membro of membros ?? []) {
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(membro.id);
    if (deleteUserError) {
      console.error("[deleteEmpresa] excluir usuário", membro.id, deleteUserError);
      return {
        success: false,
        error: `Falha ao excluir um usuário da empresa (${deleteUserError.message}). Nada foi apagado ainda — tente de novo.`,
      };
    }
  }

  const { error } = await admin.from("empresas").delete().eq("id", id);

  if (error) {
    console.error("[deleteEmpresa]", id, error);
    return { success: false, error: error.message };
  }

  revalidatePath("/master");
  return { success: true };
}

export async function toggleEmpresaStatus(
  id: string,
  status: "ativo" | "inativo"
): Promise<ActionResult> {
  await requireMaster();

  const supabase = await createClient();
  const { error } = await supabase
    .from("empresas")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("[toggleEmpresaStatus]", id, error);
    return { success: false, error: error.message };
  }

  revalidatePath("/master");
  return { success: true };
}
