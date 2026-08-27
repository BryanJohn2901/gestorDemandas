import { requireMaster } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NovaEmpresaButton } from "@/components/empresas/nova-empresa-button";
import { EmpresaRowActions } from "@/components/empresas/empresa-row-actions";

export default async function MasterPage() {
  await requireMaster();

  const supabase = await createClient();
  const { data: empresas } = await supabase
    .from("empresas")
    .select("*")
    .order("created_at");

  // Master não tem acesso via RLS a `profiles` fora da própria linha (de
  // propósito — ver profiles_select em supabase/schema.sql), então nome do
  // admin e contagem de colaboradores vêm de uma leitura agregada com a
  // service-role key, só com os campos necessários pra essa tela.
  const admin = createAdminClient();
  const { data: perfis } = await admin
    .from("profiles")
    .select("empresa_id, nome, email, role")
    .not("empresa_id", "is", null);

  const porEmpresa = new Map<
    string,
    { adminNome: string | null; adminEmail: string | null; total: number }
  >();
  for (const perfil of perfis ?? []) {
    if (!perfil.empresa_id) continue;
    const atual = porEmpresa.get(perfil.empresa_id) ?? {
      adminNome: null,
      adminEmail: null,
      total: 0,
    };
    atual.total += 1;
    if (perfil.role === "admin" && !atual.adminNome) {
      atual.adminNome = perfil.nome;
      atual.adminEmail = perfil.email;
    }
    porEmpresa.set(perfil.empresa_id, atual);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
          <p className="text-muted-foreground">
            Gerencie as empresas cadastradas na plataforma.
          </p>
        </div>
        <NovaEmpresaButton />
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Administrador</TableHead>
              <TableHead>Usuários</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(empresas ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nenhuma empresa cadastrada.
                </TableCell>
              </TableRow>
            )}
            {(empresas ?? []).map((empresa) => {
              const info = porEmpresa.get(empresa.id);
              return (
                <TableRow key={empresa.id}>
                  <TableCell className="font-medium">{empresa.nome}</TableCell>
                  <TableCell>
                    {info?.adminNome ? (
                      <div>
                        <div>{info.adminNome}</div>
                        <div className="text-sm text-muted-foreground">
                          {info.adminEmail}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sem admin</span>
                    )}
                  </TableCell>
                  <TableCell>{info?.total ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={empresa.status === "ativo" ? "secondary" : "outline"}>
                      {empresa.status === "ativo" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <EmpresaRowActions
                      empresa={empresa}
                      temAdmin={Boolean(info?.adminNome)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
