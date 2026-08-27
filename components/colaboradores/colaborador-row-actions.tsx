"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  ColaboradorFormDialog,
  type ColaboradorProfile,
} from "@/components/colaboradores/colaborador-form-dialog";
import {
  deleteColaborador,
  toggleColaboradorStatus,
} from "@/app/actions/colaboradores";
import type { Cliente } from "@/types/database";

export function ColaboradorRowActions({
  colaborador,
  clientes,
}: {
  colaborador: ColaboradorProfile;
  clientes: Pick<Cliente, "id" | "nome">[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleToggleStatus() {
    const nextStatus = colaborador.status === "ativo" ? "inativo" : "ativo";
    startTransition(async () => {
      const result = await toggleColaboradorStatus(colaborador.id, nextStatus);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success(
          nextStatus === "ativo" ? "Conta ativada." : "Conta inativada."
        );
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteColaborador(colaborador.id);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("Conta excluída.");
      }
      setDeleteOpen(false);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Mais ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setEditOpen(true);
            }}
          >
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isPending} onSelect={handleToggleStatus}>
            {colaborador.status === "ativo" ? "Inativar" : "Ativar"}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              setDeleteOpen(true);
            }}
          >
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ColaboradorFormDialog
        mode="edit"
        colaborador={colaborador}
        open={editOpen}
        onOpenChange={setEditOpen}
        clientes={clientes}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove o acesso de <strong>{colaborador.nome}</strong> e não
              pode ser desfeito. As demandas atribuídas a ele (se houver)
              ficarão sem responsável.
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
    </>
  );
}
