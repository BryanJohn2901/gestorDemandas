-- ============================================================================
-- Migração 008: pagamento (Asaas) — pague primeiro, crie a empresa depois
--
-- Já aplicada em produção via MCP (mcp__supabase__apply_migration). Este
-- arquivo é só o registro local, pra manter schema.sql/migrations em
-- sincronia com o banco.
-- ============================================================================

alter table public.empresas add column asaas_customer_id text;
alter table public.empresas add column asaas_subscription_id text;
alter table public.empresas add column subscription_status text
  check (subscription_status in ('ativa', 'atrasada'));
-- nullable: null = sem cobrança (toda empresa criada pelo master fica assim
-- pra sempre — só empresa paga via self-service ganha valor aqui).
alter table public.empresas add column current_due_date date;

-- Identidade de quem começou a pagar mas ainda não tem conta — token vai
-- no externalReference do Asaas e na successUrl, é o que correlaciona o
-- browser voltando do checkout hospedado com "qual pagamento é esse".
create table public.pre_cadastros (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'aguardando_pagamento'
    check (status in ('aguardando_pagamento', 'pago', 'usado')),
  asaas_customer_id text,
  asaas_subscription_id text,
  -- capturado no webhook do primeiro pagamento, pra criar a 1ª linha de
  -- pagamentos de forma determinística em /criar-empresa (não depender de
  -- reentrega de webhook pra não perder a primeira fatura do histórico).
  primeiro_pagamento_id text,
  primeiro_pagamento_valor numeric(10,2),
  primeiro_pagamento_vencimento date,
  created_at timestamptz not null default now()
);

comment on table public.pre_cadastros is 'Identidade de quem começou a pagar mas ainda não criou a empresa/conta. token vai no externalReference do Asaas Checkout e na successUrl.';

alter table public.pre_cadastros enable row level security;
-- Zero policies de propósito: não existe acesso legítimo via sessão de
-- browser pra essa tabela, tudo passa por createAdminClient() (a action de
-- iniciar assinatura, o webhook, a página /criar-empresa). RLS habilitada
-- sem policy = default-deny total pra anon/authenticated, service_role
-- ignora RLS de qualquer forma.

create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  asaas_payment_id text not null unique, -- upsert idempotente no webhook
  valor numeric(10,2) not null,
  status text not null check (status in ('pendente', 'pago', 'atrasado', 'estornado')),
  vencimento date not null,
  pago_em timestamptz,
  created_at timestamptz not null default now()
);

alter table public.pagamentos enable row level security;

create policy "pagamentos_select_master" on public.pagamentos
  for select to authenticated using ((select public.is_master()));

create index pagamentos_empresa_id_idx on public.pagamentos (empresa_id);

-- Empresa passa a poder ler a própria linha (precisa pra checar
-- subscription_status/current_due_date/status em requireProfile()). Fica
-- ADITIVA à policy de master já existente (RLS OR's policies permissivas
-- do mesmo comando).
create policy "empresas_select_own" on public.empresas
  for select to authenticated using (id = (select public.current_empresa_id()));
