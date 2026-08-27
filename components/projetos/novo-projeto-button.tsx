"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjetoFormDialog } from "@/components/projetos/projeto-form-dialog";
import type { Cliente } from "@/types/database";

export function NovoProjetoButton({ clientes }: { clientes: Cliente[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={clientes.length === 0}>
        <Plus className="h-4 w-4" />
        Novo projeto
      </Button>
      <ProjetoFormDialog mode="create" open={open} onOpenChange={setOpen} clientes={clientes} />
    </>
  );
}
