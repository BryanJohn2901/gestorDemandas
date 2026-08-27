-- ============================================================================
-- Migração 009: registros de tempo trabalhado por demanda (timer start/pause)
--
-- Já aplicada em produção via MCP (mcp__supabase__apply_migration). Este
-- arquivo é só o registro local, pra manter schema.sql/migrations em
-- sincronia com o banco.
-- ============================================================================

create table public.registros_tempo (
  id uuid primary key default gen_random_uuid(),
  demanda_id uuid not null references public.demandas (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

comment on table public.registros_tempo is 'Intervalos de tempo trabalhado por demanda (start/pause). Soma dos intervalos = tempo total gasto.';

create index registros_tempo_demanda_id_idx on public.registros_tempo (demanda_id);
create index registros_tempo_profile_id_idx on public.registros_tempo (profile_id);

-- Só um timer aberto por vez, por pessoa (em qualquer demanda) — impede 2
-- abas/dispositivos abrindo dois timers simultâneos pra mesma pessoa.
create unique index registros_tempo_um_aberto_por_pessoa
  on public.registros_tempo (profile_id) where ended_at is null;

alter table public.registros_tempo enable row level security;

-- Admin vê o tempo de qualquer demanda da própria empresa; colaborador só
-- vê o tempo das demandas em que é responsável.
create policy "registros_tempo_select" on public.registros_tempo
  for select to authenticated
  using (
    exists (
      select 1 from public.demandas d
      where d.id = registros_tempo.demanda_id
        and d.empresa_id = (select public.current_empresa_id())
        and ((select public.is_admin()) or d.responsavel_id = (select auth.uid()))
    )
  );

-- Insere sempre como si mesmo (profile_id não é escolhível), e só em
-- demanda da própria empresa em que é responsável (ou é admin).
create policy "registros_tempo_insert" on public.registros_tempo
  for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.demandas d
      where d.id = registros_tempo.demanda_id
        and d.empresa_id = (select public.current_empresa_id())
        and ((select public.is_admin()) or d.responsavel_id = (select auth.uid()))
    )
  );

-- Só o dono do registro pode pausar (fechar ended_at) — nem admin pausa o
-- timer de outra pessoa.
create policy "registros_tempo_update_own" on public.registros_tempo
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
