-- ============================================================================
-- Migração 011: clientes e projetos, demanda passa a se ligar a um projeto
--
-- Já aplicada em produção via MCP (mcp__supabase__apply_migration). Este
-- arquivo é só o registro local, pra manter schema.sql/migrations em
-- sincronia com o banco.
--
-- Substitui o campo livre "cliente_projeto" (texto solto) por uma
-- estrutura de verdade: cliente cadastrado -> projetos desse cliente ->
-- demanda liga a um projeto (opcional). Isso é o que permite filtrar
-- "tudo que esse cliente precisa" de forma confiável.
-- ============================================================================

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

comment on table public.clientes is 'Clientes de cada empresa (tenant) — dono dos projetos, pra controle e filtro de demandas.';

create index clientes_empresa_id_idx on public.clientes (empresa_id);

alter table public.clientes enable row level security;

create policy "clientes_select" on public.clientes
  for select to authenticated
  using (empresa_id = (select public.current_empresa_id()));

create policy "clientes_insert_admin" on public.clientes
  for insert to authenticated
  with check ((select public.is_admin()) and empresa_id = (select public.current_empresa_id()));

create policy "clientes_update_admin" on public.clientes
  for update to authenticated
  using ((select public.is_admin()) and empresa_id = (select public.current_empresa_id()))
  with check ((select public.is_admin()) and empresa_id = (select public.current_empresa_id()));

create policy "clientes_delete_admin" on public.clientes
  for delete to authenticated
  using ((select public.is_admin()) and empresa_id = (select public.current_empresa_id()));

create table public.projetos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

comment on table public.projetos is 'Projetos de um cliente — demandas se ligam a um projeto (opcional).';

create index projetos_empresa_id_idx on public.projetos (empresa_id);
create index projetos_cliente_id_idx on public.projetos (cliente_id);

alter table public.projetos enable row level security;

create policy "projetos_select" on public.projetos
  for select to authenticated
  using (empresa_id = (select public.current_empresa_id()));

-- O exists() garante que o cliente_id escolhido pertence à própria empresa
-- do admin — sem isso, um insert/update direto (fora da UI) poderia ligar
-- um projeto a um cliente de outra empresa, mesmo com empresa_id certo.
create policy "projetos_insert_admin" on public.projetos
  for insert to authenticated
  with check (
    (select public.is_admin())
    and empresa_id = (select public.current_empresa_id())
    and exists (
      select 1 from public.clientes c
      where c.id = projetos.cliente_id and c.empresa_id = (select public.current_empresa_id())
    )
  );

create policy "projetos_update_admin" on public.projetos
  for update to authenticated
  using ((select public.is_admin()) and empresa_id = (select public.current_empresa_id()))
  with check (
    (select public.is_admin())
    and empresa_id = (select public.current_empresa_id())
    and exists (
      select 1 from public.clientes c
      where c.id = projetos.cliente_id and c.empresa_id = (select public.current_empresa_id())
    )
  );

create policy "projetos_delete_admin" on public.projetos
  for delete to authenticated
  using ((select public.is_admin()) and empresa_id = (select public.current_empresa_id()));

alter table public.demandas add column projeto_id uuid references public.projetos (id) on delete set null;
create index demandas_projeto_id_idx on public.demandas (projeto_id);

-- Só existia 1 demanda de teste com esse campo preenchido ("afedsfbd") —
-- sem dado real pra migrar, substitui direto pela estrutura nova.
alter table public.demandas drop column cliente_projeto;

-- Mesmo raciocínio do exists() de projetos: garante que o projeto ligado à
-- demanda pertence à própria empresa do admin.
alter policy "demandas_insert_admin" on public.demandas
  with check (
    (select public.is_admin())
    and empresa_id = (select public.current_empresa_id())
    and (
      projeto_id is null
      or exists (
        select 1 from public.projetos p
        where p.id = demandas.projeto_id and p.empresa_id = (select public.current_empresa_id())
      )
    )
  );

alter policy "demandas_update" on public.demandas
  with check (
    empresa_id = (select public.current_empresa_id())
    and ((select public.is_admin()) or responsavel_id = (select auth.uid()))
    and (
      projeto_id is null
      or exists (
        select 1 from public.projetos p
        where p.id = demandas.projeto_id and p.empresa_id = (select public.current_empresa_id())
      )
    )
  );

-- enforce_demanda_update_scope() ainda referenciava a coluna cliente_projeto
-- que acabou de ser removida acima — sem esse fix, qualquer update de
-- colaborador (ex: mudar status) quebraria em runtime (RECORD sem esse
-- campo). Aproveita pra também trancar projeto_id e link_entrega (esse
-- último já devia estar aqui desde a migração 010, ficou de fora por
-- engano) como campos só-admin, junto dos que já eram.
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
      or new.projeto_id is distinct from old.projeto_id
      or new.link_entrega is distinct from old.link_entrega
      or new.criado_por is distinct from old.criado_por
    then
      raise exception 'Apenas administradores podem editar esses campos. Colaboradores só podem atualizar o status.';
    end if;
  end if;
  return new;
end;
$$;
