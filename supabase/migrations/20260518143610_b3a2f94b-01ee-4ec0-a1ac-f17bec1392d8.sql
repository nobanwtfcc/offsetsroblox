
-- Roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users can view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

create policy "admins can view all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- First signup becomes admin, others become user
create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.user_roles where role = 'admin') into is_first;
  insert into public.user_roles (user_id, role)
  values (new.id, case when is_first then 'admin'::app_role else 'user'::app_role end);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user_role();

-- Offsets
create table public.offsets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  category text not null default 'General',
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index offsets_category_idx on public.offsets(category);
create index offsets_name_idx on public.offsets(name);

alter table public.offsets enable row level security;

create policy "anyone can view offsets" on public.offsets
  for select using (true);

create policy "admins can insert offsets" on public.offsets
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));

create policy "admins can update offsets" on public.offsets
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "admins can delete offsets" on public.offsets
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger offsets_touch
  before update on public.offsets
  for each row execute function public.touch_updated_at();
