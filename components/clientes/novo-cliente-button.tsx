"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClienteFormDialog } from "@/components/clientes/cliente-form-dialog";

export function NovoClienteButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Novo cliente
      </Button>
      <ClienteFormDialog mode="create" open={open} onOpenChange={setOpen} />
    </>
  );
}
