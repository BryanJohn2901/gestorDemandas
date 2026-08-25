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
    user_metadata: { nome: adminNome, cargo: adminCargo, role: "admin" },
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

  const { error: linkError } = await admin
    .from("profiles")
    .update({ empresa_id: empresa.id })
    .eq("id", data.user.id);

  if (linkError) {
    console.error("[createEmpresa] link", linkError);
    return { success: false, error: "Empresa e admin criados, mas houve um erro ao vinculá-los. Contate o suporte." };
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
