"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmpresaFormDialog } from "@/components/empresas/empresa-form-dialog";

export function NovaEmpresaButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nova empresa
      </Button>
      <EmpresaFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
