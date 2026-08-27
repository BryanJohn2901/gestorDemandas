import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import { ArrowLeft } from "lucide-react";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/demandas/status-badge";
import { PrioridadeBadge } from "@/components/demandas/prioridade-badge";
import { DemandaDetailActions } from "@/components/demandas/demanda-detail-actions";
import { DemandaStatusSelect } from "@/components/demandas/demanda-status-select";
import { DemandaTimer } from "@/components/demandas/demanda-timer";
import { isAtrasada } from "@/lib/demandas";
import { cn } from "@/lib/utils";
import type { ProjetoComCliente } from "@/types/database";


function initials(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

type DemandaDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DemandaDetailPage({ params }: DemandaDetailPageProps) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: demanda } = await supabase
    .from("demandas")
    .select("*")
    .eq("id", id)
    .single();

  if (!demanda) {
    notFound();
  }

  const relatedIds = Array.from(
    new Set([demanda.responsavel_id, demanda.criado_por].filter((v): v is string => Boolean(v)))
  );

  const { data: relatedProfiles } = relatedIds.length
    ? await supabase.from("profiles").select("*").in("id", relatedIds)
    : { data: [] };

  const { data: colaboradores } = await supabase
    .from("profiles")
    .select("*")
    .order("nome");

  const { data: projetos } = await supabase
    .from("projetos")
    .select("*, cliente:clientes(id, nome)")
    .order("nome");

  const todosProjetos = (projetos ?? []) as ProjetoComCliente[];
  const projeto = todosProjetos.find((p) => p.id === demanda.projeto_id) ?? null;

  const responsavel = relatedProfiles?.find((p) => p.id === demanda.responsavel_id);
  const criador = relatedProfiles?.find((p) => p.id === demanda.criado_por);
  const atrasada = isAtrasada(demanda.prazo, demanda.status);
  const isResponsavel = demanda.responsavel_id === profile.id;
  const podeControlarTimer = isResponsavel || profile.role === "admin";

  const { data: registrosTempo } = await supabase
    .from("registros_tempo")
    .select("started_at, ended_at, profile_id")
    .eq("demanda_id", demanda.id);

  // Server Component roda de novo a cada request — Date.now() aqui é
  // seguro apesar do lint (mesmo raciocínio de app/master/atividade/page.tsx).
  // eslint-disable-next-line react-hooks/purity
  const agora = Date.now();
  const segundosBase = (registrosTempo ?? []).reduce((total, registro) => {
    const inicio = new Date(registro.started_at).getTime();
    const fim = registro.ended_at ? new Date(registro.ended_at).getTime() : agora;
    return total + (fim - inicio) / 1000;
  }, 0);
  const emAndamento = (registrosTempo ?? []).some(
    (registro) => registro.ended_at === null && registro.profile_id === profile.id
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/demandas"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para demandas
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{demanda.titulo}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={demanda.status} />
            <PrioridadeBadge prioridade={demanda.prioridade} />
            {projeto && (
              <span className="text-sm text-muted-foreground">
                {projeto.cliente?.nome ? `${projeto.cliente.nome} · ${projeto.nome}` : projeto.nome}
              </span>
            )}
          </div>
        </div>

        {profile.role === "admin" && (
          <DemandaDetailActions
            demanda={demanda}
            colaboradores={colaboradores ?? []}
            projetos={todosProjetos}
          />
        )}
      </div>

      {profile.role !== "admin" && isResponsavel && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Atualizar status:</span>
          <DemandaStatusSelect demandaId={demanda.id} status={demanda.status} />
        </div>
      )}

      <Card>
        <CardContent className="flex flex-col gap-2">
          <div className="text-xs font-medium text-muted-foreground">Tempo trabalhado</div>
          <DemandaTimer
            key={`${emAndamento}-${segundosBase}`}
            demandaId={demanda.id}
            segundosBase={segundosBase}
            emAndamento={emAndamento}
            podeControlar={podeControlarTimer}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Responsável</div>
            {responsavel ? (
              <div className="mt-1 flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={responsavel.avatar_url ?? undefined} alt={responsavel.nome} />
                  <AvatarFallback className="text-xs">
                    {initials(responsavel.nome) || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{responsavel.nome}</span>
              </div>
            ) : (
              <div className="mt-1 text-sm text-muted-foreground">—</div>
            )}
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground">Prazo</div>
            <div
              className={cn(
                "mt-1 text-sm",
                atrasada ? "font-medium text-destructive" : ""
              )}
            >
              {demanda.prazo
                ? format(new Date(`${demanda.prazo}T00:00:00`), "dd 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })
                : "Sem prazo definido"}
              {atrasada && " · atrasada"}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground">Criado por</div>
            <div className="mt-1 text-sm">{criador?.nome ?? "—"}</div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground">Criado em</div>
            <div className="mt-1 text-sm">
              {format(new Date(demanda.created_at), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground">Link de entrega</div>
            <div className="mt-1 text-sm">
              {demanda.link_entrega ? (
                <a
                  href={demanda.link_entrega}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4 break-all"
                >
                  {demanda.link_entrega}
                </a>
              ) : (
                "—"
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-2 text-xs font-medium text-muted-foreground">Descrição</div>
          {demanda.descricao ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{demanda.descricao}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem descrição.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
