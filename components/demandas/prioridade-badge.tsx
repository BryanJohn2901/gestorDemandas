import { Badge } from "@/components/ui/badge";
import { PRIORIDADE_CONFIG } from "@/lib/demandas";
import type { DemandaPrioridade } from "@/types/database";
import { cn } from "@/lib/utils";

export function PrioridadeBadge({ prioridade }: { prioridade: DemandaPrioridade }) {
  const config = PRIORIDADE_CONFIG[prioridade];
  return (
    <Badge variant="outline" className={cn("border-transparent", config.badgeClassName)}>
      {config.label}
    </Badge>
  );
}
