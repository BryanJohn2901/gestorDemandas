import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NovaDemandaButton } from "@/components/demandas/nova-demanda-button";
import { DemandasTable } from "@/components/demandas/demandas-table";
import { withResponsavel } from "@/lib/demandas";

export default async function DemandasPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: demandas }, { data: colaboradores }] = await Promise.all([
    supabase.from("demandas").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").order("nome"),
  ]);

  const demandasComResponsavel = withResponsavel(demandas ?? [], colaboradores ?? []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Demandas</h1>
          <p className="text-muted-foreground">
            {profile.role === "admin"
              ? "Todas as demandas da equipe."
              : "Demandas atribuídas a você."}
          </p>
        </div>
        {profile.role === "admin" && (
          <NovaDemandaButton colaboradores={colaboradores ?? []} />
        )}
      </div>

      <DemandasTable demandas={demandasComResponsavel} colaboradores={colaboradores ?? []} />
    </div>
  );
}
