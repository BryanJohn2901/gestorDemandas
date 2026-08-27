"use client";

import { useEffect, useState, useTransition } from "react";
import { Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDuracao } from "@/lib/demandas";
import { iniciarTempo, pausarTempo } from "@/app/actions/tempo";

// segundosBase já inclui o tempo de qualquer sessão em andamento até o
// momento em que a página renderizou no servidor — o cliente só soma o
// que passou desde então, contando ao vivo enquanto emAndamento. O
// chamador usa key={`${emAndamento}-${segundosBase}`} pra remontar (e
// reinicializar o useState) a cada start/pause, em vez de sincronizar via
// setState direto no corpo do efeito.
export function DemandaTimer({
  demandaId,
  segundosBase,
  emAndamento,
  podeControlar,
}: {
  demandaId: string;
  segundosBase: number;
  emAndamento: boolean;
  podeControlar: boolean;
}) {
  const [elapsed, setElapsed] = useState(segundosBase);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!emAndamento) return;

    const inicio = Date.now();
    const interval = setInterval(() => {
      setElapsed(segundosBase + Math.floor((Date.now() - inicio) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [segundosBase, emAndamento]);

  function handleClick() {
    startTransition(async () => {
      const acao = emAndamento ? pausarTempo : iniciarTempo;
      const result = await acao(demandaId);
      if (!result.success) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-2xl tabular-nums">{formatDuracao(elapsed)}</span>
      {podeControlar && (
        <Button
          type="button"
          size="sm"
          variant={emAndamento ? "outline" : "default"}
          disabled={isPending}
          onClick={handleClick}
        >
          {emAndamento ? (
            <>
              <Pause className="h-4 w-4" />
              Pausar
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Iniciar
            </>
          )}
        </Button>
      )}
    </div>
  );
}
