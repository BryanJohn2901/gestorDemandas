import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function initials(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export type ColaboradorCount = {
  id: string;
  nome: string;
  avatar_url: string | null;
  total: number;
};

export function ColaboradorDistribution({ dados }: { dados: ColaboradorCount[] }) {
  const max = Math.max(1, ...dados.map((d) => d.total));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição por colaborador</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dados.length === 0 && (
          <p className="text-sm text-muted-foreground">Sem demandas atribuídas ainda.</p>
        )}
        {dados.map((c) => (
          <div key={c.id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={c.avatar_url ?? undefined} alt={c.nome} />
                  <AvatarFallback className="text-[10px]">
                    {initials(c.nome) || "?"}
                  </AvatarFallback>
                </Avatar>
                <span>{c.nome}</span>
              </div>
              <span className="tabular-nums text-muted-foreground">{c.total}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${(c.total / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
