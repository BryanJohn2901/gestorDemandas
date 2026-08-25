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
import { EmpresaRenameDialog } from "@/components/empresas/empresa-rename-dialog";
import { toggleEmpresaStatus } from "@/app/actions/empresas";
import type { Empresa } from "@/types/database";

export function EmpresaRowActions({ empresa }: { empresa: Empresa }) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

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
        </DropdownMenuContent>
      </DropdownMenu>

      <EmpresaRenameDialog empresa={empresa} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
