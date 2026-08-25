import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NovoColaboradorButton } from "@/components/colaboradores/novo-colaborador-button";
import { ColaboradorRowActions } from "@/components/colaboradores/colaborador-row-actions";
import { ColaboradoresFilters } from "@/components/colaboradores/colaboradores-filters";
import type { ColaboradorProfile } from "@/components/colaboradores/colaborador-form-dialog";
import type { Profile } from "@/types/database";


type ColaboradoresPageProps = {
  searchParams: Promise<{ q?: string; cargo?: string; status?: string }>;
};

function initials(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function ColaboradoresPage({
  searchParams,
}: ColaboradoresPageProps) {
  await requireAdmin();
  const params = await searchParams;

  const supabase = await createClient();
  const { data: colaboradores } = await supabase
    .from("profiles")
    .select("*")
    .order("nome");

  const all = colaboradores ?? [];
  const cargos = Array.from(
    new Set(all.map((c) => c.cargo).filter((c): c is string => Boolean(c)))
  ).sort();

  const q = (params.q ?? "").trim().toLowerCase();
  const filtered = all.filter((c: Profile) => {
    if (q && !`${c.nome} ${c.email}`.toLowerCase().includes(q)) return false;
    if (params.cargo && c.cargo !== params.cargo) return false;
    if (params.status && c.status !== params.status) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Colaboradores
          </h1>
          <p className="text-muted-foreground">
            Cadastre e gerencie o acesso da equipe.
          </p>
        </div>
        <NovoColaboradorButton />
      </div>

      <ColaboradoresFilters cargos={cargos} />

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo/área</TableHead>
              <TableHead>Permissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  Nenhum colaborador encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((colaborador: Profile) => (
              <TableRow key={colaborador.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={colaborador.avatar_url ?? undefined}
                        alt={colaborador.nome}
                      />
                      <AvatarFallback>
                        {initials(colaborador.nome) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{colaborador.nome}</div>
                      <div className="text-sm text-muted-foreground">
                        {colaborador.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{colaborador.cargo || "—"}</TableCell>
                <TableCell>
                  <Badge variant={colaborador.role === "admin" ? "default" : "secondary"}>
                    {colaborador.role === "admin" ? "Admin" : "Colaborador"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={colaborador.status === "ativo" ? "secondary" : "outline"}
                  >
                    {colaborador.status === "ativo" ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ColaboradorRowActions
                    colaborador={colaborador as ColaboradorProfile}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
