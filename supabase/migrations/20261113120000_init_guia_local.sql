-- Guia Local: schema, RLS, storage, triggers
-- Project: fraudueurdkqjzcqagkv (sa-east-1)

create extension if not exists "pgcrypto";

create schema if not exists private;

grant usage on schema private to postgres, service_role, supabase_auth_admin, authenticated, anon;

-- ---------------------------------------------------------------------------
-- Admin emails (used by signup trigger; not exposed via Data API)
-- ---------------------------------------------------------------------------
create table private.admin_emails (
  email text primary key
);

insert into private.admin_emails (email) values ('grupozettaoficial@gmail.com');
revoke all on table private.admin_emails from anon, authenticated, public;
grant all on table private.admin_emails to postgres, service_role, supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'business', 'client');
create type public.user_status as enum ('active', 'suspended');
create type public.business_status as enum (
  'pending', 'adjustments_requested', 'active', 'rejected', 'archived'
);
create type public.review_status as enum (
  'pending', 'published', 'adjustment_requested', 'removed', 'flagged'
);
create type public.suggestion_status as enum (
  'pending', 'registration_created', 'archived'
);

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  avatar_url text,
  role public.user_role not null default 'client',
  status public.user_status not null default 'active',
  suspension_reason text,
  notify_review_email boolean not null default true,
  notify_suggestion_email boolean not null default true,
  notify_marketing_email boolean not null default false,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create index profiles_status_idx on public.profiles (status);

-- ---------------------------------------------------------------------------
-- Site settings (single row)
-- ---------------------------------------------------------------------------
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  site_name text not null default 'Guia Local',
  site_description text not null default 'Encontre empresas e prestadores de confiança na sua cidade.',
  logo_url text,
  city_name text not null default 'Uberaba',
  state_code text not null default 'MG',
  availability_validity_days int not null default 30,
  moderate_business_signups boolean not null default true,
  moderate_reviews boolean not null default true,
  link_in_bio_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (1);

-- ---------------------------------------------------------------------------
-- Neighborhoods & categories
-- ---------------------------------------------------------------------------
create table public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text not null default 'tag',
  description text,
  active boolean not null default true,
  show_on_home boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Businesses
-- ---------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete set null,
  name text not null,
  slug text not null unique,
  tagline text,
  description text,
  category_id uuid references public.categories (id) on delete set null,
  neighborhood_id uuid references public.neighborhoods (id) on delete set null,
  address text,
  phone text,
  whatsapp text,
  email text,
  website text,
  instagram text,
  logo_url text,
  cover_url text,
  status public.business_status not null default 'pending',
  adjustment_notes text,
  is_paused boolean not null default false,
  home_service boolean not null default false,
  receiving_orders boolean not null default false,
  receiving_orders_until date,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null
);

create index businesses_status_idx on public.businesses (status);
create index businesses_owner_idx on public.businesses (owner_id);
create index businesses_category_idx on public.businesses (category_id);
create index businesses_slug_idx on public.businesses (slug);
create index businesses_featured_idx on public.businesses (featured) where featured;

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  open_time time,
  close_time time,
  is_closed boolean not null default false,
  unique (business_id, weekday)
);

create table public.business_service_areas (
  business_id uuid not null references public.businesses (id) on delete cascade,
  neighborhood_id uuid not null references public.neighborhoods (id) on delete cascade,
  primary key (business_id, neighborhood_id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  description text,
  price numeric(10, 2),
  price_label text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.business_photos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  url text not null,
  storage_path text,
  is_cover boolean not null default false,
  sort_order int not null default 0,
  alt text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Reviews, favorites, suggestions
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  title text,
  body text not null,
  status public.review_status not null default 'pending',
  flag_reason text,
  moderation_notes text,
  reply_text text,
  replied_at timestamptz,
  reported_by_business boolean not null default false,
  report_reason text,
  reported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index reviews_business_idx on public.reviews (business_id);
create index reviews_status_idx on public.reviews (status);

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  suggested_by uuid references public.profiles (id) on delete set null,
  suggester_name text,
  suggester_contact text,
  business_name text not null,
  category_id uuid references public.categories (id) on delete set null,
  neighborhood_id uuid references public.neighborhoods (id) on delete set null,
  phone text,
  notes text,
  status public.suggestion_status not null default 'pending',
  created_business_id uuid references public.businesses (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Link in bio
-- ---------------------------------------------------------------------------
create table public.link_in_bio (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses (id) on delete cascade,
  slug text not null unique,
  theme text not null default 'forest',
  enabled boolean not null default true,
  headline text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.link_in_bio_buttons (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.link_in_bio (id) on delete cascade,
  label text not null,
  url text not null,
  icon text not null default 'link',
  sort_order int not null default 0,
  enabled boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Analytics & activity
-- ---------------------------------------------------------------------------
create table public.profile_visits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  visitor_id uuid references public.profiles (id) on delete set null,
  source text,
  created_at timestamptz not null default now()
);
create index profile_visits_business_created_idx on public.profile_visits (business_id, created_at desc);

create table public.searches (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  user_id uuid references public.profiles (id) on delete set null,
  results_count int not null default 0,
  category_id uuid references public.categories (id) on delete set null,
  neighborhood_id uuid references public.neighborhoods (id) on delete set null,
  created_at timestamptz not null default now()
);
create index searches_created_idx on public.searches (created_at desc);
create index searches_query_idx on public.searches (lower(query));

create table public.whatsapp_clicks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  source text not null default 'profile',
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index whatsapp_clicks_business_created_idx on public.whatsapp_clicks (business_id, created_at desc);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_log_created_idx on public.activity_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers (private schema — security definer)
-- ---------------------------------------------------------------------------
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function private.is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.businesses
    where id = p_business_id
      and owner_id = auth.uid()
  );
$$;

create or replace function private.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

grant execute on function private.is_admin() to anon, authenticated;
grant execute on function private.is_business_owner(uuid) to anon, authenticated;
grant execute on function private.current_role() to anon, authenticated;

-- Public wrappers for the client when needed
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
as $$
  select private.is_admin();
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger trg_categories_updated_at before update on public.categories
  for each row execute function private.set_updated_at();
create trigger trg_businesses_updated_at before update on public.businesses
  for each row execute function private.set_updated_at();
create trigger trg_reviews_updated_at before update on public.reviews
  for each row execute function private.set_updated_at();
create trigger trg_suggestions_updated_at before update on public.suggestions
  for each row execute function private.set_updated_at();
create trigger trg_link_in_bio_updated_at before update on public.link_in_bio
  for each row execute function private.set_updated_at();
create trigger trg_site_settings_updated_at before update on public.site_settings
  for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  r public.user_role := 'client';
begin
  if exists (
    select 1 from private.admin_emails
    where lower(email) = lower(new.email)
  ) then
    r := 'admin';
  end if;

  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'phone',
    r
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Protect privileged profile fields
create or replace function private.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if private.is_admin() then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    new.role := old.role;
    new.status := old.status;
    new.suspension_reason := old.suspension_reason;
    new.email := old.email;
  end if;
  return new;
end;
$$;

create trigger trg_protect_profile_privileges
  before update on public.profiles
  for each row execute function private.protect_profile_privileges();

-- Owners cannot self-approve or change admin-only business fields
create or replace function private.protect_business_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if private.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.featured := false;
    new.approved_at := null;
    new.approved_by := null;
    if exists (select 1 from public.site_settings where id = 1 and moderate_business_signups) then
      new.status := 'pending';
    else
      new.status := 'active';
      new.approved_at := now();
    end if;
  elsif tg_op = 'UPDATE' then
    new.featured := old.featured;
    new.approved_at := old.approved_at;
    new.approved_by := old.approved_by;
    -- owners may pause / unpause an already active listing
    if old.status is distinct from 'active' then
      new.status := old.status;
    elsif new.status is distinct from old.status and new.status is distinct from 'active' and new.status is distinct from 'archived' then
      -- allow only staying active (unpause is is_paused, not status)
      new.status := old.status;
    else
      new.status := old.status;
    end if;
    new.adjustment_notes := old.adjustment_notes;
  end if;
  return new;
end;
$$;

create trigger trg_protect_business_privileges
  before insert or update on public.businesses
  for each row execute function private.protect_business_privileges();

-- Reviews start pending when moderation is on; authors cannot self-publish
create or replace function private.protect_review_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  moderate boolean;
begin
  select moderate_reviews into moderate from public.site_settings where id = 1;
  if private.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if moderate then
      new.status := 'pending';
    else
      new.status := 'published';
    end if;
    new.moderation_notes := null;
    new.reply_text := null;
    new.replied_at := null;
    new.reported_by_business := false;
    new.report_reason := null;
    new.reported_at := null;
  elsif tg_op = 'UPDATE' then
    -- business owner may reply or report
    if private.is_business_owner(new.business_id) then
      new.rating := old.rating;
      new.title := old.title;
      new.body := old.body;
      new.status := old.status;
      new.moderation_notes := old.moderation_notes;
      new.user_id := old.user_id;
      new.business_id := old.business_id;
      if new.reply_text is distinct from old.reply_text then
        new.replied_at := now();
      end if;
      if new.reported_by_business and not old.reported_by_business then
        new.reported_at := now();
        new.status := 'flagged';
      end if;
      return new;
    end if;
    -- author may edit content; goes back to pending if moderation is on
    if auth.uid() = old.user_id then
      new.user_id := old.user_id;
      new.business_id := old.business_id;
      new.reply_text := old.reply_text;
      new.replied_at := old.replied_at;
      new.moderation_notes := old.moderation_notes;
      new.reported_by_business := old.reported_by_business;
      new.report_reason := old.report_reason;
      new.reported_at := old.reported_at;
      if moderate then
        new.status := 'pending';
      else
        new.status := 'published';
      end if;
      return new;
    end if;
    raise exception 'not allowed';
  end if;
  return new;
end;
$$;

create trigger trg_protect_review_privileges
  before insert or update on public.reviews
  for each row execute function private.protect_review_privileges();

-- Auto slug for link in bio
create extension if not exists unaccent;

create or replace function private.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(unaccent(coalesce(input, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function private.ensure_link_in_bio()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  base_slug text;
  final_slug text;
  i int := 0;
begin
  if tg_op = 'INSERT' then
    base_slug := nullif(private.slugify(new.name), '');
    if base_slug is null then
      base_slug := 'empresa';
    end if;
    final_slug := base_slug;
    while exists (select 1 from public.link_in_bio where slug = final_slug) loop
      i := i + 1;
      final_slug := base_slug || '-' || i::text;
    end loop;
    insert into public.link_in_bio (business_id, slug, headline)
    values (new.id, final_slug, new.name);
  end if;
  return new;
end;
$$;

create trigger trg_ensure_link_in_bio
  after insert on public.businesses
  for each row execute function private.ensure_link_in_bio();

-- ---------------------------------------------------------------------------
-- Public views (security invoker) for safe joins
-- ---------------------------------------------------------------------------
create or replace view public.public_profiles
with (security_invoker = true) as
select id, full_name, avatar_url
from public.profiles
where status = 'active';

create or replace view public.business_stats
with (security_invoker = true) as
select
  b.id as business_id,
  coalesce(avg(r.rating) filter (where r.status = 'published'), 0)::numeric(3,2) as avg_rating,
  count(r.id) filter (where r.status = 'published')::int as review_count,
  count(r.id) filter (where r.status = 'published' and r.reply_text is null)::int as awaiting_reply_count
from public.businesses b
left join public.reviews r on r.business_id = b.id
group by b.id;

-- Helper: currently receiving orders?
create or replace function public.is_receiving_now(b public.businesses)
returns boolean
language sql
stable
as $$
  select b.receiving_orders
    and (b.receiving_orders_until is null or b.receiving_orders_until >= current_date)
    and not b.is_paused
    and b.status = 'active';
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.neighborhoods enable row level security;
alter table public.categories enable row level security;
alter table public.businesses enable row level security;
alter table public.business_hours enable row level security;
alter table public.business_service_areas enable row level security;
alter table public.services enable row level security;
alter table public.business_photos enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.suggestions enable row level security;
alter table public.link_in_bio enable row level security;
alter table public.link_in_bio_buttons enable row level security;
alter table public.profile_visits enable row level security;
alter table public.searches enable row level security;
alter table public.whatsapp_clicks enable row level security;
alter table public.activity_log enable row level security;

-- profiles
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or private.is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() or private.is_admin())
  with check (id = auth.uid() or private.is_admin());

create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- site_settings: readable by all, writable by admin
create policy site_settings_select on public.site_settings
  for select to anon, authenticated
  using (true);

create policy site_settings_admin on public.site_settings
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- neighborhoods & categories: public read, admin write
create policy neighborhoods_select on public.neighborhoods
  for select to anon, authenticated
  using (active or private.is_admin());

create policy neighborhoods_admin on public.neighborhoods
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy categories_select on public.categories
  for select to anon, authenticated
  using (active or private.is_admin());

create policy categories_admin on public.categories
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- businesses
create policy businesses_public_select on public.businesses
  for select to anon, authenticated
  using (
    (status = 'active' and is_paused = false)
    or owner_id = auth.uid()
    or private.is_admin()
  );

create policy businesses_insert on public.businesses
  for insert to authenticated
  with check (owner_id = auth.uid() or private.is_admin());

create policy businesses_update on public.businesses
  for update to authenticated
  using (owner_id = auth.uid() or private.is_admin())
  with check (owner_id = auth.uid() or private.is_admin());

create policy businesses_delete_admin on public.businesses
  for delete to authenticated
  using (private.is_admin());

-- child tables: visible when parent business is visible
create policy hours_select on public.business_hours
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id
        and ((b.status = 'active' and not b.is_paused) or b.owner_id = auth.uid() or private.is_admin())
    )
  );

create policy hours_write on public.business_hours
  for all to authenticated
  using (private.is_business_owner(business_id) or private.is_admin())
  with check (private.is_business_owner(business_id) or private.is_admin());

create policy areas_select on public.business_service_areas
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id
        and ((b.status = 'active' and not b.is_paused) or b.owner_id = auth.uid() or private.is_admin())
    )
  );

create policy areas_write on public.business_service_areas
  for all to authenticated
  using (private.is_business_owner(business_id) or private.is_admin())
  with check (private.is_business_owner(business_id) or private.is_admin());

create policy services_select on public.services
  for select to anon, authenticated
  using (
    (active and exists (
      select 1 from public.businesses b
      where b.id = business_id and b.status = 'active' and not b.is_paused
    ))
    or private.is_business_owner(business_id)
    or private.is_admin()
  );

create policy services_write on public.services
  for all to authenticated
  using (private.is_business_owner(business_id) or private.is_admin())
  with check (private.is_business_owner(business_id) or private.is_admin());

create policy photos_select on public.business_photos
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id
        and ((b.status = 'active' and not b.is_paused) or b.owner_id = auth.uid() or private.is_admin())
    )
  );

create policy photos_write on public.business_photos
  for all to authenticated
  using (private.is_business_owner(business_id) or private.is_admin())
  with check (private.is_business_owner(business_id) or private.is_admin());

-- reviews
create policy reviews_select on public.reviews
  for select to anon, authenticated
  using (
    status = 'published'
    or user_id = auth.uid()
    or private.is_business_owner(business_id)
    or private.is_admin()
  );

create policy reviews_insert on public.reviews
  for insert to authenticated
  with check (user_id = auth.uid());

create policy reviews_update on public.reviews
  for update to authenticated
  using (
    user_id = auth.uid()
    or private.is_business_owner(business_id)
    or private.is_admin()
  )
  with check (
    user_id = auth.uid()
    or private.is_business_owner(business_id)
    or private.is_admin()
  );

create policy reviews_delete on public.reviews
  for delete to authenticated
  using (user_id = auth.uid() or private.is_admin());

-- favorites
create policy favorites_own on public.favorites
  for all to authenticated
  using (user_id = auth.uid() or private.is_admin())
  with check (user_id = auth.uid() or private.is_admin());

-- suggestions
create policy suggestions_select on public.suggestions
  for select to authenticated
  using (suggested_by = auth.uid() or private.is_admin());

create policy suggestions_insert on public.suggestions
  for insert to anon, authenticated
  with check (suggested_by = auth.uid() or suggested_by is null);

create policy suggestions_update_admin on public.suggestions
  for update to authenticated
  using (private.is_admin() or suggested_by = auth.uid())
  with check (private.is_admin() or suggested_by = auth.uid());

create policy suggestions_admin_delete on public.suggestions
  for delete to authenticated
  using (private.is_admin());

-- link in bio
create policy lib_select on public.link_in_bio
  for select to anon, authenticated
  using (
    (enabled and exists (
      select 1 from public.businesses b
      where b.id = business_id and b.status = 'active' and not b.is_paused
    ))
    or private.is_business_owner(business_id)
    or private.is_admin()
  );

create policy lib_write on public.link_in_bio
  for all to authenticated
  using (private.is_business_owner(business_id) or private.is_admin())
  with check (private.is_business_owner(business_id) or private.is_admin());

create policy lib_buttons_select on public.link_in_bio_buttons
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.link_in_bio l
      join public.businesses b on b.id = l.business_id
      where l.id = link_id
        and (
          (l.enabled and b.status = 'active' and not b.is_paused and enabled)
          or private.is_business_owner(b.id)
          or private.is_admin()
        )
    )
  );

create policy lib_buttons_write on public.link_in_bio_buttons
  for all to authenticated
  using (
    exists (
      select 1 from public.link_in_bio l
      where l.id = link_id and (private.is_business_owner(l.business_id) or private.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.link_in_bio l
      where l.id = link_id and (private.is_business_owner(l.business_id) or private.is_admin())
    )
  );

-- analytics: anyone can insert; owners/admins can read
create policy visits_insert on public.profile_visits
  for insert to anon, authenticated
  with check (true);

create policy visits_select on public.profile_visits
  for select to authenticated
  using (private.is_business_owner(business_id) or private.is_admin());

create policy searches_insert on public.searches
  for insert to anon, authenticated
  with check (true);

create policy searches_select on public.searches
  for select to authenticated
  using (private.is_admin() or user_id = auth.uid());

create policy wa_insert on public.whatsapp_clicks
  for insert to anon, authenticated
  with check (true);

create policy wa_select on public.whatsapp_clicks
  for select to authenticated
  using (private.is_business_owner(business_id) or private.is_admin());

create policy activity_select on public.activity_log
  for select to authenticated
  using (private.is_admin());

create policy activity_insert_auth on public.activity_log
  for insert to authenticated
  with check (actor_id = auth.uid() or private.is_admin());

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'business-photos',
    'business-photos',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'avatars',
    'avatars',
    true,
    2097152,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'site-assets',
    'site-assets',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
  )
on conflict (id) do nothing;

create policy storage_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('business-photos', 'avatars', 'site-assets'));

create policy storage_business_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'business-photos'
    and (
      private.is_admin()
      or private.is_business_owner((split_part(name, '/', 1))::uuid)
    )
  );

create policy storage_business_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'business-photos'
    and (
      private.is_admin()
      or private.is_business_owner((split_part(name, '/', 1))::uuid)
    )
  )
  with check (
    bucket_id = 'business-photos'
    and (
      private.is_admin()
      or private.is_business_owner((split_part(name, '/', 1))::uuid)
    )
  );

create policy storage_business_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'business-photos'
    and (
      private.is_admin()
      or private.is_business_owner((split_part(name, '/', 1))::uuid)
    )
  );

create policy storage_avatars_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (split_part(name, '/', 1) = auth.uid()::text or private.is_admin())
  );

create policy storage_avatars_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (split_part(name, '/', 1) = auth.uid()::text or private.is_admin())
  )
  with check (
    bucket_id = 'avatars'
    and (split_part(name, '/', 1) = auth.uid()::text or private.is_admin())
  );

create policy storage_avatars_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (split_part(name, '/', 1) = auth.uid()::text or private.is_admin())
  );

create policy storage_site_admin on storage.objects
  for all to authenticated
  using (bucket_id = 'site-assets' and private.is_admin())
  with check (bucket_id = 'site-assets' and private.is_admin());
