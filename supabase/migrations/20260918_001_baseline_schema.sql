-- ==============================================================================
-- STEADY PROTOCOL TRACKER - MIGRATION 001: BASELINE SCHEMA
-- Criação canônica das tabelas e índices básicos
-- ==============================================================================

-- 1. TABELA DE PERFIS DE USUÁRIOS
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text,
  phone text,
  age numeric,
  gender text default 'male',
  birth_date date,
  height_cm numeric,
  weight_kg numeric,
  target_weight_kg numeric,
  body_fat_percent numeric,
  goal text,
  activity_level text default 'moderate',
  marketing_consent boolean default true,
  selected_categories text[] default array['peptide', 'steroid'],
  therapeutic_goal text default 'male_trt',
  is_admin boolean default false,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- 2. TABELA DE INJEÇÕES / APLICAÇÕES
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
create index if not exists idx_protocols_user_created on public.protocols (user_id, created_at desc);

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
create index if not exists idx_labs_user_date on public.labs (user_id, date desc);

-- 5. TABELA DE SINTOMAS & BIOMETRIA
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
  height_cm numeric,
  body_fat_percent numeric,
  water_ml numeric,
  waist_cm numeric,
  hip_cm numeric,
  arm_cm numeric,
  thigh_cm numeric,
  chest_cm numeric,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.symptoms enable row level security;
create index if not exists idx_symptoms_user_date on public.symptoms (user_id, date desc);

-- 6. TABELA DE HIDRATAÇÃO
create table if not exists public.water_logs (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  time text not null,
  amount_ml numeric not null,
  target_ml numeric default 2500,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.water_logs enable row level security;
create index if not exists idx_water_logs_user_date on public.water_logs (user_id, date desc);

-- 7. TABELA DE COMPOSTOS GLOBAIS
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
