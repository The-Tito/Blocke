-- ============================================================================
-- BLOQUE — Políticas Row Level Security (RLS)
-- ----------------------------------------------------------------------------
-- TODAS las tablas tienen RLS habilitado y forzado (force row level security),
-- de modo que ni siquiera el dueño de la tabla puede saltarse las políticas.
-- Regla única: cada usuario solo accede a SUS propias filas.
-- Esto es lo que hace seguro exponer la anon key en el cliente.
-- ============================================================================

-- ─── profiles ───────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.profiles force  row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- Sin política DELETE: el perfil se borra en cascada al eliminar el usuario.

-- ─── days ───────────────────────────────────────────────────────────────────
alter table public.days enable row level security;
alter table public.days force  row level security;

create policy "days_select_own" on public.days
  for select using (auth.uid() = user_id);
create policy "days_insert_own" on public.days
  for insert with check (auth.uid() = user_id);
create policy "days_update_own" on public.days
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "days_delete_own" on public.days
  for delete using (auth.uid() = user_id);

-- ─── blocks ─────────────────────────────────────────────────────────────────
alter table public.blocks enable row level security;
alter table public.blocks force  row level security;

create policy "blocks_select_own" on public.blocks
  for select using (auth.uid() = user_id);
create policy "blocks_insert_own" on public.blocks
  for insert with check (auth.uid() = user_id);
create policy "blocks_update_own" on public.blocks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "blocks_delete_own" on public.blocks
  for delete using (auth.uid() = user_id);

-- ─── breaks ─────────────────────────────────────────────────────────────────
alter table public.breaks enable row level security;
alter table public.breaks force  row level security;

create policy "breaks_select_own" on public.breaks
  for select using (auth.uid() = user_id);
create policy "breaks_insert_own" on public.breaks
  for insert with check (auth.uid() = user_id);
create policy "breaks_update_own" on public.breaks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "breaks_delete_own" on public.breaks
  for delete using (auth.uid() = user_id);
