import { startOfWeek } from "date-fns";
import { AlertTriangle, CheckCircle2, ListTodo } from "lucide-react";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusDistribution } from "@/components/dashboard/status-distribution";
import {
  ColaboradorDistribution,
  type ColaboradorCount,
} from "@/components/dashboard/colaborador-distribution";
import { STATUS_ORDER, isAtrasada } from "@/lib/demandas";
import type { Demanda, DemandaStatus, Profile } from "@/types/database";


export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: demandasData } = await supabase.from("demandas").select("*");
  const demandas: Demanda[] = demandasData ?? [];

  const emAberto = demandas.filter((d) => d.status !== "concluido").length;
  const atrasadas = demandas.filter((d) => isAtrasada(d.prazo, d.status)).length;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const concluidasSemana = demandas.filter(
    (d) => d.status === "concluido" && new Date(d.updated_at) >= weekStart
  ).length;

  const statusCounts = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = demandas.filter((d) => d.status === status).length;
      return acc;
    },
    {} as Record<DemandaStatus, number>
  );

  let colaboradorCounts: ColaboradorCount[] = [];
  if (profile.role === "admin") {
    const { data: colaboradores } = await supabase
      .from("profiles")
      .select("*")
      .order("nome");

    colaboradorCounts = (colaboradores ?? [])
      .map((c: Profile) => ({
        id: c.id,
        nome: c.nome,
        avatar_url: c.avatar_url,
        total: demandas.filter((d) => d.responsavel_id === c.id).length,
      }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {profile.nome.split(" ")[0] || profile.nome}
        </h1>
        <p className="text-muted-foreground">
          {profile.role === "admin"
            ? "Visão geral das demandas da equipe."
            : "Visão geral das suas demandas."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Demandas em aberto" value={emAberto} icon={ListTodo} />
        <StatCard
          label="Demandas atrasadas"
          value={atrasadas}
          icon={AlertTriangle}
          tone="destructive"
        />
        <StatCard
          label="Concluídas esta semana"
          value={concluidasSemana}
          icon={CheckCircle2}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StatusDistribution counts={statusCounts} />
        {profile.role === "admin" && (
          <ColaboradorDistribution dados={colaboradorCounts} />
        )}
      </div>
    </div>
  );
}
