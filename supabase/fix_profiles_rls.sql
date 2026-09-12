-- FIX RLS INFINITE RECURSION FOR PROFILES
drop policy if exists "Usuários podem ver seu próprio perfil" on public.profiles;
drop policy if exists "Usuários podem atualizar seu próprio perfil" on public.profiles;
drop policy if exists "Usuários podem inserir seu próprio perfil" on public.profiles;

-- Políticas sem recursão
create policy "Usuários podem ver seu próprio perfil"
  on public.profiles for select
  using ( auth.uid() = id or (auth.jwt()->>'email' ilike 'admin%') );

create policy "Usuários podem atualizar seu próprio perfil"
  on public.profiles for update
  using ( auth.uid() = id );

create policy "Usuários podem inserir seu próprio perfil"
  on public.profiles for insert
  with check ( auth.uid() = id );
