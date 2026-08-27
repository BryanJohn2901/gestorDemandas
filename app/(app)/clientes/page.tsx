import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NovoClienteButton } from "@/components/clientes/novo-cliente-button";
import { ClienteRowActions } from "@/components/clientes/cliente-row-actions";
import { NovoProjetoButton } from "@/components/projetos/novo-projeto-button";
import { ProjetoRowActions } from "@/components/projetos/projeto-row-actions";
import type { ProjetoComCliente } from "@/types/database";

export default async function ClientesPage() {
  await requireAdmin();

  const supabase = await createClient();
  const [{ data: clientes }, { data: projetos }] = await Promise.all([
    supabase.from("clientes").select("*").order("nome"),
    supabase
      .from("projetos")
      .select("*, cliente:clientes(id, nome)")
      .order("nome"),
  ]);

  const todosClientes = clientes ?? [];
  const todosProjetos = (projetos ?? []) as ProjetoComCliente[];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes e projetos</h1>
          <p className="text-muted-foreground">
            Cadastre clientes e os projetos de cada um. Ao criar uma demanda,
            você escolhe o projeto — isso é o que permite filtrar tudo que um
            cliente precisa.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Clientes</h2>
          <NovoClienteButton />
        </div>
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Projetos</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {todosClientes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                    Nenhum cliente cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {todosClientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-medium">{cliente.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {todosProjetos.filter((p) => p.cliente_id === cliente.id).length}
                  </TableCell>
                  <TableCell>
                    <ClienteRowActions cliente={cliente} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Projetos</h2>
          <NovoProjetoButton clientes={todosClientes} />
        </div>
        {todosClientes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Cadastre um cliente primeiro para poder criar projetos.
          </p>
        )}
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {todosProjetos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                    Nenhum projeto cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {todosProjetos.map((projeto) => (
                <TableRow key={projeto.id}>
                  <TableCell className="font-medium">{projeto.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {projeto.cliente?.nome ?? "—"}
                  </TableCell>
                  <TableCell>
                    <ProjetoRowActions projeto={projeto} clientes={todosClientes} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
