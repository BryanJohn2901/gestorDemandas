-- ============================================================================
-- Migração 006: hardening + performance (achados do Supabase advisor)
--
-- Já aplicada em produção via MCP (mcp__supabase__apply_migration). Este
-- arquivo é só o registro local, pra manter schema.sql/migrations em sincronia
-- com o banco.
-- ============================================================================

alter function public.set_updated_at() set search_path = public;

revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.enforce_demanda_update_scope() from anon, authenticated;
revoke execute on function public.set_updated_at() from anon, authenticated;

revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_master() from anon;
revoke execute on function public.current_empresa_id() from anon;
revoke execute on function public.log_evento(text) from anon;
revoke execute on function public.touch_last_seen() from anon;

create index if not exists comentarios_autor_id_idx on public.comentarios (autor_id);
create index if not exists demandas_criado_por_idx on public.demandas (criado_por);

-- RLS: (select auth.<fn>()) em vez de auth.<fn>() direto — evita reavaliar
-- por linha (achado do advisor de performance auth_rls_initplan). Mesma
-- lógica de cada policy, só a forma de chamar as funções muda.

drop policy "profiles_select" on public.profiles;
create policy "profiles_select"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or empresa_id = (select public.current_empresa_id()));

drop policy "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin"
  on public.profiles for insert
  to authenticated
  with check ((select public.is_admin()) and empresa_id = (select public.current_empresa_id()));

drop policy "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using ((select public.is_admin()) and empresa_id = (select public.current_empresa_id()));

drop policy "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
  on public.profiles for delete
  to authenticated
  using ((select public.is_admin()) and empresa_id = (select public.current_empresa_id()));

drop policy "demandas_select" on public.demandas;
create policy "demandas_select"
  on public.demandas for select
  to authenticated
  using (
    empresa_id = (select public.current_empresa_id())
    and ((select public.is_admin()) or responsavel_id = (select auth.uid()))
  );

drop policy "demandas_insert_admin" on public.demandas;
create policy "demandas_insert_admin"
  on public.demandas for insert
  to authenticated
  with check ((select public.is_admin()) and empresa_id = (select public.current_empresa_id()));

drop policy "demandas_update" on public.demandas;
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

drop policy "demandas_delete_admin" on public.demandas;
create policy "demandas_delete_admin"
  on public.demandas for delete
  to authenticated
  using ((select public.is_admin()) and empresa_id = (select public.current_empresa_id()));

drop policy "comentarios_select" on public.comentarios;
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

drop policy "comentarios_insert" on public.comentarios;
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

drop policy "empresas_select_master" on public.empresas;
create policy "empresas_select_master"
  on public.empresas for select
  to authenticated
  using ((select public.is_master()));

drop policy "empresas_insert_master" on public.empresas;
create policy "empresas_insert_master"
  on public.empresas for insert
  to authenticated
  with check ((select public.is_master()));

drop policy "empresas_update_master" on public.empresas;
create policy "empresas_update_master"
  on public.empresas for update
  to authenticated
  using ((select public.is_master()));

drop policy "empresas_delete_master" on public.empresas;
create policy "empresas_delete_master"
  on public.empresas for delete
  to authenticated
  using ((select public.is_master()));

drop policy "eventos_uso_select_master" on public.eventos_uso;
create policy "eventos_uso_select_master"
  on public.eventos_uso for select
  to authenticated
  using ((select public.is_master()));
