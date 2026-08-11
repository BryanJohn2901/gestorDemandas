import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG } from "@/lib/demandas";
import type { DemandaStatus } from "@/types/database";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: DemandaStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("border-transparent", config.badgeClassName)}>
      {config.label}
    </Badge>
  );
}
