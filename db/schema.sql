-- ============================================================================
-- BLOQUE — Esquema de base de datos (PostgreSQL / Supabase)
-- Proyecto Supabase: "Organizador" (ref: sehvjozffzbqeyaatwqn)
-- ----------------------------------------------------------------------------
-- Este archivo es el registro fiel de la base de datos creada vía MCP.
-- Las políticas RLS están en db/policies.sql.
-- Orden de aplicación: helpers + profiles -> days -> blocks -> breaks.
-- ============================================================================

-- ─── Funciones auxiliares ───────────────────────────────────────────────────

-- Mantiene updated_at al día en cada UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Crea automáticamente un perfil cuando se registra un usuario nuevo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

-- Las funciones de trigger no se exponen como RPC.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- ─── Tabla: profiles ────────────────────────────────────────────────────────
-- Un perfil por usuario de auth. Preferencias de trabajo y notificación.
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text not null default '',
  work_window_start time not null default '09:00',
  work_window_end   time not null default '18:00',
  active_days       int[] not null default '{1,2,3,4,5}',   -- 0=Dom .. 6=Sáb
  notif_prefs       jsonb not null default
    '{"first_block":true,"segment_change":true,"day_close":false,"sound":true}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint profiles_work_window_valid check (work_window_start < work_window_end)
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Trigger sobre auth.users: crea el perfil al registrarse.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Tabla: days ────────────────────────────────────────────────────────────
-- Un plan de día por usuario y fecha. status describe el ciclo de vida.
create table public.days (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null,
  status       text not null default 'planning'
                 check (status in ('planning','ready','in_progress','closed')),
  summary_note text,                       -- observación generada por la IA
  closed_at    timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, date)
);

create index days_user_id_idx   on public.days(user_id);
create index days_user_date_idx on public.days(user_id, date);

-- ─── Tabla: blocks ──────────────────────────────────────────────────────────
-- Cada bloque de trabajo de un día. segment_plan guarda la salida de Groq.
create table public.blocks (
  id              uuid primary key default gen_random_uuid(),
  day_id          uuid not null references public.days(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  position        int not null default 0,                 -- orden cronológico
  title           text not null check (char_length(title) between 1 and 200),
  work_type       text not null,                          -- ver domain/workTypes.js
  duration_min    int not null check (duration_min between 5 and 480),
  scheduled_start time,
  scheduled_end   time,
  status          text not null default 'pending'
                    check (status in ('pending','active','done','skipped')),
  segment_plan    jsonb not null default '{"segments":[]}'::jsonb,
  actual_work_sec int not null default 0 check (actual_work_sec >= 0),
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index blocks_day_id_idx  on public.blocks(day_id);
create index blocks_user_id_idx on public.blocks(user_id);

-- ─── Tabla: breaks ──────────────────────────────────────────────────────────
-- Un registro por microdescanso planeado. Mide respetados vs saltados.
create table public.breaks (
  id            uuid primary key default gen_random_uuid(),
  block_id      uuid not null references public.blocks(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  segment_index int not null check (segment_index >= 0),
  activity      text not null,
  rationale     text,
  duration_sec  int not null check (duration_sec between 0 and 3600),
  status        text not null default 'pending'
                  check (status in ('pending','respected','skipped')),
  occurred_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index breaks_block_id_idx on public.breaks(block_id);
create index breaks_user_id_idx  on public.breaks(user_id);

-- ─── Forma del JSON de segment_plan ─────────────────────────────────────────
-- {
--   "segments": [
--     { "index": 0, "kind": "work",  "duration_min": 25 },
--     { "index": 1, "kind": "break", "duration_min": 5,
--       "activity": "Estiramiento cervical",
--       "rationale": "Libera tensión postural del cuello tras trabajo sentado." },
--     ...
--   ]
-- }
