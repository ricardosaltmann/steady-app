-- ==============================================================================
-- STEADY PROTOCOL TRACKER - MIGRATION 003: SECURE ROLES & ADMIN AUTHORIZATION
-- Eliminação de whitelists de email, recursão e autorização via substring
-- ==============================================================================

-- 1. TABELA DE ROLES DE USUÁRIOS
create table if not exists public.user_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('admin', 'clinical_staff', 'user')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- 2. FUNÇÃO SECURITY DEFINER PARA CHECAGEM DE ADMIN (SEM RECURSÃO)
create or replace function public.is_admin(user_uid uuid default auth.uid())
returns boolean as $$
begin
  if user_uid is null then
    return false;
  end if;
  return exists (
    select 1 from public.user_roles
    where user_id = user_uid and role = 'admin'
  );
end;
$$ language plpgsql security definer stable;

-- 3. SEED DE ADMINS EXISTENTES (Migração limpa a partir de profiles.is_admin)
insert into public.user_roles (user_id, role)
select id, 'admin' from public.profiles
where is_admin = true
on conflict (user_id, role) do nothing;

-- 4. POLÍTICAS RLS PARA USER_ROLES
drop policy if exists "Usuário visualiza suas próprias roles" on public.user_roles;
create policy "Usuário visualiza suas próprias roles"
  on public.user_roles for select
  using ( auth.uid() = user_id or public.is_admin() );

-- 5. ATUALIZAÇÃO DO TRIGGER DE NOVO USUÁRIO (SEM EMAILS HARDCODED)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, name, email, phone, age, gender, selected_categories, therapeutic_goal, is_admin
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    case when new.raw_user_meta_data->>'age' is not null and new.raw_user_meta_data->>'age' != '' then (new.raw_user_meta_data->>'age')::numeric else null end,
    coalesce(new.raw_user_meta_data->>'gender', 'male'),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'selected_categories', '["peptide","steroid"]'::jsonb))),
      array['peptide', 'steroid']
    ),
    coalesce(new.raw_user_meta_data->>'therapeutic_goal', 'male_trt'),
    false -- Nenhum usuário recebe admin automaticamente por email
  )
  on conflict (id) do update set
    name = coalesce(excluded.name, profiles.name),
    phone = coalesce(excluded.phone, profiles.phone),
    age = coalesce(excluded.age, profiles.age),
    gender = coalesce(excluded.gender, profiles.gender),
    updated_at = now();

  -- Atribuir role padrão 'user'
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$ language plpgsql security definer;
