"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logEvento } from "@/lib/eventos";

type ActionResult = { success: false; error: string } | { success: true };

export async function iniciarTempo(demandaId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  // Só um timer aberto por vez, por pessoa — fecha qualquer outro antes de
  // abrir esse (troca de demanda sem precisar pausar manualmente antes).
  const { error: closeError } = await supabase
    .from("registros_tempo")
    .update({ ended_at: new Date().toISOString() })
    .eq("profile_id", profile.id)
    .is("ended_at", null);

  if (closeError) {
    console.error("[iniciarTempo] fechar anterior", closeError);
    return { success: false, error: closeError.message };
  }

  const { error } = await supabase
    .from("registros_tempo")
    .insert({ demanda_id: demandaId, profile_id: profile.id });

  if (error) {
    console.error("[iniciarTempo]", demandaId, error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/demandas/${demandaId}`);
  await logEvento("iniciar_tempo");
  return { success: true };
}

export async function pausarTempo(demandaId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("registros_tempo")
    .update({ ended_at: new Date().toISOString() })
    .eq("demanda_id", demandaId)
    .eq("profile_id", profile.id)
    .is("ended_at", null);

  if (error) {
    console.error("[pausarTempo]", demandaId, error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/demandas/${demandaId}`);
  await logEvento("pausar_tempo");
  return { success: true };
}
