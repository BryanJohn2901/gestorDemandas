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

-- profiles: perfil estendido de auth.users (1:1). Criado automaticamente via
-- trigger sempre que um novo usuário é registrado no Supabase Auth.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  email text not null,
  cargo text not null default '',
  role text not null default 'colaborador' check (role in ('admin', 'colaborador')),
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  avatar_url text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil dos colaboradores da agência, 1:1 com auth.users.';

-- demandas: tarefas/demandas atribuídas aos colaboradores.
create table public.demandas (
  id uuid primary key default gen_random_uuid(),
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

comment on table public.demandas is 'Demandas/tarefas gerenciadas pela agência.';

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
-- O admin cria colaboradores via Supabase Admin API passando nome/cargo/role
-- em user_metadata; este trigger lê esses valores para popular o profile.
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

-- --- profiles ---------------------------------------------------------------

-- Qualquer usuário autenticado pode ler a lista de colaboradores (necessário
-- para o combo de "responsável" e para exibir nomes/avatares nas demandas).
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- Apenas admin cria/edita/remove colaboradores.
create policy "profiles_insert_admin"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin());

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin());

create policy "profiles_delete_admin"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

-- --- demandas ----------------------------------------------------------------

-- Admin vê todas as demandas; colaborador vê apenas as que são dele.
create policy "demandas_select"
  on public.demandas for select
  to authenticated
  using (public.is_admin() or responsavel_id = auth.uid());

-- Apenas admin cria demandas.
create policy "demandas_insert_admin"
  on public.demandas for insert
  to authenticated
  with check (public.is_admin());

-- Admin atualiza qualquer demanda; colaborador só atualiza as suas
-- (ex: mudar status ao mover no Kanban).
create policy "demandas_update"
  on public.demandas for update
  to authenticated
  using (public.is_admin() or responsavel_id = auth.uid())
  with check (public.is_admin() or responsavel_id = auth.uid());

-- RLS acima só decide QUAIS LINHAS um colaborador pode tocar — não QUAIS
-- COLUNAS. Este trigger fecha essa lacuna: colaborador só pode alterar o
-- status da própria demanda, mesmo chamando a API do Supabase diretamente.
create function public.enforce_demanda_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

-- Apenas admin remove demandas.
create policy "demandas_delete_admin"
  on public.demandas for delete
  to authenticated
  using (public.is_admin());

-- --- comentarios ---------------------------------------------------------------

-- Pode ler/comentar quem tem acesso à demanda (admin ou responsável).
create policy "comentarios_select"
  on public.comentarios for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.demandas d
      where d.id = comentarios.demanda_id and d.responsavel_id = auth.uid()
    )
  );

create policy "comentarios_insert"
  on public.comentarios for insert
  to authenticated
  with check (
    autor_id = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1 from public.demandas d
        where d.id = comentarios.demanda_id and d.responsavel_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- 4. Primeiro usuário admin
-- ============================================================================
--
-- Depois de rodar este schema:
--   1. Crie o primeiro usuário em Authentication > Users > Add user
--      (defina um e-mail e senha).
--   2. Rode o comando abaixo (troque o e-mail) para promovê-lo a admin:
--
--   update public.profiles set role = 'admin', nome = 'Seu Nome', status = 'ativo'
--   where email = 'seu-email@empresa.com';
--
-- Os próximos colaboradores podem ser cadastrados diretamente pela tela de
-- "Colaboradores" do app (fase 4), que já cria o usuário com o role correto.
