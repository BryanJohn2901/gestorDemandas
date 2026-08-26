-- ============================================================================
-- Migração 003: permite master excluir empresa
--
-- Rode este arquivo no SQL Editor do Supabase (uma vez).
-- ============================================================================

create policy "empresas_delete_master"
  on public.empresas for delete
  to authenticated
  using (public.is_master());
