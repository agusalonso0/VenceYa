-- VenceYa: esquema inicial para Supabase
-- Ejecutá este archivo en Supabase > SQL Editor > New query.

create extension if not exists "pgcrypto";

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  amount numeric(14,2) not null check (amount > 0),
  due_date date not null,
  category text not null default 'Otros'
    check (category in ('Servicios','Vivienda','Tarjetas','Impuestos','Seguros','Suscripciones','Otros')),
  notes text,
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists bills_user_due_date_idx on public.bills(user_id, due_date);
create index if not exists bills_user_paid_idx on public.bills(user_id, paid);

alter table public.bills enable row level security;

drop policy if exists "Users can read their own bills" on public.bills;
create policy "Users can read their own bills"
  on public.bills for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own bills" on public.bills;
create policy "Users can insert their own bills"
  on public.bills for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own bills" on public.bills;
create policy "Users can update their own bills"
  on public.bills for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own bills" on public.bills;
create policy "Users can delete their own bills"
  on public.bills for delete to authenticated
  using (auth.uid() = user_id);

-- Nota: la clave anon/public de Supabase puede estar en el frontend.
-- Nunca agregues una service_role key al código del navegador.
