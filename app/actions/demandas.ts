"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  demandaFormSchema,
  type DemandaFormValues,
} from "@/lib/validations/demanda";
import type { DemandaStatus } from "@/types/database";

type ActionResult =
  | { success: false; error: string }
  | { success: true; id?: string };

export async function createDemanda(
  input: DemandaFormValues
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = demandaFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { titulo, descricao, responsavel_id, status, prioridade, prazo, cliente_projeto } =
    parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("demandas")
    .insert({
      empresa_id: admin.empresa_id!,
      titulo,
      descricao: descricao || null,
      responsavel_id,
      status,
      prioridade,
      prazo: prazo || null,
      cliente_projeto: cliente_projeto || null,
      criado_por: admin.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createDemanda]", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/demandas");
  revalidatePath("/demandas/board");
  revalidatePath("/demandas/minhas");
  revalidatePath("/dashboard");
  return { success: true, id: data.id };
}

export async function updateDemanda(
  id: string,
  input: DemandaFormValues
): Promise<ActionResult> {
  // Edição completa (título, prioridade, prazo, responsável...) é só do admin.
  // Colaborador atualiza status pela updateDemandaStatus abaixo — a UI já
  // esconde esse formulário pra ele, mas a Server Action também precisa
  // recusar, já que uma UI escondida não é controle de acesso de verdade.
  await requireAdmin();

  const parsed = demandaFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();

  const { titulo, descricao, responsavel_id, status, prioridade, prazo, cliente_projeto } =
    parsed.data;

  const { error } = await supabase
    .from("demandas")
    .update({
      titulo,
      descricao: descricao || null,
      responsavel_id,
      status,
      prioridade,
      prazo: prazo || null,
      cliente_projeto: cliente_projeto || null,
    })
    .eq("id", id);

  if (error) {
    console.error("[updateDemanda]", id, error);
    return { success: false, error: error.message };
  }

  revalidatePath("/demandas");
  revalidatePath("/demandas/board");
  revalidatePath("/demandas/minhas");
  revalidatePath(`/demandas/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateDemandaStatus(
  id: string,
  status: DemandaStatus
): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  if (profile.role !== "admin") {
    const { data: existing } = await supabase
      .from("demandas")
      .select("responsavel_id")
      .eq("id", id)
      .single();

    if (!existing || existing.responsavel_id !== profile.id) {
      return { success: false, error: "Você só pode atualizar suas próprias demandas." };
    }
  }

  const { error } = await supabase
    .from("demandas")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("[updateDemandaStatus]", id, error);
    return { success: false, error: error.message };
  }

  revalidatePath("/demandas");
  revalidatePath("/demandas/board");
  revalidatePath("/demandas/minhas");
  revalidatePath(`/demandas/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteDemanda(id: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("demandas").delete().eq("id", id);

  if (error) {
    console.error("[deleteDemanda]", id, error);
    return { success: false, error: error.message };
  }

  revalidatePath("/demandas");
  revalidatePath("/demandas/board");
  revalidatePath("/demandas/minhas");
  revalidatePath("/dashboard");
  return { success: true };
}
