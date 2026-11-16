-- Google Maps import columns.
-- This migration is already applied on the live database and was missing from the repo.
-- Idempotent so it can be replayed safely.

alter table public.businesses add column if not exists source text;
alter table public.businesses add column if not exists google_place_id text;
alter table public.businesses add column if not exists google_maps_url text;
alter table public.businesses add column if not exists google_category text;
alter table public.businesses add column if not exists google_rating numeric;
alter table public.businesses add column if not exists google_review_count integer;
alter table public.businesses add column if not exists google_hours jsonb;
alter table public.businesses add column if not exists latitude double precision;
alter table public.businesses add column if not exists longitude double precision;
alter table public.businesses add column if not exists imported_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_index i
    join pg_attribute a
      on a.attrelid = i.indrelid
     and a.attnum = any (i.indkey)
    where i.indrelid = 'public.businesses'::regclass
      and i.indisunique
      and a.attname = 'google_place_id'
      and i.indnkeyatts = 1
  ) then
    alter table public.businesses
      add constraint businesses_google_place_id_key unique (google_place_id);
  end if;
end $$;
