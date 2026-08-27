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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmpresaRenameDialog } from "@/components/empresas/empresa-rename-dialog";
import {
  deleteEmpresa,
  enterAsAdmin,
  toggleEmpresaStatus,
} from "@/app/actions/empresas";
import type { Empresa } from "@/types/database";

export function EmpresaRowActions({
  empresa,
  temAdmin,
}: {
  empresa: Empresa;
  temAdmin: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [enterOpen, setEnterOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteEmpresa(empresa.id);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("Empresa excluída.");
        setDeleteOpen(false);
      }
    });
  }

  function handleEnter() {
    startTransition(async () => {
      // Em caso de sucesso, enterAsAdmin() redireciona (não retorna) —
      // só chega aqui de volta se deu erro.
      const result = await enterAsAdmin(empresa.id);
      if (result && !result.success) {
        toast.error(result.error);
        setEnterOpen(false);
      }
    });
  }

  function handleToggleStatus() {
    const nextStatus = empresa.status === "ativo" ? "inativo" : "ativo";
    startTransition(async () => {
      const result = await toggleEmpresaStatus(empresa.id, nextStatus);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success(nextStatus === "ativo" ? "Empresa ativada." : "Empresa inativada.");
      }
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
            disabled={!temAdmin}
            onSelect={(e) => {
              e.preventDefault();
              setEnterOpen(true);
            }}
          >
            Entrar como admin
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setEditOpen(true);
            }}
          >
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isPending} onSelect={handleToggleStatus}>
            {empresa.status === "ativo" ? "Inativar" : "Ativar"}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              setConfirmText("");
              setDeleteOpen(true);
            }}
          >
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EmpresaRenameDialog empresa={empresa} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={enterOpen} onOpenChange={setEnterOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Entrar como admin de {empresa.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              Você vai sair da sua sessão master e passar a usar a conta do
              administrador dessa empresa. Pra voltar a ser master, faça
              login de novo com seu e-mail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                handleEnter();
              }}
            >
              Entrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {empresa.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso apaga <strong>permanentemente</strong> todos os colaboradores,
              demandas e acessos dessa empresa. Não pode ser desfeito.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="confirm-nome">
              Digite <strong>{empresa.nome}</strong> pra confirmar
            </Label>
            <Input
              id="confirm-nome"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending || confirmText !== empresa.nome}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
