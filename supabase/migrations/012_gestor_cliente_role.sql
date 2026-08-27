-- ============================================================================
-- Migração 012: papéis Gestor e Cliente (visualizador externo)
--
-- Já aplicada em produção via MCP (mcp__supabase__apply_migration). Este
-- arquivo é só o registro local, pra manter schema.sql/migrations em
-- sincronia com o banco.
--
-- Adiciona 2 papéis novos além de admin/colaborador (mantidos com os
-- mesmos valores no banco, só o rótulo na UI muda pra Administrador/
-- Executor):
--   - gestor: opera o dia a dia (demandas/clientes/projetos), mas NUNCA
--     cria/edita/promove/remove conta de time nem de cliente — isso é
--     fronteira de segurança, só Administrador mexe em contas de acesso.
--   - cliente: conta de um cliente externo de verdade (ex: "Nexo"), só
--     enxerga demandas do(s) projeto(s) do cliente dele. Nunca edita nada,
--     nunca vê tempo trabalhado, nunca vê o roster interno do time.
-- ============================================================================

-- --- 1. profiles: cliente_id + papéis novos --------------------------------

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('master', 'admin', 'gestor', 'colaborador', 'cliente'));

-- Só preenchido pra role=cliente: qual cliente (tabela clientes) essa conta
-- externa representa. on delete set null (não cascade) — se o cliente for
-- removido do CRM interno, a conta de login não some sozinha, fica órfã
-- pro admin decidir (inativar/realocar).
alter table public.profiles
  add column cliente_id uuid references public.clientes (id) on delete set null;

create index profiles_cliente_id_idx on public.profiles (cliente_id);

-- Mesmo raciocínio de profiles_empresa_id_by_role: cliente_id só é
-- obrigatório (e só faz sentido) pra role=cliente.
alter table public.profiles add constraint profiles_cliente_id_by_role check (
  (role = 'cliente' and cliente_id is not null)
  or (role <> 'cliente' and cliente_id is null)
);

comment on column public.profiles.cliente_id is 'Só preenchido pra role=cliente: qual cliente (tabela clientes) essa conta externa representa.';

-- --- 2. handle_new_user(): também lê cliente_id do metadata ----------------
-- Mesma regra de empresa_id (ver comentário original da função): cliente_id
-- precisa vir JUNTO no createUser(), nunca num update depois — o trigger
-- roda no insert e profiles_cliente_id_by_role checa nesse exato insert.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, empresa_id, cliente_id, nome, email, cargo, role, status)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'empresa_id', '')::uuid,
    nullif(new.raw_user_meta_data ->> 'cliente_id', '')::uuid,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'cargo', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'colaborador'),
    'ativo'
  );
  return new;
end;
$$;

-- --- 3. Helpers novos (mesmo padrão de is_admin()/is_master()) ------------
--
-- Postgres concede EXECUTE a PUBLIC por padrão em função nova, e o Supabase
-- também concede um grant direto a anon/authenticated na criação — revogar
-- só de PUBLIC não basta (mordeu o projeto antes, ver migração 007), tem
-- que revogar de anon explicitamente também.

create function public.is_admin_or_gestor()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'gestor'));
$$;
revoke execute on function public.is_admin_or_gestor() from public;
revoke execute on function public.is_admin_or_gestor() from anon;
grant execute on function public.is_admin_or_gestor() to authenticated;

create function public.is_cliente()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'cliente');
$$;
revoke execute on function public.is_cliente() from public;
revoke execute on function public.is_cliente() from anon;
grant execute on function public.is_cliente() to authenticated;

create function public.current_cliente_id()
returns uuid language sql security definer set search_path = public stable as $$
  select cliente_id from public.profiles where id = auth.uid();
$$;
revoke execute on function public.current_cliente_id() from public;
revoke execute on function public.current_cliente_id() from anon;
grant execute on function public.current_cliente_id() to authenticated;

-- --- 4. profiles_select: cliente não lê o roster inteiro -------------------
-- Antes: id = auth.uid() or empresa_id = current_empresa_id() — QUALQUER
-- papel na empresa lia nome/email/cargo/role/status de todo mundo. Pra
-- admin/gestor/colaborador isso continua igual de propósito (não é o que
-- essa migração resolve). Só pra cliente muda: só resolve nome/avatar de
-- quem é responsavel_id numa demanda que ele já pode ver.

alter policy "profiles_select" on public.profiles
  using (
    id = (select auth.uid())
    or (
      empresa_id = (select public.current_empresa_id())
      and not (select public.is_cliente())
    )
    or (
      (select public.is_cliente())
      and exists (
        select 1 from public.demandas d
        join public.projetos p on p.id = d.projeto_id
        where d.responsavel_id = profiles.id
          and d.empresa_id = (select public.current_empresa_id())
          and p.cliente_id = (select public.current_cliente_id())
      )
    )
  );

-- --- 5. clientes/projetos: gestor = admin; cliente só vê o(s) seu(s) ------
-- clientes_select/projetos_select não tinham NENHUMA checagem de papel
-- antes (só empresa_id) — um cliente veria nome de todo mundo. Fecha aqui,
-- mesmo não estando no pedido original, porque é exatamente o vazamento
-- que o papel Cliente existe pra evitar.

alter policy "clientes_select" on public.clientes
  using (
    empresa_id = (select public.current_empresa_id())
    and (not (select public.is_cliente()) or id = (select public.current_cliente_id()))
  );

alter policy "clientes_insert_admin" on public.clientes
  with check ((select public.is_admin_or_gestor()) and empresa_id = (select public.current_empresa_id()));

alter policy "clientes_update_admin" on public.clientes
  using ((select public.is_admin_or_gestor()) and empresa_id = (select public.current_empresa_id()))
  with check ((select public.is_admin_or_gestor()) and empresa_id = (select public.current_empresa_id()));

alter policy "clientes_delete_admin" on public.clientes
  using ((select public.is_admin_or_gestor()) and empresa_id = (select public.current_empresa_id()));

alter policy "projetos_select" on public.projetos
  using (
    empresa_id = (select public.current_empresa_id())
    and (not (select public.is_cliente()) or cliente_id = (select public.current_cliente_id()))
  );

alter policy "projetos_insert_admin" on public.projetos
  with check (
    (select public.is_admin_or_gestor())
    and empresa_id = (select public.current_empresa_id())
    and exists (
      select 1 from public.clientes c
      where c.id = projetos.cliente_id and c.empresa_id = (select public.current_empresa_id())
    )
  );

alter policy "projetos_update_admin" on public.projetos
  using ((select public.is_admin_or_gestor()) and empresa_id = (select public.current_empresa_id()))
  with check (
    (select public.is_admin_or_gestor())
    and empresa_id = (select public.current_empresa_id())
    and exists (
      select 1 from public.clientes c
      where c.id = projetos.cliente_id and c.empresa_id = (select public.current_empresa_id())
    )
  );

alter policy "projetos_delete_admin" on public.projetos
  using ((select public.is_admin_or_gestor()) and empresa_id = (select public.current_empresa_id()));

-- --- 6. demandas: gestor = admin; cliente só as do(s) seu(s) projeto(s) ---

alter policy "demandas_select" on public.demandas
  using (
    empresa_id = (select public.current_empresa_id())
    and (
      (select public.is_admin_or_gestor())
      or responsavel_id = (select auth.uid())
      or (
        (select public.is_cliente())
        and exists (
          select 1 from public.projetos p
          where p.id = demandas.projeto_id and p.cliente_id = (select public.current_cliente_id())
        )
      )
    )
  );
-- Demanda sem projeto_id (tarefa interna) nunca aparece pro cliente: o
-- exists() acima nunca bate quando demandas.projeto_id is null.

-- responsavel_id nunca pode ser uma conta cliente. Sem essa trava, atribuir
-- por engano (ou via chamada direta à API) uma demanda a um Visualizador
-- faria ele bater na cláusula "responsavel_id = auth.uid()" de
-- demandas_update e conseguir mudar status — violando "cliente não edita
-- nada".

alter policy "demandas_insert_admin" on public.demandas
  with check (
    (select public.is_admin_or_gestor())
    and empresa_id = (select public.current_empresa_id())
    and (
      projeto_id is null
      or exists (
        select 1 from public.projetos p
        where p.id = demandas.projeto_id and p.empresa_id = (select public.current_empresa_id())
      )
    )
    and (
      responsavel_id is null
      or exists (
        select 1 from public.profiles r
        where r.id = demandas.responsavel_id
          and r.empresa_id = (select public.current_empresa_id())
          and r.role <> 'cliente'
      )
    )
  );

alter policy "demandas_update" on public.demandas
  using (
    empresa_id = (select public.current_empresa_id())
    and ((select public.is_admin_or_gestor()) or responsavel_id = (select auth.uid()))
  )
  with check (
    empresa_id = (select public.current_empresa_id())
    and ((select public.is_admin_or_gestor()) or responsavel_id = (select auth.uid()))
    and (
      projeto_id is null
      or exists (
        select 1 from public.projetos p
        where p.id = demandas.projeto_id and p.empresa_id = (select public.current_empresa_id())
      )
    )
    and (
      responsavel_id is null
      or exists (
        select 1 from public.profiles r
        where r.id = demandas.responsavel_id
          and r.empresa_id = (select public.current_empresa_id())
          and r.role <> 'cliente'
      )
    )
  );

alter policy "demandas_delete_admin" on public.demandas
  using ((select public.is_admin_or_gestor()) and empresa_id = (select public.current_empresa_id()));

-- gestor edita como admin (título, responsável, prazo etc). Só colaborador
-- fica restrito a status — cliente nem chega aqui, porque
-- demandas_update.using já barra antes do trigger disparar.
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

  if not public.is_admin_or_gestor() then
    if new.titulo is distinct from old.titulo
      or new.descricao is distinct from old.descricao
      or new.responsavel_id is distinct from old.responsavel_id
      or new.prioridade is distinct from old.prioridade
      or new.prazo is distinct from old.prazo
      or new.projeto_id is distinct from old.projeto_id
      or new.link_entrega is distinct from old.link_entrega
      or new.criado_por is distinct from old.criado_por
    then
      raise exception 'Apenas administradores e gestores podem editar esses campos. Demais perfis só podem atualizar o status.';
    end if;
  end if;
  return new;
end;
$$;

-- --- 7. comentarios / registros_tempo: gestor = admin; cliente sem acesso -
-- Deliberado: nenhuma cláusula pra is_cliente() aqui — tempo trabalhado e
-- comentários internos não são pra visualizador externo ver.

alter policy "comentarios_select" on public.comentarios
  using (
    exists (
      select 1 from public.demandas d
      where d.id = comentarios.demanda_id
        and d.empresa_id = (select public.current_empresa_id())
        and ((select public.is_admin_or_gestor()) or d.responsavel_id = (select auth.uid()))
    )
  );

alter policy "comentarios_insert" on public.comentarios
  with check (
    autor_id = (select auth.uid())
    and exists (
      select 1 from public.demandas d
      where d.id = comentarios.demanda_id
        and d.empresa_id = (select public.current_empresa_id())
        and ((select public.is_admin_or_gestor()) or d.responsavel_id = (select auth.uid()))
    )
  );

alter policy "registros_tempo_select" on public.registros_tempo
  using (
    exists (
      select 1 from public.demandas d
      where d.id = registros_tempo.demanda_id
        and d.empresa_id = (select public.current_empresa_id())
        and ((select public.is_admin_or_gestor()) or d.responsavel_id = (select auth.uid()))
    )
  );

alter policy "registros_tempo_insert" on public.registros_tempo
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.demandas d
      where d.id = registros_tempo.demanda_id
        and d.empresa_id = (select public.current_empresa_id())
        and ((select public.is_admin_or_gestor()) or d.responsavel_id = (select auth.uid()))
    )
  );

-- profiles_insert_admin / profiles_update_admin / profiles_delete_admin:
-- NÃO alteradas de propósito. Continuam checando só is_admin() — gestor
-- não cria, edita, promove nem remove conta de ninguém, nem mesmo conta de
-- cliente. Essa é a fronteira de segurança pedida: só Administrador mexe
-- em contas de acesso.
