"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DemandaFormDialog } from "@/components/demandas/demanda-form-dialog";
import { deleteDemanda } from "@/app/actions/demandas";
import type { Demanda, Profile, ProjetoComCliente } from "@/types/database";

export function DemandaDetailActions({
  demanda,
  colaboradores,
  projetos,
}: {
  demanda: Demanda;
  colaboradores: Pick<Profile, "id" | "nome" | "status">[];
  projetos: ProjetoComCliente[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteDemanda(demanda.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Demanda excluída.");
      router.push("/demandas");
    });
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil className="h-4 w-4" />
        Editar
      </Button>
      <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
        <Trash2 className="h-4 w-4" />
        Excluir
      </Button>

      <DemandaFormDialog
        mode="edit"
        demanda={demanda}
        open={editOpen}
        onOpenChange={setEditOpen}
        colaboradores={colaboradores}
        projetos={projetos}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir demanda?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove <strong>{demanda.titulo}</strong> permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
