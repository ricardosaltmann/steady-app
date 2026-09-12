-- ==============================================================================
-- STEADY PROTOCOL TRACKER - SUPABASE DATABASE SCHEMA & RLS
-- Cole este script no SQL Editor do seu projeto Supabase (supabase.com)
-- ==============================================================================

-- 1. TABELA DE PERFIS DE USUÁRIOS
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text,
  therapeutic_goal text default 'male_trt',
  is_admin boolean default false,
  birth_date date,
  weight_kg numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS em profiles
alter table public.profiles enable row level security;

-- Políticas para profiles
create policy "Usuários podem ver seu próprio perfil"
  on public.profiles for select
  using ( auth.uid() = id or (select is_admin from public.profiles where id = auth.uid()) = true );

create policy "Usuários podem atualizar seu próprio perfil"
  on public.profiles for update
  using ( auth.uid() = id );

create policy "Usuários podem inserir seu próprio perfil"
  on public.profiles for insert
  with check ( auth.uid() = id );

-- 2. TABELA DE INJEÇÕES
create table if not exists public.injections (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  compound_id text not null,
  date timestamp with time zone not null,
  dose numeric not null,
  volume_ml numeric,
  site text,
  route text,
  notes text,
  needle_info text,
  protocol_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.injections enable row level security;

create policy "Usuários gerenciam suas próprias injeções"
  on public.injections for all
  using ( auth.uid() = user_id );

create index if not exists idx_injections_user_date on public.injections (user_id, date desc);

-- 3. TABELA DE PROTOCOLOS
create table if not exists public.protocols (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  compound_id text not null,
  dose numeric not null,
  frequency text not null,
  days_of_week text[],
  times_per_day numeric,
  start_date date,
  active boolean default true,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.protocols enable row level security;

create policy "Usuários gerenciam seus próprios protocolos"
  on public.protocols for all
  using ( auth.uid() = user_id );

-- 4. TABELA DE EXAMES LABORATORIAIS
create table if not exists public.labs (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  lab_name text,
  notes text,
  markers jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.labs enable row level security;

create policy "Usuários gerenciam seus próprios exames"
  on public.labs for all
  using ( auth.uid() = user_id );

-- 5. TABELA DE SINTOMAS & BEM-ESTAR
create table if not exists public.symptoms (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  energy int,
  libido int,
  mood int,
  sleep int,
  acne int,
  water_retention int,
  blood_pressure_systolic int,
  blood_pressure_diastolic int,
  weight_kg numeric,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.symptoms enable row level security;

create policy "Usuários gerenciam seus próprios sintomas"
  on public.symptoms for all
  using ( auth.uid() = user_id );

-- 6. TABELA DE COMPOSTOS GLOBAIS (Gerenciados pelo Admin)
create table if not exists public.global_compounds (
  id text primary key,
  name text not null,
  category text not null,
  subcategory text,
  half_life_days numeric not null,
  absorption_rate numeric,
  elimination_rate numeric,
  default_concentration numeric,
  concentration_unit text,
  unit text default 'mg',
  clinical_peak_hours numeric,
  clinical_scale_factor numeric,
  color text,
  description text,
  is_custom boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.global_compounds enable row level security;

create policy "Todos os usuários autenticados podem ver compostos globais"
  on public.global_compounds for select
  using ( auth.role() = 'authenticated' );

create policy "Apenas administradores podem modificar compostos globais"
  on public.global_compounds for all
  using ( (select is_admin from public.profiles where id = auth.uid()) = true );

-- 7. TRIGGER AUTOMÁTICO: Criação de Perfil no Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, therapeutic_goal, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'therapeutic_goal', 'male_trt'),
    case when new.email = 'admin@steady.app' then true else false end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Associar trigger ao auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
