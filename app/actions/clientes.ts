"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logEvento } from "@/lib/eventos";
import {
  clienteFormSchema,
  type ClienteFormValues,
} from "@/lib/validations/cliente";

type ActionResult =
  | { success: false; error: string }
  | { success: true; id?: string };

export async function createCliente(
  input: ClienteFormValues
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = clienteFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .insert({ empresa_id: admin.empresa_id!, nome: parsed.data.nome })
    .select("id")
    .single();

  if (error) {
    console.error("[createCliente]", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/clientes");
  await logEvento("create_cliente");
  return { success: true, id: data.id };
}

export async function updateCliente(
  id: string,
  input: ClienteFormValues
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = clienteFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clientes")
    .update({ nome: parsed.data.nome })
    .eq("id", id);

  if (error) {
    console.error("[updateCliente]", id, error);
    return { success: false, error: error.message };
  }

  revalidatePath("/clientes");
  return { success: true };
}

export async function deleteCliente(id: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("clientes").delete().eq("id", id);

  if (error) {
    console.error("[deleteCliente]", id, error);
    return { success: false, error: error.message };
  }

  revalidatePath("/clientes");
  revalidatePath("/demandas");
  revalidatePath("/demandas/board");
  return { success: true };
}
