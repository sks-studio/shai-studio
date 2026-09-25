-- Shai Studios — initial schema for shaistudiodb
-- Mirrors the localStorage model in app.js: clients, projects, invoices, enquiries,
-- quote requests, site content (services, work, posts, products), store orders,
-- app users/roles and an audit trail.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- roles & profiles
do $$ begin
  create type app_role as enum ('superadmin','admin','manager','staff','client');
exception when duplicate_object then null; end $$;

create table if not exists public.clients (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  person       text,
  email        text,
  phone        text,
  service      text,
  status       text not null default 'Active'
                 check (status in ('Active','Onboarding','On Hold','Archived')),
  notes        text default '',
  created_at   timestamptz not null default now()
);

-- one row per authenticated user; id matches auth.users.id
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null unique,
  role        app_role not null default 'client',
  status      text not null default 'Active' check (status in ('Active','Suspended')),
  client_id   uuid references public.clients(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- true when the signed-in user holds one of the given roles
create or replace function public.has_role(roles app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'Active' and role = any(roles)
  );
$$;

-- the client record the signed-in user belongs to (null for staff)
create or replace function public.my_client_id()
returns uuid language sql stable security definer set search_path = public as $$
  select client_id from public.profiles where id = auth.uid();
$$;

-- new auth users get a profile automatically
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, role)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
          new.email,
          coalesce((new.raw_user_meta_data->>'role')::app_role, 'client'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- delivery
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  client_id   uuid references public.clients(id) on delete cascade,
  type        text,
  owner       text,
  deadline    date,
  progress    int not null default 0 check (progress between 0 and 100),
  status      text not null default 'Planning'
                check (status in ('Planning','In Progress','Review','Complete')),
  created_at  timestamptz not null default now()
);

create table if not exists public.invoices (
  id          uuid primary key default gen_random_uuid(),
  number      text not null unique,
  client_id   uuid references public.clients(id) on delete cascade,
  issue_date  date not null default current_date,
  due_date    date,
  terms       int not null default 14,
  items       jsonb not null default '[]'::jsonb,   -- [{desc, qty, rate}]
  status      text not null default 'Draft'
                check (status in ('Draft','Sent','Paid','Overdue')),
  notes       text,
  created_at  timestamptz not null default now()
);

-- totals computed in the database so the UI and the books cannot disagree
create or replace function public.invoice_subtotal(items jsonb)
returns numeric language sql immutable as $$
  select coalesce(sum((i->>'qty')::numeric * (i->>'rate')::numeric), 0)
  from jsonb_array_elements(items) i;
$$;

create or replace view public.invoice_totals as
  select id, client_id, number, status,
         public.invoice_subtotal(items)                as subtotal,
         round(public.invoice_subtotal(items) * 0.15, 2) as vat,
         round(public.invoice_subtotal(items) * 1.15, 2) as total
  from public.invoices;

-- ---------------------------------------------------------------- demand
create table if not exists public.enquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  type       text,
  budget     text,
  message    text,
  status     text not null default 'New'
               check (status in ('New','Contacted','Qualified','Lost')),
  created_at timestamptz not null default now()
);

-- answers captured by the public quote wizard
create table if not exists public.quote_requests (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references public.clients(id) on delete set null,
  name        text not null,
  email       text not null,
  phone       text,
  job_title   text,
  business    text,
  industry    text,
  website     text,
  size        text,
  location    text,
  services    text[] default '{}',
  goals       text[] default '{}',
  budget      text,
  start_when  text,
  brief       text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- site content
create table if not exists public.services (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  icon       text,
  blurb      text,
  items      text[] default '{}',
  image      text,
  sort_order int not null default 9
);

create table if not exists public.work (
  id         uuid primary key default gen_random_uuid(),
  client     text not null,
  service    text,
  result     text,
  tag        text,
  image      text,
  published  boolean not null default true
);

create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  slug       text unique,
  category   text,
  author     text,
  date       date not null default current_date,
  image      text,
  excerpt    text,
  body       text,
  published  boolean not null default false
);

create table if not exists public.products (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  category   text,
  price      numeric(10,2) not null default 0,
  blurb      text,
  image      text,
  badge      text,
  sort_order int not null default 9,
  published  boolean not null default true
);

create table if not exists public.site_copy (
  key   text primary key,
  value text
);

create table if not exists public.settings (
  key   text primary key,
  value text
);

-- ---------------------------------------------------------------- store
create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  number     text not null unique,
  name       text not null,
  email      text not null,
  items      jsonb not null default '[]'::jsonb,   -- [{id, name, price, qty}]
  total      numeric(10,2) not null default 0,
  status     text not null default 'Pending'
               check (status in ('Pending','Paid','Delivered','Refunded')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- audit
create table if not exists public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor      text,
  actor_role text,
  action     text not null,
  entity     text not null,
  label      text,
  detail     text,
  created_at timestamptz not null default now()
);

-- ================================================================ RLS
alter table public.clients        enable row level security;
alter table public.profiles       enable row level security;
alter table public.projects       enable row level security;
alter table public.invoices       enable row level security;
alter table public.enquiries      enable row level security;
alter table public.quote_requests enable row level security;
alter table public.services       enable row level security;
alter table public.work           enable row level security;
alter table public.posts          enable row level security;
alter table public.products       enable row level security;
alter table public.site_copy      enable row level security;
alter table public.settings       enable row level security;
alter table public.orders         enable row level security;
alter table public.audit_log      enable row level security;

-- public website: anyone may read published marketing content
create policy "public reads services"  on public.services  for select using (true);
create policy "public reads work"      on public.work      for select using (published);
create policy "public reads posts"     on public.posts     for select using (published);
create policy "public reads products"  on public.products  for select using (published);
create policy "public reads site copy" on public.site_copy for select using (true);
create policy "public reads settings"  on public.settings  for select using (true);

-- staff manage content
create policy "staff write services" on public.services for all
  using (public.has_role(array['superadmin','admin','manager']::app_role[]))
  with check (public.has_role(array['superadmin','admin','manager']::app_role[]));
create policy "staff write work" on public.work for all
  using (public.has_role(array['superadmin','admin','manager']::app_role[]))
  with check (public.has_role(array['superadmin','admin','manager']::app_role[]));
create policy "staff write posts" on public.posts for all
  using (public.has_role(array['superadmin','admin','manager']::app_role[]))
  with check (public.has_role(array['superadmin','admin','manager']::app_role[]));
create policy "staff write products" on public.products for all
  using (public.has_role(array['superadmin','admin','manager']::app_role[]))
  with check (public.has_role(array['superadmin','admin','manager']::app_role[]));
create policy "admin writes site copy" on public.site_copy for all
  using (public.has_role(array['superadmin','admin']::app_role[]))
  with check (public.has_role(array['superadmin','admin']::app_role[]));
create policy "admin writes settings" on public.settings for all
  using (public.has_role(array['superadmin','admin']::app_role[]))
  with check (public.has_role(array['superadmin','admin']::app_role[]));

-- profiles: you see yourself; admins see and manage everyone
create policy "read own profile" on public.profiles for select
  using (id = auth.uid() or public.has_role(array['superadmin','admin']::app_role[]));
create policy "admins manage profiles" on public.profiles for all
  using (public.has_role(array['superadmin','admin']::app_role[]))
  with check (public.has_role(array['superadmin','admin']::app_role[]));

-- clients / projects / invoices: staff see all, a client sees only their own
create policy "staff read clients" on public.clients for select
  using (public.has_role(array['superadmin','admin','manager','staff']::app_role[])
         or id = public.my_client_id());
create policy "staff write clients" on public.clients for all
  using (public.has_role(array['superadmin','admin','manager']::app_role[]))
  with check (public.has_role(array['superadmin','admin','manager']::app_role[]));

create policy "read projects" on public.projects for select
  using (public.has_role(array['superadmin','admin','manager','staff']::app_role[])
         or client_id = public.my_client_id());
create policy "staff write projects" on public.projects for all
  using (public.has_role(array['superadmin','admin','manager','staff']::app_role[]))
  with check (public.has_role(array['superadmin','admin','manager','staff']::app_role[]));

create policy "read invoices" on public.invoices for select
  using (public.has_role(array['superadmin','admin','manager','staff']::app_role[])
         or client_id = public.my_client_id());
create policy "staff write invoices" on public.invoices for all
  using (public.has_role(array['superadmin','admin','manager']::app_role[]))
  with check (public.has_role(array['superadmin','admin','manager']::app_role[]));

-- enquiries / quotes / orders: anyone may submit, only staff may read
create policy "anyone submits enquiry" on public.enquiries for insert with check (true);
create policy "staff read enquiries"   on public.enquiries for select
  using (public.has_role(array['superadmin','admin','manager','staff']::app_role[]));
create policy "staff write enquiries"  on public.enquiries for all
  using (public.has_role(array['superadmin','admin','manager']::app_role[]))
  with check (public.has_role(array['superadmin','admin','manager']::app_role[]));

create policy "anyone submits quote" on public.quote_requests for insert with check (true);
create policy "staff read quotes"    on public.quote_requests for select
  using (public.has_role(array['superadmin','admin','manager','staff']::app_role[]));

create policy "anyone places order" on public.orders for insert with check (true);
create policy "staff read orders"   on public.orders for select
  using (public.has_role(array['superadmin','admin','manager','staff']::app_role[]));
create policy "staff write orders"  on public.orders for all
  using (public.has_role(array['superadmin','admin','manager']::app_role[]))
  with check (public.has_role(array['superadmin','admin','manager']::app_role[]));

-- audit log: append-only for signed-in users, readable by admins
create policy "signed in writes audit" on public.audit_log for insert
  with check (auth.uid() is not null);
create policy "admins read audit" on public.audit_log for select
  using (public.has_role(array['superadmin','admin']::app_role[]));

-- ---------------------------------------------------------------- indexes
create index if not exists idx_projects_client on public.projects(client_id);
create index if not exists idx_invoices_client on public.invoices(client_id);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_posts_published on public.posts(published, date desc);
create index if not exists idx_orders_created  on public.orders(created_at desc);
create index if not exists idx_audit_created   on public.audit_log(created_at desc);
