"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Asaas avisa explicitamente: não marcar como pago só pelo redirect de
// sucesso — o webhook pode chegar depois do navegador voltar do checkout.
// Reconsulta o status a cada poucos segundos até a página server virar
// o formulário (quando o webhook atualizar pre_cadastros pra 'pago').
export function AguardandoPagamento() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Aguardando confirmação do pagamento. Isso pode levar alguns
        segundos — não feche esta página.
      </p>
    </div>
  );
}
