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
  created_at timestamptz not null default now(),
  -- Colunas de cobrança: nulas pra sempre em empresa criada pelo master
  -- (grátis) — só ganham valor em empresa criada via /criar-empresa
  -- (paga, self-service, ver app/actions/criar-empresa.ts).
  asaas_customer_id text,
  asaas_subscription_id text,
  subscription_status text check (subscription_status in ('ativa', 'atrasada')),
  current_due_date date
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
  last_seen_at timestamptz,
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
create index demandas_criado_por_idx on public.demandas (criado_por);

-- comentarios: histórico de comentários por demanda (fase 2 da UI).
create table public.comentarios (
  id uuid primary key default gen_random_uuid(),
  demanda_id uuid not null references public.demandas (id) on delete cascade,
  autor_id uuid not null references public.profiles (id) on delete cascade,
  texto text not null,
  created_at timestamptz not null default now()
);

create index comentarios_demanda_id_idx on public.comentarios (demanda_id);
create index comentarios_autor_id_idx on public.comentarios (autor_id);

-- eventos_uso: log de uso (login, criar demanda, mudar status...) pro
-- dashboard de atividade do master. acao é texto livre de propósito —
-- telemetria, não regra de segurança, não precisa migração pra cada ação
-- nova.
create table public.eventos_uso (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  acao text not null,
  created_at timestamptz not null default now()
);

create index eventos_uso_profile_id_idx on public.eventos_uso (profile_id, created_at);
create index eventos_uso_empresa_id_idx on public.eventos_uso (empresa_id, created_at);

-- pre_cadastros: identidade de quem começou a pagar mas ainda não tem
-- conta/empresa. token vai no externalReference do Asaas Checkout e na
-- successUrl — é o que correlaciona o browser voltando do checkout
-- hospedado com "qual pagamento é esse" (ver app/actions/assinatura.ts,
-- app/api/webhooks/asaas/route.ts, app/actions/criar-empresa.ts).
create table public.pre_cadastros (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'aguardando_pagamento'
    check (status in ('aguardando_pagamento', 'pago', 'usado')),
  asaas_customer_id text,
  asaas_subscription_id text,
  -- capturado no webhook do primeiro pagamento, pra criar a 1ª linha de
  -- pagamentos de forma determinística (não depender de reentrega de
  -- webhook pra não perder a primeira fatura do histórico).
  primeiro_pagamento_id text,
  primeiro_pagamento_valor numeric(10,2),
  primeiro_pagamento_vencimento date,
  created_at timestamptz not null default now()
);

comment on table public.pre_cadastros is 'Identidade de quem começou a pagar mas ainda não criou a empresa/conta. token vai no externalReference do Asaas Checkout e na successUrl.';

-- pagamentos: histórico de cobranças por empresa ("contratos" no painel
-- do master).
create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  asaas_payment_id text not null unique,
  valor numeric(10,2) not null,
  status text not null check (status in ('pendente', 'pago', 'atrasado', 'estornado')),
  vencimento date not null,
  pago_em timestamptz,
  created_at timestamptz not null default now()
);

create index pagamentos_empresa_id_idx on public.pagamentos (empresa_id);

-- ============================================================================
-- 2. Triggers utilitários
-- ============================================================================

-- Cria automaticamente um profile ao registrar um novo usuário no Auth.
-- O admin/master cria colaboradores e admins via Supabase Admin API passando
-- nome/cargo/role/empresa_id em user_metadata; este trigger lê esses
-- valores para popular o profile. empresa_id precisa vir JUNTO nesse
-- insert (não num update depois) porque profiles_empresa_id_by_role checa
-- na hora do insert — um update posterior seria tarde demais, o insert já
-- teria falhado antes de chegar lá.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, empresa_id, nome, email, cargo, role, status)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'empresa_id', '')::uuid,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'cargo', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'colaborador'),
    'ativo'
  );
  return new;
end;
$$;

-- Trigger-only: o Postgres dispara sem checar EXECUTE do papel que fez o
-- DML, então não precisa de grant pra role nenhuma. Postgres concede
-- EXECUTE a PUBLIC por padrão em função nova — revoga pra não deixar
-- exposta via /rest/v1/rpc/handle_new_user à toa.
revoke execute on function public.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém updated_at em dia nas demandas.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public;

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
alter table public.eventos_uso enable row level security;
alter table public.pre_cadastros enable row level security;
-- Zero policies em pre_cadastros de propósito: não existe acesso legítimo
-- via sessão de browser pra essa tabela, tudo passa por createAdminClient()
-- (server-only). RLS habilitada sem policy = default-deny total pra
-- anon/authenticated, service_role ignora RLS de qualquer forma.
alter table public.pagamentos enable row level security;

-- Helper: verifica se o usuário autenticado é admin, sem recursão de RLS
-- (security definer roda com o dono da função, que ignora as policies).
-- Revoga de PUBLIC e regrant só authenticated: é chamada de dentro das
-- próprias RLS policies (roda como o papel authenticated do PostgREST), mas
-- não tem motivo pra deixar aberta pra anon/PUBLIC via /rest/v1/rpc.
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

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

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

revoke execute on function public.is_master() from public;
grant execute on function public.is_master() to authenticated;

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

revoke execute on function public.current_empresa_id() from public;
grant execute on function public.current_empresa_id() to authenticated;

-- Presença/uso: funções security definer em vez de policy de self-update em
-- profiles ou de insert direto em eventos_uso. Não existe policy de
-- self-update em profiles hoje (só profiles_update_admin, que colaborador e
-- master nunca passam) — uma policy genérica `using(id = auth.uid())`
-- deixaria qualquer colaborador reescrever o próprio role/status/empresa_id
-- (não tem GRANT de coluna nesse schema, RLS é a única trava). As funções
-- abaixo só tocam exatamente o necessário, sempre derivado de auth.uid() —
-- nunca aceitam empresa_id/profile_id vindo do cliente.

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

revoke execute on function public.touch_last_seen() from public;
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

revoke execute on function public.log_evento(text) from public;
grant execute on function public.log_evento(text) to authenticated;

-- --- empresas -----------------------------------------------------------
--
-- Só master gerencia. Excluir empresa é destrutivo (cascade de todos os
-- colaboradores e demandas dela) — a Server Action (app/actions/empresas.ts)
-- exige confirmação explícita na UI antes de chamar isso.

create policy "empresas_select_master"
  on public.empresas for select
  to authenticated
  using ((select public.is_master()));

create policy "empresas_insert_master"
  on public.empresas for insert
  to authenticated
  with check ((select public.is_master()));

create policy "empresas_update_master"
  on public.empresas for update
  to authenticated
  using ((select public.is_master()));

create policy "empresas_delete_master"
  on public.empresas for delete
  to authenticated
  using ((select public.is_master()));

-- Empresa lê a própria linha (precisa pra checar subscription_status/
-- current_due_date/status em requireProfile()). Aditiva à policy de
-- master acima (RLS OR's policies permissivas do mesmo comando).
create policy "empresas_select_own"
  on public.empresas for select
  to authenticated
  using (id = (select public.current_empresa_id()));

-- --- profiles ---------------------------------------------------------------
--
-- id = auth.uid() cobre a auto-leitura de qualquer usuário (inclusive
-- master, que precisa ler a própria linha) sem dar acesso amplo — como
-- current_empresa_id() do master é null, "empresa_id = null" nunca bate
-- com linha de ninguém. Isso é o que garante, no banco, que master não lê
-- colaborador de empresa nenhuma — não é só a UI que esconde.
--
-- (select auth.<fn>()) em vez de auth.<fn>() direto em todas as policies
-- abaixo: evita reavaliar a função por linha, só uma vez por statement.

create policy "profiles_select"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or empresa_id = (select public.current_empresa_id()));

-- Apenas admin cria/edita/remove colaboradores da própria empresa.
create policy "profiles_insert_admin"
  on public.profiles for insert
  to authenticated
  with check ((select public.is_admin()) and empresa_id = (select public.current_empresa_id()));

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using ((select public.is_admin()) and empresa_id = (select public.current_empresa_id()));

create policy "profiles_delete_admin"
  on public.profiles for delete
  to authenticated
  using ((select public.is_admin()) and empresa_id = (select public.current_empresa_id()));

-- --- demandas ----------------------------------------------------------------

-- Admin vê todas as demandas da própria empresa; colaborador vê apenas as
-- que são dele.
create policy "demandas_select"
  on public.demandas for select
  to authenticated
  using (
    empresa_id = (select public.current_empresa_id())
    and ((select public.is_admin()) or responsavel_id = (select auth.uid()))
  );

-- Apenas admin cria demandas, sempre na própria empresa.
create policy "demandas_insert_admin"
  on public.demandas for insert
  to authenticated
  with check ((select public.is_admin()) and empresa_id = (select public.current_empresa_id()));

-- Admin atualiza qualquer demanda da própria empresa; colaborador só
-- atualiza as suas (ex: mudar status ao mover no Kanban).
create policy "demandas_update"
  on public.demandas for update
  to authenticated
  using (
    empresa_id = (select public.current_empresa_id())
    and ((select public.is_admin()) or responsavel_id = (select auth.uid()))
  )
  with check (
    empresa_id = (select public.current_empresa_id())
    and ((select public.is_admin()) or responsavel_id = (select auth.uid()))
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

revoke execute on function public.enforce_demanda_update_scope() from public;

create trigger enforce_demanda_update_scope
  before update on public.demandas
  for each row execute function public.enforce_demanda_update_scope();

-- Apenas admin remove demandas da própria empresa.
create policy "demandas_delete_admin"
  on public.demandas for delete
  to authenticated
  using ((select public.is_admin()) and empresa_id = (select public.current_empresa_id()));

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
        and d.empresa_id = (select public.current_empresa_id())
        and ((select public.is_admin()) or d.responsavel_id = (select auth.uid()))
    )
  );

create policy "comentarios_insert"
  on public.comentarios for insert
  to authenticated
  with check (
    autor_id = (select auth.uid())
    and exists (
      select 1 from public.demandas d
      where d.id = comentarios.demanda_id
        and d.empresa_id = (select public.current_empresa_id())
        and ((select public.is_admin()) or d.responsavel_id = (select auth.uid()))
    )
  );

-- --- eventos_uso ---------------------------------------------------------
--
-- Só master lê (é dado do painel dele). Sem policy de insert — só entra via
-- log_evento(), que roda como dono da função (security definer, acima).

create policy "eventos_uso_select_master"
  on public.eventos_uso for select
  to authenticated
  using ((select public.is_master()));

-- --- pagamentos ------------------------------------------------------------
--
-- Só master lê (histórico de cobrança = "contratos" no painel dele).

create policy "pagamentos_select_master"
  on public.pagamentos for select
  to authenticated
  using ((select public.is_master()));

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
