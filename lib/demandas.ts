import type {
  Demanda,
  DemandaComResponsavel,
  DemandaPrioridade,
  DemandaStatus,
  Profile,
} from "@/types/database";

export const STATUS_CONFIG: Record<
  DemandaStatus,
  { label: string; badgeClassName: string; barClassName: string }
> = {
  a_fazer: {
    label: "A fazer",
    badgeClassName: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    barClassName: "bg-slate-400 dark:bg-slate-500",
  },
  em_andamento: {
    label: "Em andamento",
    badgeClassName: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    barClassName: "bg-blue-500",
  },
  em_revisao: {
    label: "Em revisão",
    badgeClassName:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    barClassName: "bg-amber-500",
  },
  concluido: {
    label: "Concluído",
    badgeClassName:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    barClassName: "bg-emerald-500",
  },
};

export const STATUS_ORDER: DemandaStatus[] = [
  "a_fazer",
  "em_andamento",
  "em_revisao",
  "concluido",
];

export const PRIORIDADE_CONFIG: Record<
  DemandaPrioridade,
  { label: string; badgeClassName: string }
> = {
  baixa: {
    label: "Baixa",
    badgeClassName: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
  media: {
    label: "Média",
    badgeClassName: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  alta: {
    label: "Alta",
    badgeClassName:
      "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
  urgente: {
    label: "Urgente",
    badgeClassName: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
};

export function isAtrasada(prazo: string | null, status: DemandaStatus) {
  if (!prazo || status === "concluido") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${prazo}T00:00:00`) < today;
}

export function withResponsavel(
  demandas: Demanda[],
  profiles: Pick<Profile, "id" | "nome" | "avatar_url">[]
): DemandaComResponsavel[] {
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return demandas.map((d) => ({
    ...d,
    responsavel: d.responsavel_id ? (byId.get(d.responsavel_id) ?? null) : null,
  }));
}
