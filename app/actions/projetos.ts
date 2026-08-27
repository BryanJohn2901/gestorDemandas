"use server";

import { revalidatePath } from "next/cache";
import { requireAdminOrGestor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logEvento } from "@/lib/eventos";
import {
  projetoFormSchema,
  type ProjetoFormValues,
} from "@/lib/validations/projeto";

type ActionResult =
  | { success: false; error: string }
  | { success: true; id?: string };

export async function createProjeto(
  input: ProjetoFormValues
): Promise<ActionResult> {
  const admin = await requireAdminOrGestor();

  const parsed = projetoFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projetos")
    .insert({
      empresa_id: admin.empresa_id!,
      cliente_id: parsed.data.cliente_id,
      nome: parsed.data.nome,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createProjeto]", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/clientes");
  await logEvento("create_projeto");
  return { success: true, id: data.id };
}

export async function updateProjeto(
  id: string,
  input: ProjetoFormValues
): Promise<ActionResult> {
  await requireAdminOrGestor();

  const parsed = projetoFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("projetos")
    .update({ nome: parsed.data.nome, cliente_id: parsed.data.cliente_id })
    .eq("id", id);

  if (error) {
    console.error("[updateProjeto]", id, error);
    return { success: false, error: error.message };
  }

  revalidatePath("/clientes");
  return { success: true };
}

export async function deleteProjeto(id: string): Promise<ActionResult> {
  await requireAdminOrGestor();

  const supabase = await createClient();
  const { error } = await supabase.from("projetos").delete().eq("id", id);

  if (error) {
    console.error("[deleteProjeto]", id, error);
    return { success: false, error: error.message };
  }

  revalidatePath("/clientes");
  revalidatePath("/demandas");
  revalidatePath("/demandas/board");
  return { success: true };
}
