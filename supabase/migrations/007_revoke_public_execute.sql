-- ============================================================================
-- Migração 007: revoga EXECUTE de PUBLIC nas funções internas
--
-- O revoke da 006 (de anon/authenticated) não bastou: Postgres concede
-- EXECUTE a PUBLIC por padrão em função nova, e anon/authenticated herdam
-- disso independente de grant direto. Revoga de PUBLIC e regrant explícito
-- só onde authenticated precisa de verdade (RLS interno + chamadas via
-- supabase.rpc()).
--
-- Já aplicada em produção via MCP (mcp__supabase__apply_migration).
-- ============================================================================

revoke execute on function public.is_admin() from public;
revoke execute on function public.is_master() from public;
revoke execute on function public.current_empresa_id() from public;
revoke execute on function public.log_evento(text) from public;
revoke execute on function public.touch_last_seen() from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.enforce_demanda_update_scope() from public;
revoke execute on function public.set_updated_at() from public;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_master() to authenticated;
grant execute on function public.current_empresa_id() to authenticated;
grant execute on function public.log_evento(text) to authenticated;
grant execute on function public.touch_last_seen() to authenticated;
-- handle_new_user/enforce_demanda_update_scope/set_updated_at são
-- trigger-only: o Postgres dispara o trigger sem checar EXECUTE do papel
-- que fez o DML, então não precisam de nenhum grant pra role nenhuma.
