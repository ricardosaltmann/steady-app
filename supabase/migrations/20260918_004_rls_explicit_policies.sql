-- ==============================================================================
-- STEADY PROTOCOL TRACKER - MIGRATION 004: EXPLICIT RLS POLICIES
-- Remoção de auth.jwt()->>'email' ilike 'admin%' e implementação de RLS estrita
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PROFILES
-- ------------------------------------------------------------------------------
drop policy if exists "Usuários podem ver seu próprio perfil" on public.profiles;
drop policy if exists "Usuários podem atualizar seu próprio perfil" on public.profiles;
drop policy if exists "Usuários podem inserir seu próprio perfil" on public.profiles;
drop policy if exists "profiles_select_policy" on public.profiles;
drop policy if exists "profiles_insert_policy" on public.profiles;
drop policy if exists "profiles_update_policy" on public.profiles;

create policy "profiles_select_policy"
  on public.profiles for select
  using ( auth.uid() = id or public.is_admin() );

create policy "profiles_insert_policy"
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "profiles_update_policy"
  on public.profiles for update
  using ( auth.uid() = id or public.is_admin() )
  with check ( auth.uid() = id or public.is_admin() );

-- ------------------------------------------------------------------------------
-- 2. PROTOCOLS
-- ------------------------------------------------------------------------------
drop policy if exists "Usuários gerenciam seus próprios protocolos" on public.protocols;
drop policy if exists "protocols_select" on public.protocols;
drop policy if exists "protocols_insert" on public.protocols;
drop policy if exists "protocols_update" on public.protocols;
drop policy if exists "protocols_delete" on public.protocols;

create policy "protocols_select"
  on public.protocols for select
  using ( auth.uid() = user_id or public.is_admin() );

create policy "protocols_insert"
  on public.protocols for insert
  with check ( auth.uid() = user_id );

create policy "protocols_update"
  on public.protocols for update
  using ( auth.uid() = user_id or public.is_admin() )
  with check ( auth.uid() = user_id or public.is_admin() );

create policy "protocols_delete"
  on public.protocols for delete
  using ( auth.uid() = user_id or public.is_admin() );

-- ------------------------------------------------------------------------------
-- 3. INJECTIONS
-- ------------------------------------------------------------------------------
drop policy if exists "Usuários gerenciam suas próprias injeções" on public.injections;
drop policy if exists "injections_select" on public.injections;
drop policy if exists "injections_insert" on public.injections;
drop policy if exists "injections_update" on public.injections;
drop policy if exists "injections_delete" on public.injections;

create policy "injections_select"
  on public.injections for select
  using ( auth.uid() = user_id or public.is_admin() );

create policy "injections_insert"
  on public.injections for insert
  with check ( auth.uid() = user_id );

create policy "injections_update"
  on public.injections for update
  using ( auth.uid() = user_id or public.is_admin() )
  with check ( auth.uid() = user_id or public.is_admin() );

create policy "injections_delete"
  on public.injections for delete
  using ( auth.uid() = user_id or public.is_admin() );

-- ------------------------------------------------------------------------------
-- 4. LABS
-- ------------------------------------------------------------------------------
drop policy if exists "Usuários gerenciam seus próprios exames" on public.labs;
drop policy if exists "labs_select" on public.labs;
drop policy if exists "labs_insert" on public.labs;
drop policy if exists "labs_update" on public.labs;
drop policy if exists "labs_delete" on public.labs;

create policy "labs_select"
  on public.labs for select
  using ( auth.uid() = user_id or public.is_admin() );

create policy "labs_insert"
  on public.labs for insert
  with check ( auth.uid() = user_id );

create policy "labs_update"
  on public.labs for update
  using ( auth.uid() = user_id or public.is_admin() )
  with check ( auth.uid() = user_id or public.is_admin() );

create policy "labs_delete"
  on public.labs for delete
  using ( auth.uid() = user_id or public.is_admin() );

-- ------------------------------------------------------------------------------
-- 5. SYMPTOMS & BIOMETRIA
-- ------------------------------------------------------------------------------
drop policy if exists "Usuários gerenciam seus próprios sintomas" on public.symptoms;
drop policy if exists "symptoms_select" on public.symptoms;
drop policy if exists "symptoms_insert" on public.symptoms;
drop policy if exists "symptoms_update" on public.symptoms;
drop policy if exists "symptoms_delete" on public.symptoms;

create policy "symptoms_select"
  on public.symptoms for select
  using ( auth.uid() = user_id or public.is_admin() );

create policy "symptoms_insert"
  on public.symptoms for insert
  with check ( auth.uid() = user_id );

create policy "symptoms_update"
  on public.symptoms for update
  using ( auth.uid() = user_id or public.is_admin() )
  with check ( auth.uid() = user_id or public.is_admin() );

create policy "symptoms_delete"
  on public.symptoms for delete
  using ( auth.uid() = user_id or public.is_admin() );

-- ------------------------------------------------------------------------------
-- 6. WATER LOGS
-- ------------------------------------------------------------------------------
drop policy if exists "Usuários gerenciam seus próprios registros de hidratação" on public.water_logs;
drop policy if exists "water_logs_select" on public.water_logs;
drop policy if exists "water_logs_insert" on public.water_logs;
drop policy if exists "water_logs_update" on public.water_logs;
drop policy if exists "water_logs_delete" on public.water_logs;

create policy "water_logs_select"
  on public.water_logs for select
  using ( auth.uid() = user_id or public.is_admin() );

create policy "water_logs_insert"
  on public.water_logs for insert
  with check ( auth.uid() = user_id );

create policy "water_logs_update"
  on public.water_logs for update
  using ( auth.uid() = user_id or public.is_admin() )
  with check ( auth.uid() = user_id or public.is_admin() );

create policy "water_logs_delete"
  on public.water_logs for delete
  using ( auth.uid() = user_id or public.is_admin() );

-- ------------------------------------------------------------------------------
-- 7. GLOBAL COMPOUNDS
-- ------------------------------------------------------------------------------
drop policy if exists "Todos os usuários autenticados podem ver compostos globais" on public.global_compounds;
drop policy if exists "Apenas administradores podem modificar compostos globais" on public.global_compounds;

create policy "global_compounds_select"
  on public.global_compounds for select
  using ( auth.role() = 'authenticated' );

create policy "global_compounds_admin_write"
  on public.global_compounds for all
  using ( public.is_admin() )
  with check ( public.is_admin() );
