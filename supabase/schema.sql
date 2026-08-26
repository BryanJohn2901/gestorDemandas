-- ============================================================================
-- Gestor de Demandas — Schema do banco
--
-- Rode este arquivo inteiro no SQL Editor do painel do Supabase
-- (Project > SQL Editor > New query), uma única vez, num projeto novo.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ============================================================================
-- 1. Tabelas
-- ============================================================================

-- empresas: empresas-cliente do SaaS. Cada uma tem seu próprio admin e
-- colaboradores, isolados dos dados das outras.
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);

comment on table public.empresas is 'Empresas-cliente do SaaS. Cada uma tem seu próprio admin e colaboradores.';

-- profiles: perfil estendido de auth.users (1:1). Criado automaticamente via
-- trigger sempre que um novo usuário é registrado no Supabase Auth.
-- empresa_id é nulo só pra master (dono da plataforma, gerencia as
-- empresas mas não pertence a nenhuma) — pra admin/colaborador é sempre
-- preenchido (ver constraint profiles_empresa_id_by_role abaixo).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  empresa_id uuid references public.empresas (id) on delete cascade,
  nome text not null default '',
  email text not null,
  cargo text not null default '',
  role text not null default 'colaborador' check (role in ('master', 'admin', 'colaborador')),
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint profiles_empresa_id_by_role check (
    (role = 'master' and empresa_id is null)
    or (role <> 'master' and empresa_id is not null)
  )
);

comment on table public.profiles is 'Perfil dos usuários (master, admin ou colaborador), 1:1 com auth.users.';

create index profiles_empresa_id_idx on public.profiles (empresa_id);

-- demandas: tarefas/demandas atribuídas aos colaboradores.
create table public.demandas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  titulo text not null,
  descricao text,
  responsavel_id uuid references public.profiles (id) on delete set null,
  status text not null default 'a_fazer'
    check (status in ('a_fazer', 'em_andamento', 'em_revisao', 'concluido')),
  prioridade text not null default 'media'
    check (prioridade in ('baixa', 'media', 'alta', 'urgente')),
  prazo date,
  cliente_projeto text,
  criado_por uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.demandas is 'Demandas/tarefas gerenciadas por cada empresa.';

create index demandas_empresa_id_idx on public.demandas (empresa_id);
create index demandas_responsavel_id_idx on public.demandas (responsavel_id);
create index demandas_status_idx on public.demandas (status);
create index demandas_prazo_idx on public.demandas (prazo);

-- comentarios: histórico de comentários por demanda (fase 2 da UI).
create table public.comentarios (
  id uuid primary key default gen_random_uuid(),
  demanda_id uuid not null references public.demandas (id) on delete cascade,
  autor_id uuid not null references public.profiles (id) on delete cascade,
  texto text not null,
  created_at timestamptz not null default now()
);

create index comentarios_demanda_id_idx on public.comentarios (demanda_id);

-- ============================================================================
-- 2. Triggers utilitários
-- ============================================================================

-- Cria automaticamente um profile ao registrar um novo usuário no Auth.
-- O admin/master cria colaboradores e admins via Supabase Admin API passando
-- nome/cargo/role em user_metadata; este trigger lê esses valores para
-- popular o profile. empresa_id NÃO vem daqui — é completado num update
-- logo depois do createUser (ver app/actions/colaboradores.ts e
-- app/actions/empresas.ts), mesmo padrão já usado pro avatar_url.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email, cargo, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'cargo', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'colaborador'),
    'ativo'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém updated_at em dia nas demandas.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_demandas_updated_at
  before update on public.demandas
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 3. Row Level Security
-- ============================================================================

alter table public.empresas enable row level security;
alter table public.profiles enable row level security;
alter table public.demandas enable row level security;
alter table public.comentarios enable row level security;

-- Helper: verifica se o usuário autenticado é admin, sem recursão de RLS
-- (security definer roda com o dono da função, que ignora as policies).
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper: verifica se o usuário autenticado é master (dono da plataforma).
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

-- Helper: empresa do usuário autenticado (null pra master).
create function public.current_empresa_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select empresa_id from public.profiles where id = auth.uid();
$$;

-- --- empresas -----------------------------------------------------------
--
-- Só master gerencia. Excluir empresa é destrutivo (cascade de todos os
-- colaboradores e demandas dela) — a Server Action (app/actions/empresas.ts)
-- exige confirmação explícita na UI antes de chamar isso.

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

create policy "empresas_delete_master"
  on public.empresas for delete
  to authenticated
  using (public.is_master());

-- --- profiles ---------------------------------------------------------------
--
-- id = auth.uid() cobre a auto-leitura de qualquer usuário (inclusive
-- master, que precisa ler a própria linha) sem dar acesso amplo — como
-- current_empresa_id() do master é null, "empresa_id = null" nunca bate
-- com linha de ninguém. Isso é o que garante, no banco, que master não lê
-- colaborador de empresa nenhuma — não é só a UI que esconde.

create policy "profiles_select"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or empresa_id = public.current_empresa_id());

-- Apenas admin cria/edita/remove colaboradores da própria empresa.
create policy "profiles_insert_admin"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin() and empresa_id = public.current_empresa_id());

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin() and empresa_id = public.current_empresa_id());

create policy "profiles_delete_admin"
  on public.profiles for delete
  to authenticated
  using (public.is_admin() and empresa_id = public.current_empresa_id());

-- --- demandas ----------------------------------------------------------------

-- Admin vê todas as demandas da própria empresa; colaborador vê apenas as
-- que são dele.
create policy "demandas_select"
  on public.demandas for select
  to authenticated
  using (
    empresa_id = public.current_empresa_id()
    and (public.is_admin() or responsavel_id = auth.uid())
  );

-- Apenas admin cria demandas, sempre na própria empresa.
create policy "demandas_insert_admin"
  on public.demandas for insert
  to authenticated
  with check (public.is_admin() and empresa_id = public.current_empresa_id());

-- Admin atualiza qualquer demanda da própria empresa; colaborador só
-- atualiza as suas (ex: mudar status ao mover no Kanban).
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

-- RLS acima só decide QUAIS LINHAS um colaborador pode tocar — não QUAIS
-- COLUNAS. Este trigger fecha essa lacuna: colaborador só pode alterar o
-- status da própria demanda, mesmo chamando a API do Supabase diretamente.
-- Também trava empresa_id: nunca pode mudar depois de criado, nem admin.
create function public.enforce_demanda_update_scope()
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

create trigger enforce_demanda_update_scope
  before update on public.demandas
  for each row execute function public.enforce_demanda_update_scope();

-- Apenas admin remove demandas da própria empresa.
create policy "demandas_delete_admin"
  on public.demandas for delete
  to authenticated
  using (public.is_admin() and empresa_id = public.current_empresa_id());

-- --- comentarios ---------------------------------------------------------------
--
-- Sem coluna empresa_id própria — escopa via join com demandas, que já é
-- escopada por empresa.

-- Pode ler/comentar quem tem acesso à demanda (admin ou responsável) na
-- própria empresa.
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

-- ============================================================================
-- 4. Primeiro usuário master
-- ============================================================================
--
-- Depois de rodar este schema:
--   1. Crie o primeiro usuário em Authentication > Users > Add user
--      (defina um e-mail e senha).
--   2. Rode o comando abaixo (troque o e-mail) para promovê-lo a master —
--      dono da plataforma, gerencia as empresas mas não pertence a nenhuma:
--
--   update public.profiles set role = 'master', nome = 'Seu Nome', empresa_id = null
--   where email = 'seu-email@empresa.com';
--
-- As empresas (e seus admins) são cadastradas pela tela /master a partir
-- daí — cada admin cria seus próprios colaboradores pela tela
-- "Colaboradores" de dentro da empresa dele.
