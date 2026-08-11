"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PrioridadeBadge } from "@/components/demandas/prioridade-badge";
import { isAtrasada } from "@/lib/demandas";
import { cn } from "@/lib/utils";
import type { DemandaComResponsavel } from "@/types/database";

function initials(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function CardContent({ demanda }: { demanda: DemandaComResponsavel }) {
  const atrasada = isAtrasada(demanda.prazo, demanda.status);

  return (
    <>
      <Link
        href={`/demandas/${demanda.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block text-sm font-medium hover:underline"
      >
        {demanda.titulo}
      </Link>

      {demanda.cliente_projeto && (
        <div className="text-xs text-muted-foreground">{demanda.cliente_projeto}</div>
      )}

      <div className="flex items-center justify-between">
        <PrioridadeBadge prioridade={demanda.prioridade} />
        {demanda.responsavel && (
          <Avatar className="h-6 w-6">
            <AvatarImage
              src={demanda.responsavel.avatar_url ?? undefined}
              alt={demanda.responsavel.nome}
            />
            <AvatarFallback className="text-[10px]">
              {initials(demanda.responsavel.nome) || "?"}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {demanda.prazo && (
        <div
          className={cn(
            "text-xs",
            atrasada ? "font-medium text-destructive" : "text-muted-foreground"
          )}
        >
          {format(new Date(`${demanda.prazo}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })}
        </div>
      )}
    </>
  );
}

export function KanbanCard({ demanda }: { demanda: DemandaComResponsavel }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: demanda.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab space-y-2 rounded-md border bg-background p-3 shadow-sm active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <CardContent demanda={demanda} />
    </div>
  );
}

// Cópia estática usada dentro do DragOverlay — sem hook de drag próprio,
// evita registrar dois draggables com o mesmo id enquanto arrasta.
export function KanbanCardOverlay({ demanda }: { demanda: DemandaComResponsavel }) {
  return (
    <div className="cursor-grabbing space-y-2 rounded-md border bg-background p-3 shadow-lg">
      <CardContent demanda={demanda} />
    </div>
  );
}
