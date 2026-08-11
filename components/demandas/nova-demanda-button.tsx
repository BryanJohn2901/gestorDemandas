"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DemandaFormDialog } from "@/components/demandas/demanda-form-dialog";
import type { Profile } from "@/types/database";

export function NovaDemandaButton({
  colaboradores,
}: {
  colaboradores: Pick<Profile, "id" | "nome" | "status">[];
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
        onSaved={(id) => router.push(`/demandas/${id}`)}
      />
    </>
  );
}
