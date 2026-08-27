import { createClient } from "@/lib/supabase/server";

// Fire-and-forget: log de uso não pode nunca quebrar a ação de verdade que
// o usuário estava tentando fazer. Falha aqui só vira console.error.
export async function logEvento(acao: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("log_evento", { p_acao: acao });
    if (error) {
      console.error("[logEvento]", acao, error);
    }
  } catch (error) {
    console.error("[logEvento]", acao, error);
  }
}
