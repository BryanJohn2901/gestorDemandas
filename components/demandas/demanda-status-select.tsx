"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_ORDER, STATUS_CONFIG } from "@/lib/demandas";
import { updateDemandaStatus } from "@/app/actions/demandas";
import type { DemandaStatus } from "@/types/database";

export function DemandaStatusSelect({
  demandaId,
  status,
}: {
  demandaId: string;
  status: DemandaStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(async () => {
      const result = await updateDemandaStatus(demandaId, value as DemandaStatus);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Status atualizado.");
      router.refresh();
    });
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_CONFIG[s].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
