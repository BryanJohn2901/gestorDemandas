"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";

import { KanbanColumn } from "@/components/demandas/kanban-column";
import { KanbanCardOverlay } from "@/components/demandas/kanban-card";
import { updateDemandaStatus } from "@/app/actions/demandas";
import { STATUS_CONFIG, STATUS_ORDER } from "@/lib/demandas";
import type { DemandaComResponsavel, DemandaStatus } from "@/types/database";

export function KanbanBoard({
  demandas,
}: {
  demandas: DemandaComResponsavel[];
}) {
  const [items, setItems] = useState(demandas);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Sem sortable list (colunas são drop zones separadas, não uma lista
    // única), então o card se move em passos fixos até a coluna mais
    // próxima — não é elegante, mas dá um jeito de mover por teclado.
    useSensor(KeyboardSensor)
  );

  const activeDemanda = items.find((d) => d.id === activeId);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const demandaId = String(active.id);
    const newStatus = over.id as DemandaStatus;
    const current = items.find((d) => d.id === demandaId);
    if (!current || current.status === newStatus) return;

    const previousStatus = current.status;
    setItems((prev) =>
      prev.map((d) => (d.id === demandaId ? { ...d, status: newStatus } : d))
    );

    updateDemandaStatus(demandaId, newStatus).then((result) => {
      if (!result.success) {
        setItems((prev) =>
          prev.map((d) => (d.id === demandaId ? { ...d, status: previousStatus } : d))
        );
        toast.error(result.error);
      }
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            title={STATUS_CONFIG[status].label}
            demandas={items.filter((d) => d.status === status)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDemanda ? <KanbanCardOverlay demanda={activeDemanda} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
