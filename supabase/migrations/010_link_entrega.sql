-- ============================================================================
-- Migração 010: link de entrega na demanda (Drive, Milanote etc.)
--
-- Já aplicada em produção via MCP (mcp__supabase__apply_migration). Este
-- arquivo é só o registro local, pra manter schema.sql/migrations em
-- sincronia com o banco.
-- ============================================================================

alter table public.demandas add column link_entrega text;
comment on column public.demandas.link_entrega is 'Link (Drive, Milanote etc.) onde o responsável deve entregar o resultado da demanda.';
