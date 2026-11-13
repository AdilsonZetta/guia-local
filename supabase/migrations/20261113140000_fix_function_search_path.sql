create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.is_admin();
$$;

create or replace function public.is_receiving_now(b public.businesses)
returns boolean
language sql
stable
set search_path = public
as $$
  select b.receiving_orders
    and (b.receiving_orders_until is null or b.receiving_orders_until >= current_date)
    and not b.is_paused
    and b.status = 'active';
$$;

create or replace function private.slugify(input text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(both '-' from regexp_replace(lower(unaccent(coalesce(input, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
