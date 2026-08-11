import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { PrioridadeBadge } from "@/components/demandas/prioridade-badge";
import { DemandaStatusSelect } from "@/components/demandas/demanda-status-select";
import { STATUS_CONFIG, STATUS_ORDER, isAtrasada } from "@/lib/demandas";
import { cn } from "@/lib/utils";
import type { Demanda } from "@/types/database";

export default async function MinhasTarefasPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: demandas } = await supabase
    .from("demandas")
    .select("*")
    .eq("responsavel_id", profile.id)
    .order("prazo", { ascending: true, nullsFirst: false });

  const grupos = STATUS_ORDER.map((status) => ({
    status,
    demandas: (demandas ?? []).filter((d: Demanda) => d.status === status),
  })).filter((g) => g.demandas.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minhas tarefas</h1>
        <p className="text-muted-foreground">
          Demandas atribuídas a você, {profile.nome.split(" ")[0]}.
        </p>
      </div>

      {grupos.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhuma demanda atribuída a você no momento.
          </CardContent>
        </Card>
      )}

      {grupos.map((grupo) => (
        <div key={grupo.status} className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {STATUS_CONFIG[grupo.status].label} · {grupo.demandas.length}
          </h2>
          <div className="rounded-lg border bg-background divide-y">
            {grupo.demandas.map((demanda: Demanda) => {
              const atrasada = isAtrasada(demanda.prazo, demanda.status);
              return (
                <div
                  key={demanda.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <Link
                      href={`/demandas/${demanda.id}`}
                      className="font-medium hover:underline"
                    >
                      {demanda.titulo}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                      <PrioridadeBadge prioridade={demanda.prioridade} />
                      {demanda.cliente_projeto && (
                        <span className="text-xs text-muted-foreground">
                          {demanda.cliente_projeto}
                        </span>
                      )}
                      {demanda.prazo && (
                        <span
                          className={cn(
                            "text-xs",
                            atrasada
                              ? "font-medium text-destructive"
                              : "text-muted-foreground"
                          )}
                        >
                          Prazo: {format(new Date(`${demanda.prazo}T00:00:00`), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <DemandaStatusSelect demandaId={demanda.id} status={demanda.status} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
