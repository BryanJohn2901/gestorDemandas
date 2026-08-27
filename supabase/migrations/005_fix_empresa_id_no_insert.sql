-- ============================================================================
-- Migração 005: corrige criação de usuário (bug real, quebrava desde o
-- multi-tenant — nunca tinha sido testado criar empresa/colaborador nova)
--
-- profiles_empresa_id_by_role checa na hora do INSERT, dentro do trigger
-- handle_new_user(). Antes dessa correção, empresa_id só era preenchido num
-- UPDATE depois do createUser() — tarde demais, o INSERT já falhava com
-- "Database error creating new user" pra qualquer role != master.
--
-- Rode este arquivo no SQL Editor do Supabase (uma vez).
-- ============================================================================

create or replace function public.handle_new_user()
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
