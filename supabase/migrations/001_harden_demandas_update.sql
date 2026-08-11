-- ============================================================================
-- Hardening: impede que um colaborador altere qualquer coisa além do status
-- em uma demanda dele, mesmo chamando a API do Supabase diretamente (sem
-- passar pelo app). RLS por si só só controla QUAIS LINHAS um papel pode
-- tocar — não QUAIS COLUNAS. Este trigger cobre essa lacuna.
--
-- Rode este arquivo no SQL Editor do Supabase (uma vez).
-- ============================================================================

create or replace function public.enforce_demanda_update_scope()
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

drop trigger if exists enforce_demanda_update_scope on public.demandas;

create trigger enforce_demanda_update_scope
  before update on public.demandas
  for each row execute function public.enforce_demanda_update_scope();
