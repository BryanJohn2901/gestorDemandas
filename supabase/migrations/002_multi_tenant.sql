-- ============================================================================
-- Migração 002: multi-tenant (empresas + master)
--
-- Rode este arquivo inteiro no SQL Editor do painel do Supabase, uma vez,
-- na base que já tem o schema.sql + 001_harden_demandas_update.sql aplicados.
--
-- Depois de rodar até o fim, edite e rode À PARTE (por último, sozinho) o
-- comando de promoção do master no final deste arquivo — troque o e-mail.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabela empresas
-- ----------------------------------------------------------------------------

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);

comment on table public.empresas is 'Empresas-cliente do SaaS. Cada uma tem seu próprio admin e colaboradores.';

alter table public.empresas enable row level security;

-- ----------------------------------------------------------------------------
-- 2. Coluna empresa_id em profiles (nullable — null significa master)
-- ----------------------------------------------------------------------------

alter table public.profiles add column empresa_id uuid references public.empresas (id) on delete cascade;

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('master', 'admin', 'colaborador'));

-- Amarra a regra ao role em vez de um NOT NULL na coluna: o trigger
-- handle_new_user() insere a linha de profiles sem saber o empresa_id (só
-- lê nome/cargo/role do metadata) — tanto criar colaborador quanto criar
-- empresa+admin completam o empresa_id num update logo depois do insert,
-- mesmo padrão que já existe hoje pra avatar_url. Um NOT NULL na coluna
-- quebraria esse insert antes do update rodar.
alter table public.profiles add constraint profiles_empresa_id_by_role
  check (
    (role = 'master' and empresa_id is null)
    or (role <> 'master' and empresa_id is not null)
  );

-- ----------------------------------------------------------------------------
-- 3. Coluna empresa_id em demandas (vai virar NOT NULL depois do backfill)
-- ----------------------------------------------------------------------------

alter table public.demandas add column empresa_id uuid references public.empresas (id) on delete cascade;

-- ----------------------------------------------------------------------------
-- 4. Backfill: tudo que já existe vira "Empresa 1"
-- ----------------------------------------------------------------------------

do $$
declare
  empresa1_id uuid;
begin
  insert into public.empresas (nome) values ('Empresa 1') returning id into empresa1_id;

  update public.profiles set empresa_id = empresa1_id where empresa_id is null;
  update public.demandas set empresa_id = empresa1_id where empresa_id is null;
end $$;

alter table public.demandas alter column empresa_id set not null;

create index demandas_empresa_id_idx on public.demandas (empresa_id);
create index profiles_empresa_id_idx on public.profiles (empresa_id);

-- ----------------------------------------------------------------------------
-- 5. Helpers de RLS
-- ----------------------------------------------------------------------------

create function public.is_master()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'master'
  );
$$;

create function public.current_empresa_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select empresa_id from public.profiles where id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- 6. profiles: troca a policy de select antiga (liberava tudo pra
--    qualquer autenticado) por uma escopada por empresa
-- ----------------------------------------------------------------------------

drop policy "profiles_select_authenticated" on public.profiles;

-- id = auth.uid() cobre a auto-leitura do master (precisa ler a própria
-- linha em requireProfile()) sem dar acesso amplo — como current_empresa_id()
-- do master é null, "empresa_id = null" nunca bate com linha de ninguém.
-- Isso é o que garante, no banco, que master não lê colaborador de empresa
-- nenhuma — não é só a UI que esconde.
create policy "profiles_select"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or empresa_id = public.current_empresa_id());

drop policy "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin() and empresa_id = public.current_empresa_id());

drop policy "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin() and empresa_id = public.current_empresa_id());

drop policy "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
  on public.profiles for delete
  to authenticated
  using (public.is_admin() and empresa_id = public.current_empresa_id());

-- ----------------------------------------------------------------------------
-- 7. demandas: escopa por empresa além do que já existia
-- ----------------------------------------------------------------------------

drop policy "demandas_select" on public.demandas;
create policy "demandas_select"
  on public.demandas for select
  to authenticated
  using (
    empresa_id = public.current_empresa_id()
    and (public.is_admin() or responsavel_id = auth.uid())
  );

drop policy "demandas_insert_admin" on public.demandas;
create policy "demandas_insert_admin"
  on public.demandas for insert
  to authenticated
  with check (public.is_admin() and empresa_id = public.current_empresa_id());

drop policy "demandas_update" on public.demandas;
create policy "demandas_update"
  on public.demandas for update
  to authenticated
  using (
    empresa_id = public.current_empresa_id()
    and (public.is_admin() or responsavel_id = auth.uid())
  )
  with check (
    empresa_id = public.current_empresa_id()
    and (public.is_admin() or responsavel_id = auth.uid())
  );

drop policy "demandas_delete_admin" on public.demandas;
create policy "demandas_delete_admin"
  on public.demandas for delete
  to authenticated
  using (public.is_admin() and empresa_id = public.current_empresa_id());

-- Trava empresa_id: nunca pode mudar depois de criado (nem admin).
create or replace function public.enforce_demanda_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.empresa_id is distinct from old.empresa_id then
    raise exception 'empresa_id de uma demanda não pode ser alterado.';
  end if;

  if not public.is_admin() then
    if new.titulo is distinct from old.titulo
      or new.descricao is distinct from old.descricao
      or new.responsavel_id is distinct from old.responsavel_id
      or new.prioridade is distinct from old.prioridade
      or new.prazo is distinct from old.prazo
      or new.cliente_projeto is distinct from old.cliente_projeto
      or new.criado_por is distinct from old.criado_por
    then
      raise exception 'Apenas administradores podem editar esses campos. Colaboradores só podem atualizar o status.';
    end if;
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 8. comentarios: escopa a policy existente (sem coluna empresa_id própria —
--    não tem UI/action implementada ainda, é só por completude)
-- ----------------------------------------------------------------------------

drop policy "comentarios_select" on public.comentarios;
create policy "comentarios_select"
  on public.comentarios for select
  to authenticated
  using (
    exists (
      select 1 from public.demandas d
      where d.id = comentarios.demanda_id
        and d.empresa_id = public.current_empresa_id()
        and (public.is_admin() or d.responsavel_id = auth.uid())
    )
  );

drop policy "comentarios_insert" on public.comentarios;
create policy "comentarios_insert"
  on public.comentarios for insert
  to authenticated
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from public.demandas d
      where d.id = comentarios.demanda_id
        and d.empresa_id = public.current_empresa_id()
        and (public.is_admin() or d.responsavel_id = auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- 9. empresas: só master gerencia. Sem policy de delete por enquanto —
--    desativar via status, não apagar (evita cascade de todos os dados
--    de uma empresa por engano).
-- ----------------------------------------------------------------------------

create policy "empresas_select_master"
  on public.empresas for select
  to authenticated
  using (public.is_master());

create policy "empresas_insert_master"
  on public.empresas for insert
  to authenticated
  with check (public.is_master());

create policy "empresas_update_master"
  on public.empresas for update
  to authenticated
  using (public.is_master());

-- ============================================================================
-- 10. Promoção do master — RODE SEPARADO, por último, com o e-mail certo
-- ============================================================================
--
-- update public.profiles set role = 'master', empresa_id = null
-- where email = 'seu-email@empresa.com';
--
-- Depois disso, "Empresa 1" (criada no backfill acima) fica sem admin — crie
-- um admin novo pra ela pela tela /master (Nova empresa, renomeando o nome
-- se quiser, ou criando um novo admin pra essa mesma empresa via SQL).
