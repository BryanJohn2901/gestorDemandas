-- ============================================================================
-- Migração 004: presença + log de uso (pro dashboard de atividade do master)
--
-- Rode este arquivo inteiro no SQL Editor do Supabase (uma vez).
-- ============================================================================

alter table public.profiles add column last_seen_at timestamptz;

create table public.eventos_uso (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  acao text not null,
  created_at timestamptz not null default now()
);

comment on table public.eventos_uso is 'Log de uso (login, criar demanda, mudar status...) pro dashboard de atividade do master. acao é texto livre de propósito — telemetria, não regra de segurança.';

create index eventos_uso_profile_id_idx on public.eventos_uso (profile_id, created_at);
create index eventos_uso_empresa_id_idx on public.eventos_uso (empresa_id, created_at);

alter table public.eventos_uso enable row level security;

-- Só master lê (é dado do painel dele). Sem policy de insert — só entra via
-- log_evento() abaixo, que roda como dono da função (security definer).
create policy "eventos_uso_select_master"
  on public.eventos_uso for select
  to authenticated
  using (public.is_master());

-- Funções security definer em vez de uma policy de self-update/insert em
-- profiles/eventos_uso: não existe policy de self-update em profiles hoje
-- (só profiles_update_admin, que colaborador e master nunca passam) — abrir
-- uma policy genérica tipo `using(id = auth.uid())` deixaria qualquer
-- colaborador reescrever o próprio role/status/empresa_id (não tem GRANT de
-- coluna nesse schema, RLS é a única trava). As funções abaixo só tocam
-- exatamente o que precisam, sempre derivado de auth.uid() — nunca aceitam
-- empresa_id/profile_id vindo do cliente.

create function public.touch_last_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set last_seen_at = now()
  where id = auth.uid()
    and (last_seen_at is null or last_seen_at < now() - interval '1 minute');
$$;

grant execute on function public.touch_last_seen() to authenticated;

create function public.log_evento(p_acao text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.eventos_uso (empresa_id, profile_id, acao)
  select empresa_id, id, p_acao from public.profiles where id = auth.uid();
$$;

grant execute on function public.log_evento(text) to authenticated;
