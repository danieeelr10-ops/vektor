-- =============================================
-- VEKTOR TRAINING — Supabase SQL Schema v2
-- Ejecuta esto en el SQL Editor de Supabase
-- =============================================

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text,
  role text not null check (role in ('coach', 'athlete')),
  sport text default 'General',
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role, sport)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'athlete'),
    coalesce(new.raw_user_meta_data->>'sport', 'General')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.routines (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  sport text default 'General',
  description text,
  created_at timestamptz default now()
);

create table public.sessions (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references public.profiles(id) on delete cascade,
  athlete_id uuid references public.profiles(id) on delete cascade,
  routine_id uuid references public.routines(id) on delete set null,
  date date not null,
  notes text,
  completed boolean default false,
  rpe text,
  duration text,
  log_notes text,
  created_at timestamptz default now()
);

create table public.metrics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  date date not null,
  weight numeric,
  body_fat numeric,
  muscle_pct numeric,
  water_pct numeric,
  imc numeric,
  body_age numeric,
  arm_r numeric,
  arm_l numeric,
  arm_r_flex numeric,
  arm_l_flex numeric,
  leg_r numeric,
  leg_l numeric,
  waist numeric,
  goal text default 'Ganar músculo',
  note text,
  created_at timestamptz default now()
);

create table public.rm_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  exercise text not null,
  weight numeric not null,
  reps integer default 1,
  note text,
  date date not null,
  created_at timestamptz default now()
);

-- =============================================
-- Row Level Security
-- =============================================

alter table public.profiles enable row level security;
alter table public.routines enable row level security;
alter table public.sessions enable row level security;
alter table public.metrics enable row level security;
alter table public.rm_records enable row level security;

create policy "Usuarios ven perfiles" on public.profiles for select using (true);
create policy "Insertar perfil propio" on public.profiles for insert with check (auth.uid() = id);
create policy "Actualizar perfil propio" on public.profiles for update using (auth.uid() = id);

create policy "Coach gestiona sus rutinas" on public.routines for all using (coach_id = auth.uid());
create policy "Atleta ve rutinas asignadas" on public.routines for select using (
  exists (select 1 from public.sessions s where s.routine_id = routines.id and s.athlete_id = auth.uid())
);

create policy "Coach gestiona sesiones" on public.sessions for all using (coach_id = auth.uid());
create policy "Atleta ve sus sesiones" on public.sessions for select using (athlete_id = auth.uid());
create policy "Atleta actualiza sus sesiones" on public.sessions for update using (athlete_id = auth.uid());

create policy "Usuario gestiona sus metricas" on public.metrics for all using (user_id = auth.uid());
create policy "Coach ve metricas de atletas" on public.metrics for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach')
);

create policy "Usuario gestiona sus RM" on public.rm_records for all using (user_id = auth.uid());
create policy "Coach ve RM de atletas" on public.rm_records for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach')
);
