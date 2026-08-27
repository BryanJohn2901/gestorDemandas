"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DemandaFormDialog } from "@/components/demandas/demanda-form-dialog";
import type { Profile, ProjetoComCliente } from "@/types/database";

export function NovaDemandaButton({
  colaboradores,
  projetos,
}: {
  colaboradores: Pick<Profile, "id" | "nome" | "status">[];
  projetos: ProjetoComCliente[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nova demanda
      </Button>
      <DemandaFormDialog
        mode="create"
        open={open}
        onOpenChange={setOpen}
        colaboradores={colaboradores}
        projetos={projetos}
        onSaved={(id) => router.push(`/demandas/${id}`)}
      />
    </>
  );
}
