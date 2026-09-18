-- ==============================================================================
-- STEADY PROTOCOL TRACKER - MIGRATION 002: PROTOCOL & CLINICAL COLUMNS
-- Alinhamento das colunas usadas na aplicação e suporte a soft-delete/sync
-- ==============================================================================

-- 1. PROTOCOLS: colunas de dosagem, administração, reconstituição e sincronização
alter table public.protocols add column if not exists route text default 'IM';
alter table public.protocols add column if not exists interval_days numeric;
alter table public.protocols add column if not exists unit text default 'mg';
alter table public.protocols add column if not exists vial_mg numeric;
alter table public.protocols add column if not exists water_ml numeric;
alter table public.protocols add column if not exists concentration_mg_ml numeric;
alter table public.protocols add column if not exists syringe_units numeric;
alter table public.protocols add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());
alter table public.protocols add column if not exists deleted_at timestamp with time zone;
alter table public.protocols add column if not exists sync_version bigint default 1;

-- 2. SYMPTOMS: suporte a glicose (Health Connect), soft-delete e sync
alter table public.symptoms add column if not exists glucose_mg_dl numeric;
alter table public.symptoms add column if not exists deleted_at timestamp with time zone;
alter table public.symptoms add column if not exists sync_version bigint default 1;

-- 3. INJECTIONS: suporte a updated_at, soft-delete e sync
alter table public.injections add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());
alter table public.injections add column if not exists deleted_at timestamp with time zone;
alter table public.injections add column if not exists sync_version bigint default 1;

-- 4. LABS: suporte a updated_at, soft-delete e sync
alter table public.labs add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());
alter table public.labs add column if not exists deleted_at timestamp with time zone;
alter table public.labs add column if not exists sync_version bigint default 1;

-- 5. WATER LOGS: suporte a updated_at, soft-delete e sync
alter table public.water_logs add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());
alter table public.water_logs add column if not exists deleted_at timestamp with time zone;
alter table public.water_logs add column if not exists sync_version bigint default 1;

-- Índices para exclusão lógica e busca otimizada de dados ativos
create index if not exists idx_protocols_active_sync on public.protocols (user_id, deleted_at) where deleted_at is null;
create index if not exists idx_injections_active_sync on public.injections (user_id, deleted_at) where deleted_at is null;
create index if not exists idx_symptoms_active_sync on public.symptoms (user_id, deleted_at) where deleted_at is null;
create index if not exists idx_labs_active_sync on public.labs (user_id, deleted_at) where deleted_at is null;
create index if not exists idx_water_logs_active_sync on public.water_logs (user_id, deleted_at) where deleted_at is null;
