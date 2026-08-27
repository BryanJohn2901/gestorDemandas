import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logEvento } from "@/lib/eventos";
import { NovaDemandaButton } from "@/components/demandas/nova-demanda-button";
import { KanbanBoard } from "@/components/demandas/kanban-board";
import { withResponsavel } from "@/lib/demandas";
import type { ProjetoComCliente } from "@/types/database";


export default async function BoardPage() {
  const profile = await requireProfile();
  await logEvento("view_board");
  const supabase = await createClient();

  const [{ data: demandas }, { data: colaboradores }, { data: projetos }] = await Promise.all([
    supabase.from("demandas").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").order("nome"),
    supabase.from("projetos").select("*, cliente:clientes(id, nome)").order("nome"),
  ]);

  const todosProjetos = (projetos ?? []) as ProjetoComCliente[];
  const demandasComResponsavel = withResponsavel(demandas ?? [], colaboradores ?? [], todosProjetos);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Board</h1>
          <p className="text-muted-foreground">
            Arraste os cartões para mudar o status.
          </p>
        </div>
        {profile.role === "admin" && (
          <NovaDemandaButton colaboradores={colaboradores ?? []} projetos={todosProjetos} />
        )}
      </div>

      <KanbanBoard demandas={demandasComResponsavel} />
    </div>
  );
}
