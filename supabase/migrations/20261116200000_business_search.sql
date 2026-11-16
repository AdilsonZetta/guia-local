-- Server-side business search, home stats, and neighborhood backfill.
-- Idempotent. Apply after 20261116190000_google_maps_import.sql.

create extension if not exists unaccent;
create extension if not exists pg_trgm;

create or replace function public.f_unaccent(input text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select unaccent(coalesce(input, ''));
$$;

create or replace function public.business_display_rating(
  platform_rating numeric,
  platform_count integer,
  google_rating numeric
) returns numeric
language sql
immutable
parallel safe
set search_path = public
as $$
  select case
    when coalesce(platform_count, 0) > 0 then coalesce(platform_rating, 0)
    else coalesce(google_rating, 0)
  end;
$$;

alter table public.businesses
  add column if not exists search_text text
  generated always as (
    public.f_unaccent(lower(
      coalesce(name, '') || ' ' ||
      coalesce(google_category, '') || ' ' ||
      coalesce(address, '')
    ))
  ) stored;

create index if not exists businesses_status_idx on public.businesses (status);
create index if not exists businesses_category_idx on public.businesses (category_id);
create index if not exists businesses_slug_idx on public.businesses (slug);
create index if not exists businesses_neighborhood_id_idx on public.businesses (neighborhood_id);
create index if not exists businesses_google_rating_idx on public.businesses (google_rating);
create index if not exists businesses_public_rating_idx
  on public.businesses (google_rating desc nulls last, google_review_count desc nulls last)
  where status = 'active' and is_paused = false;

do $$
declare
  trgm_schema text;
begin
  select n.nspname into trgm_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_trgm';

  if trgm_schema is null then
    raise exception 'pg_trgm extension is not installed';
  end if;

  execute format(
    'create index if not exists businesses_name_trgm_idx on public.businesses using gin (public.f_unaccent(lower(name)) %I.gin_trgm_ops)',
    trgm_schema
  );
  execute format(
    $f$create index if not exists businesses_google_category_trgm_idx on public.businesses using gin (public.f_unaccent(lower(coalesce(google_category, ''))) %I.gin_trgm_ops)$f$,
    trgm_schema
  );
  execute format(
    $f$create index if not exists businesses_address_trgm_idx on public.businesses using gin (public.f_unaccent(lower(coalesce(address, ''))) %I.gin_trgm_ops)$f$,
    trgm_schema
  );
  execute format(
    'create index if not exists businesses_search_text_trgm_idx on public.businesses using gin (search_text %I.gin_trgm_ops)',
    trgm_schema
  );
end $$;

-- Pull a bairro name out of a Google Maps or "rua, número, bairro, cidade-UF" address.
create or replace function public.extract_neighborhood_name(address text, city_name text)
returns text
language plpgsql
immutable
set search_path = public, extensions
as $$
declare
  raw text := btrim(coalesce(address, ''));
  city text := btrim(coalesce(city_name, ''));
  city_key text;
  parts text[];
  seg text;
  i int;
  candidate text;
  city_at int := 0;
begin
  if raw = '' or city = '' then
    return null;
  end if;
  raw := regexp_replace(raw, '\s+', ' ', 'g');
  raw := regexp_replace(raw, '\s*,?\s*(Brasil|Brazil)\s*$', '', 'i');
  raw := regexp_replace(raw, '\s*,?\s*\d{5}-?\d{3}\s*$', '');
  raw := btrim(raw, ' ,');
  city_key := public.f_unaccent(lower(city));
  parts := regexp_split_to_array(raw, '\s*,\s*');
  for i in 1..coalesce(array_length(parts, 1), 0) loop
    seg := public.f_unaccent(lower(btrim(parts[i])));
    if seg = city_key
      or seg like city_key || ' %'
      or seg like city_key || '-%'
      or seg like city_key || ' -%'
    then
      city_at := i;
      exit;
    end if;
  end loop;
  if city_at <= 1 then
    return null;
  end if;
  candidate := btrim(parts[city_at - 1]);
  if candidate ~ ' - ' then
    candidate := btrim(regexp_replace(candidate, '^.* - ', ''));
  end if;
  candidate := regexp_replace(candidate, '^(bairro|bairo)\s+', '', 'i');
  candidate := btrim(candidate, ' -');
  if candidate is null or char_length(candidate) < 2 or char_length(candidate) > 80 then
    return null;
  end if;
  if candidate ~ '^[0-9]+$' then
    return null;
  end if;
  if candidate ~* '^(rua|r\.|av\.?|avenida|alameda|travessa|tv\.|pra[cç]a|rodovia|estrada|beco|largo|via|rod\.|br-?[0-9])\M' then
    return null;
  end if;
  if public.f_unaccent(lower(candidate)) in (city_key, 'brasil', 'brazil', 'mg', 'minas gerais') then
    return null;
  end if;
  return candidate;
end;
$$;

do $$
declare
  v_city text;
begin
  select coalesce(city_name, 'Uberaba') into v_city
  from public.site_settings
  where id = 1;
  if v_city is null or btrim(v_city) = '' then
    v_city := 'Uberaba';
  end if;

  insert into public.neighborhoods (name, slug, active, sort_order)
  select fresh.name, fresh.slug, true, 1000 + row_number() over (order by fresh.name)
  from (
    select distinct on (slug) name, slug
    from (
      select
        public.extract_neighborhood_name(b.address, v_city) as name,
        private.slugify(public.extract_neighborhood_name(b.address, v_city)) as slug
      from public.businesses b
      where b.neighborhood_id is null
        and b.address is not null
    ) extracted
    where name is not null
      and slug is not null
      and slug <> ''
    order by slug, (name ~ '[À-ÿ]') desc, char_length(name) desc, name
  ) fresh
  where not exists (
    select 1 from public.neighborhoods n where n.slug = fresh.slug
  );

  update public.businesses b
  set neighborhood_id = n.id
  from public.neighborhoods n
  where b.neighborhood_id is null
    and public.extract_neighborhood_name(b.address, v_city) is not null
    and n.slug = private.slugify(public.extract_neighborhood_name(b.address, v_city));
end $$;

create or replace function public.search_businesses(
  p_query text default null,
  p_category text default null,
  p_neighborhood text default null,
  p_home_service boolean default false,
  p_receiving boolean default false,
  p_min_rating numeric default 0,
  p_sort text default 'relevance',
  p_status text default null,
  p_include_inactive boolean default false,
  p_ids uuid[] default null,
  p_limit integer default 20,
  p_offset integer default 0
) returns jsonb
language plpgsql
stable
security invoker
set search_path = public, extensions
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_term text := left(public.f_unaccent(lower(btrim(coalesce(p_query, '')))), 120);
  v_sort text := case
    when p_sort in ('rating', 'recent', 'relevance') then p_sort
    else 'relevance'
  end;
  v_phrase text := replace(replace(replace(v_term, '\', '\\'), '%', '\%'), '_', '\_');
  v_result jsonb;
begin
  with filtered as materialized (
    select
      b.id,
      b.created_at,
      b.featured,
      b.name,
      b.search_text,
      stats.avg_rating,
      stats.review_count,
      stats.awaiting_reply_count,
      public.business_display_rating(stats.avg_rating, stats.review_count, b.google_rating) as display_rating,
      case
        when coalesce(stats.review_count, 0) > 0 then stats.review_count
        else coalesce(b.google_review_count, 0)
      end as display_count
    from public.businesses b
    left join public.categories c on c.id = b.category_id
    left join public.neighborhoods n on n.id = b.neighborhood_id
    left join (
      select
        r.business_id,
        avg(r.rating)::numeric as avg_rating,
        count(*)::int as review_count,
        count(*) filter (where r.reply_text is null)::int as awaiting_reply_count
      from public.reviews r
      where r.status = 'published'
      group by r.business_id
    ) stats on stats.business_id = b.id
    where (p_ids is null or b.id = any (p_ids))
      and (
        coalesce(p_include_inactive, false)
        or (b.status = 'active' and b.is_paused = false)
      )
      and (
        p_status is null
        or btrim(p_status) = ''
        or b.status::text = p_status
      )
      and (
        p_category is null
        or btrim(p_category) = ''
        or c.slug = p_category
        or b.category_id::text = p_category
      )
      and (
        p_neighborhood is null
        or btrim(p_neighborhood) = ''
        or n.slug = p_neighborhood
        or exists (
          select 1
          from public.business_service_areas a
          join public.neighborhoods sn on sn.id = a.neighborhood_id
          where a.business_id = b.id
            and sn.slug = p_neighborhood
        )
      )
      and (not coalesce(p_home_service, false) or b.home_service)
      and (not coalesce(p_receiving, false) or public.is_receiving_now(b))
      and (
        coalesce(p_min_rating, 0) <= 0
        or public.business_display_rating(stats.avg_rating, stats.review_count, b.google_rating) >= p_min_rating
      )
      and (
        v_term = ''
        or not exists (
          select 1
          from unnest(regexp_split_to_array(v_term, '\s+')) raw_token
          cross join lateral (
            select replace(replace(replace(raw_token, '\', '\\'), '%', '\%'), '_', '\_') as token
          ) escaped
          where char_length(raw_token) >= 2
            and b.search_text not like '%' || escaped.token || '%' escape '\'
            and public.f_unaccent(lower(coalesce(c.name, ''))) not like '%' || escaped.token || '%' escape '\'
        )
      )
  ),
  ranked as (
    select
      id,
      avg_rating,
      review_count,
      awaiting_reply_count,
      row_number() over (
        order by
          case when v_sort = 'recent' then created_at end desc nulls last,
          case when v_sort = 'rating' then display_rating end desc nulls last,
          case when v_sort = 'rating' then display_count end desc nulls last,
          case
            when v_sort = 'relevance' and v_term <> '' and search_text like '%' || v_phrase || '%' escape '\'
              then 1
            else 0
          end desc,
          featured desc,
          name asc,
          id asc
      ) as ord
    from filtered
  )
  select jsonb_build_object(
    'total', (select count(*)::int from filtered),
    'rows', (
      select coalesce(jsonb_agg(payload order by ord), '[]'::jsonb)
      from (
        select
          ranked.ord,
          to_jsonb(b) || jsonb_build_object(
            'categories',
            case
              when c.id is null then null
              else jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'icon', c.icon)
            end,
            'neighborhoods',
            case
              when n.id is null then null
              else jsonb_build_object('id', n.id, 'name', n.name, 'slug', n.slug)
            end,
            'business_stats',
            jsonb_build_object(
              'business_id', b.id,
              'avg_rating', coalesce(ranked.avg_rating, 0),
              'review_count', coalesce(ranked.review_count, 0),
              'awaiting_reply_count', coalesce(ranked.awaiting_reply_count, 0)
            )
          ) as payload
        from ranked
        join public.businesses b on b.id = ranked.id
        left join public.categories c on c.id = b.category_id
        left join public.neighborhoods n on n.id = b.neighborhood_id
        where ranked.ord > v_offset
          and ranked.ord <= v_offset + v_limit
      ) page
    )
  )
  into v_result;

  return coalesce(v_result, jsonb_build_object('total', 0, 'rows', '[]'::jsonb));
end;
$$;

create or replace function public.home_snapshot()
returns jsonb
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with visible as materialized (
    select *
    from public.businesses
    where status = 'active'
      and is_paused = false
  ),
  review_stats as (
    select
      r.business_id,
      avg(r.rating)::numeric as avg_rating,
      count(*)::int as review_count,
      count(*) filter (where r.reply_text is null)::int as awaiting_reply_count
    from public.reviews r
    where r.status = 'published'
    group by r.business_id
  ),
  highlighted as (
    select b.*
    from visible b
    left join review_stats s on s.business_id = b.id
    order by
      b.featured desc,
      (coalesce(b.google_review_count, 0) >= 5 and b.google_rating is not null) desc,
      public.business_display_rating(s.avg_rating, s.review_count, b.google_rating) desc nulls last,
      coalesce(b.google_review_count, 0) desc,
      b.created_at desc
    limit 6
  )
  select jsonb_build_object(
    'business_count', (select count(*)::int from visible),
    'review_count', (select count(*)::int from public.reviews where status = 'published'),
    'google_review_count', (select coalesce(sum(google_review_count), 0)::bigint from visible),
    'google_avg_rating', (
      select round(avg(google_rating), 2)
      from visible
      where google_rating is not null
        and coalesce(google_review_count, 0) >= 5
    ),
    'platform_avg_rating', (
      select round(avg(rating)::numeric, 2)
      from public.reviews
      where status = 'published'
    ),
    'category_counts', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'category_id', c.id,
          'slug', c.slug,
          'name', c.name,
          'icon', c.icon,
          'count', coalesce(counts.count, 0)
        )
        order by c.sort_order, c.name
      ), '[]'::jsonb)
      from public.categories c
      left join (
        select category_id, count(*)::int as count
        from visible
        where category_id is not null
        group by category_id
      ) counts on counts.category_id = c.id
      where c.active
    ),
    'highlighted', (
      select coalesce(jsonb_agg(payload order by featured desc, google_rating desc nulls last, created_at desc), '[]'::jsonb)
      from (
        select
          b.featured,
          b.google_rating,
          b.created_at,
          to_jsonb(b) || jsonb_build_object(
            'categories',
            case
              when c.id is null then null
              else jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'icon', c.icon)
            end,
            'neighborhoods',
            case
              when n.id is null then null
              else jsonb_build_object('id', n.id, 'name', n.name, 'slug', n.slug)
            end,
            'business_stats',
            jsonb_build_object(
              'business_id', b.id,
              'avg_rating', coalesce(s.avg_rating, 0),
              'review_count', coalesce(s.review_count, 0),
              'awaiting_reply_count', coalesce(s.awaiting_reply_count, 0)
            )
          ) as payload
        from highlighted b
        left join public.categories c on c.id = b.category_id
        left join public.neighborhoods n on n.id = b.neighborhood_id
        left join review_stats s on s.business_id = b.id
      ) rows
    )
  );
$$;

create or replace function public.business_admin_counts()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'total', (select count(*)::int from public.businesses),
    'active', (select count(*)::int from public.businesses where status = 'active' and not is_paused),
    'pending', (select count(*)::int from public.businesses where status = 'pending'),
    'paused', (select count(*)::int from public.businesses where is_paused),
    'owners', (select count(distinct owner_id)::int from public.businesses where owner_id is not null)
  );
$$;

create or replace function public.business_category_counts()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'category_id', category_id,
    'count', count
  )), '[]'::jsonb)
  from (
    select category_id, count(*)::int as count
    from public.businesses
    where category_id is not null
    group by category_id
  ) counts;
$$;

grant execute on function public.f_unaccent(text) to anon, authenticated, service_role;
grant execute on function public.business_display_rating(numeric, integer, numeric) to anon, authenticated, service_role;
grant execute on function public.extract_neighborhood_name(text, text) to anon, authenticated, service_role;
grant execute on function public.search_businesses(text, text, text, boolean, boolean, numeric, text, text, boolean, uuid[], integer, integer) to anon, authenticated, service_role;
grant execute on function public.home_snapshot() to anon, authenticated, service_role;
grant execute on function public.business_admin_counts() to anon, authenticated, service_role;
grant execute on function public.business_category_counts() to anon, authenticated, service_role;
