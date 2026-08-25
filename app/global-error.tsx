"use client";

import { useEffect } from "react";

// Só dispara se o próprio Root Layout quebrar (fora do alcance de
// app/error.tsx). Precisa dos próprios <html>/<body> e não pode depender de
// providers/CSS do layout, já que é o layout que pode ter falhado.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0a0a0a",
          color: "#fafafa",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Algo deu errado</h1>
          <p style={{ color: "#a1a1aa" }}>
            Ocorreu um erro inesperado ao carregar a aplicação.
          </p>
        </div>
        <button
          onClick={() => reset()}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid #27272a",
            background: "#fafafa",
            color: "#0a0a0a",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
