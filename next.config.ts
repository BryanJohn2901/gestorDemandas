import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Impede que o site seja carregado dentro de um <iframe> em outro
          // domínio (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          // Impede que o navegador tente "adivinhar" o tipo de um arquivo
          // diferente do Content-Type declarado.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Não vaza a URL completa (com IDs de demandas, por exemplo) para
          // sites de terceiros linkados a partir do app.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Reforça HTTPS em navegadores que já visitaram o site.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Desliga APIs de navegador que este app não usa.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
