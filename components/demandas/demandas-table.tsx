"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/demandas/status-badge";
import { PrioridadeBadge } from "@/components/demandas/prioridade-badge";
import { STATUS_CONFIG, STATUS_ORDER, PRIORIDADE_CONFIG, isAtrasada } from "@/lib/demandas";
import { cn } from "@/lib/utils";
import type { DemandaComResponsavel, DemandaPrioridade, Profile } from "@/types/database";

type SortColumn = "titulo" | "responsavel" | "projeto" | "status" | "prioridade" | "prazo";
type SortDirection = "asc" | "desc";

function initials(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function SortIcon({
  column,
  sortColumn,
  sortDirection,
}: {
  column: SortColumn;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
}) {
  if (sortColumn !== column) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
  return sortDirection === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5" />
  );
}

export function DemandasTable({
  demandas,
  colaboradores,
  isAdmin,
}: {
  demandas: DemandaComResponsavel[];
  colaboradores: Pick<Profile, "id" | "nome" | "status">[];
  isAdmin: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [prioridadeFilter, setPrioridadeFilter] = useState("todas");
  const [responsavelFilter, setResponsavelFilter] = useState("todos");
  const [clienteFilter, setClienteFilter] = useState("todos");
  const [atrasadasOnly, setAtrasadasOnly] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>("prazo");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const clientes = useMemo(() => {
    const byId = new Map<string, string>();
    for (const d of demandas) {
      if (d.projeto?.cliente) byId.set(d.projeto.cliente.id, d.projeto.cliente.nome);
    }
    return Array.from(byId, ([id, nome]) => ({ id, nome })).sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );
  }, [demandas]);

  const responsaveisComDemanda = useMemo(() => {
    const ids = new Set(demandas.map((d) => d.responsavel_id).filter(Boolean));
    return colaboradores.filter((c) => ids.has(c.id));
  }, [demandas, colaboradores]);

  function toggleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();

    let result = demandas.filter((d) => {
      if (q && !d.titulo.toLowerCase().includes(q)) return false;
      if (statusFilter !== "todos" && d.status !== statusFilter) return false;
      if (prioridadeFilter !== "todas" && d.prioridade !== prioridadeFilter) return false;
      if (responsavelFilter !== "todos" && d.responsavel_id !== responsavelFilter) return false;
      if (clienteFilter !== "todos" && d.projeto?.cliente?.id !== clienteFilter) return false;
      if (atrasadasOnly && !isAtrasada(d.prazo, d.status)) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case "titulo":
          cmp = a.titulo.localeCompare(b.titulo);
          break;
        case "responsavel":
          cmp = (a.responsavel?.nome ?? "").localeCompare(b.responsavel?.nome ?? "");
          break;
        case "projeto": {
          const aLabel = a.projeto ? `${a.projeto.cliente?.nome ?? ""} ${a.projeto.nome}` : "";
          const bLabel = b.projeto ? `${b.projeto.cliente?.nome ?? ""} ${b.projeto.nome}` : "";
          cmp = aLabel.localeCompare(bLabel);
          break;
        }
        case "status":
          cmp = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
          break;
        case "prioridade": {
          const order: DemandaPrioridade[] = ["baixa", "media", "alta", "urgente"];
          cmp = order.indexOf(a.prioridade) - order.indexOf(b.prioridade);
          break;
        }
        case "prazo":
          cmp = (a.prazo ?? "9999-99-99").localeCompare(b.prazo ?? "9999-99-99");
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [demandas, search, statusFilter, prioridadeFilter, responsavelFilter, clienteFilter, atrasadasOnly, sortColumn, sortDirection]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as prioridades</SelectItem>
            {(Object.keys(PRIORIDADE_CONFIG) as DemandaPrioridade[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORIDADE_CONFIG[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {responsaveisComDemanda.length > 1 && (
          <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os responsáveis</SelectItem>
              {responsaveisComDemanda.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {isAdmin && clientes.length > 0 && (
          <Select value={clienteFilter} onValueChange={setClienteFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os clientes</SelectItem>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center gap-2">
          <Checkbox
            id="atrasadas"
            checked={atrasadasOnly}
            onCheckedChange={(v) => setAtrasadasOnly(v === true)}
          />
          <Label htmlFor="atrasadas" className="text-sm font-normal">
            Só atrasadas
          </Label>
        </div>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("titulo")}
                >
                  Título <SortIcon column="titulo" sortColumn={sortColumn} sortDirection={sortDirection} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("responsavel")}
                >
                  Responsável <SortIcon column="responsavel" sortColumn={sortColumn} sortDirection={sortDirection} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("projeto")}
                >
                  Cliente/Projeto <SortIcon column="projeto" sortColumn={sortColumn} sortDirection={sortDirection} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("status")}
                >
                  Status <SortIcon column="status" sortColumn={sortColumn} sortDirection={sortDirection} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("prioridade")}
                >
                  Prioridade <SortIcon column="prioridade" sortColumn={sortColumn} sortDirection={sortDirection} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("prazo")}
                >
                  Prazo <SortIcon column="prazo" sortColumn={sortColumn} sortDirection={sortDirection} />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhuma demanda encontrada.
                </TableCell>
              </TableRow>
            )}
            {rows.map((demanda) => {
              const atrasada = isAtrasada(demanda.prazo, demanda.status);
              return (
                <TableRow key={demanda.id}>
                  <TableCell>
                    <Link
                      href={`/demandas/${demanda.id}`}
                      className="font-medium hover:underline"
                    >
                      {demanda.titulo}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {demanda.responsavel ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={demanda.responsavel.avatar_url ?? undefined}
                            alt={demanda.responsavel.nome}
                          />
                          <AvatarFallback className="text-xs">
                            {initials(demanda.responsavel.nome) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{demanda.responsavel.nome}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {demanda.projeto
                      ? demanda.projeto.cliente?.nome
                        ? `${demanda.projeto.cliente.nome} · ${demanda.projeto.nome}`
                        : demanda.projeto.nome
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={demanda.status} />
                  </TableCell>
                  <TableCell>
                    <PrioridadeBadge prioridade={demanda.prioridade} />
                  </TableCell>
                  <TableCell>
                    {demanda.prazo ? (
                      <span
                        className={cn(
                          "text-sm",
                          atrasada ? "font-medium text-destructive" : "text-muted-foreground"
                        )}
                      >
                        {format(new Date(`${demanda.prazo}T00:00:00`), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
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
