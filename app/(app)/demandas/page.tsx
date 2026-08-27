import { canManage, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NovaDemandaButton } from "@/components/demandas/nova-demanda-button";
import { DemandasTable } from "@/components/demandas/demandas-table";
import { withResponsavel } from "@/lib/demandas";
import type { ProjetoComCliente } from "@/types/database";


export default async function DemandasPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: demandas }, { data: colaboradores }, { data: projetos }] = await Promise.all([
    supabase.from("demandas").select("*").order("created_at", { ascending: false }),
    // Conta cliente nunca é responsável de demanda — não oferecer como opção.
    supabase.from("profiles").select("*").neq("role", "cliente").order("nome"),
    supabase.from("projetos").select("*, cliente:clientes(id, nome)").order("nome"),
  ]);

  const todosProjetos = (projetos ?? []) as ProjetoComCliente[];
  const demandasComResponsavel = withResponsavel(demandas ?? [], colaboradores ?? [], todosProjetos);
  const podeGerenciar = canManage(profile.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Demandas</h1>
          <p className="text-muted-foreground">
            {podeGerenciar
              ? "Todas as demandas da equipe."
              : profile.role === "cliente"
                ? "Demandas do seu projeto."
                : "Demandas atribuídas a você."}
          </p>
        </div>
        {podeGerenciar && (
          <NovaDemandaButton colaboradores={colaboradores ?? []} projetos={todosProjetos} />
        )}
      </div>

      <DemandasTable
        demandas={demandasComResponsavel}
        colaboradores={colaboradores ?? []}
        isAdmin={podeGerenciar}
      />
    </div>
  );
}
