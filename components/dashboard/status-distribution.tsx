import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_CONFIG, STATUS_ORDER } from "@/lib/demandas";
import type { DemandaStatus } from "@/types/database";

export function StatusDistribution({
  counts,
}: {
  counts: Record<DemandaStatus, number>;
}) {
  const total = STATUS_ORDER.reduce((sum, s) => sum + counts[s], 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição por status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {total === 0 && (
          <p className="text-sm text-muted-foreground">Sem demandas ainda.</p>
        )}
        {STATUS_ORDER.map((status) => {
          const count = counts[status];
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={status} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{STATUS_CONFIG[status].label}</span>
                <span className="tabular-nums text-muted-foreground">{count}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${STATUS_CONFIG[status].barClassName}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
