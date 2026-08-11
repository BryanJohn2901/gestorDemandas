"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColaboradorFormDialog } from "@/components/colaboradores/colaborador-form-dialog";

export function NovoColaboradorButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Novo colaborador
      </Button>
      <ColaboradorFormDialog mode="create" open={open} onOpenChange={setOpen} />
    </>
  );
}
