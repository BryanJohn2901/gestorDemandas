"use client";

import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { KanbanCard } from "@/components/demandas/kanban-card";
import { cn } from "@/lib/utils";
import type { DemandaComResponsavel, DemandaStatus } from "@/types/database";

export function KanbanColumn({
  status,
  title,
  demandas,
}: {
  status: DemandaStatus;
  title: string;
  demandas: DemandaComResponsavel[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/40">
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="text-sm font-medium">{title}</span>
        <Badge variant="secondary">{demandas.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2 px-2 pb-2 min-h-24 rounded-b-lg transition-colors",
          isOver && "bg-accent"
        )}
      >
        {demandas.map((demanda) => (
          <KanbanCard key={demanda.id} demanda={demanda} />
        ))}
        {demandas.length === 0 && (
          <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            Nenhuma demanda
          </div>
        )}
      </div>
    </div>
  );
}
