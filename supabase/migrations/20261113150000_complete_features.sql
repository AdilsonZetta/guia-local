-- Extra fields, notifications, review photos, moderation log

alter table public.businesses
  add column if not exists attendance_type text not null default 'client_address',
  add column if not exists show_whatsapp boolean not null default true,
  add column if not exists brand_color text not null default '#F87171',
  add column if not exists brand_icon text not null default 'home',
  add column if not exists location_display text not null default 'city_regions',
  add column if not exists contact_verified boolean not null default false,
  add column if not exists owner_verified boolean not null default false;

alter table public.services
  add column if not exists icon text not null default 'tag';

alter table public.reviews
  add column if not exists service_id uuid references public.services(id) on delete set null,
  add column if not exists experience_month date;

create table if not exists public.review_photos (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  url text not null,
  storage_path text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references public.reviews(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  justification text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.profiles
  add column if not exists notify_availability boolean not null default true,
  add column if not exists notify_weekly_summary boolean not null default false,
  add column if not exists city_name text;

alter table public.notifications enable row level security;
alter table public.review_photos enable row level security;
alter table public.moderation_events enable row level security;

create policy notifications_own on public.notifications
  for all to authenticated
  using (user_id = auth.uid() or private.is_admin())
  with check (user_id = auth.uid() or private.is_admin());

create policy review_photos_select on public.review_photos
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.reviews r
      where r.id = review_id
        and (r.status = 'published' or r.user_id = auth.uid() or private.is_admin()
             or private.is_business_owner(r.business_id))
    )
  );

create policy review_photos_insert on public.review_photos
  for insert to authenticated
  with check (
    exists (
      select 1 from public.reviews r
      where r.id = review_id and (r.user_id = auth.uid() or private.is_admin())
    )
  );

create policy review_photos_delete on public.review_photos
  for delete to authenticated
  using (
    exists (
      select 1 from public.reviews r
      where r.id = review_id and (r.user_id = auth.uid() or private.is_admin())
    )
  );

create policy moderation_events_select on public.moderation_events
  for select to authenticated
  using (private.is_admin() or actor_id = auth.uid()
    or (business_id is not null and private.is_business_owner(business_id)));

create policy moderation_events_admin_insert on public.moderation_events
  for insert to authenticated
  with check (private.is_admin() or actor_id = auth.uid());

-- Notify business owner of new reviews
create or replace function private.notify_on_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  bname text;
begin
  if tg_op = 'INSERT' then
    select owner_id, name into owner, bname from public.businesses where id = new.business_id;
    if owner is not null then
      insert into public.notifications (user_id, type, title, body, link)
      values (owner, 'new_review', 'Nova avaliação recebida',
              'Você recebeu uma nova avaliação em ' || coalesce(bname, 'seu negócio') || '.',
              '/empresa-area/avaliacoes');
    end if;
  elsif tg_op = 'UPDATE' then
    -- published
    if new.status = 'published' and old.status is distinct from 'published' then
      insert into public.notifications (user_id, type, title, body, link)
      values (new.user_id, 'review_published', 'Sua avaliação foi publicada',
              'Sua avaliação já está visível no perfil.',
              '/morador/avaliacoes');
    end if;
    -- reply
    if new.reply_text is not null and new.reply_text is distinct from old.reply_text then
      insert into public.notifications (user_id, type, title, body, link)
      values (new.user_id, 'review_reply', 'A empresa respondeu sua avaliação',
              left(new.reply_text, 140),
              '/morador/avaliacoes');
    end if;
    -- removed or adjustment
    if new.status = 'adjustment_requested' and old.status is distinct from 'adjustment_requested' then
      insert into public.notifications (user_id, type, title, body, link)
      values (new.user_id, 'review_adjustment', 'Sua avaliação precisa de ajuste',
              coalesce(new.moderation_notes, 'Revise o texto e envie novamente.'),
              '/morador/avaliacoes');
    end if;
    if new.status = 'removed' and old.status is distinct from 'removed' then
      insert into public.notifications (user_id, type, title, body, link)
      values (new.user_id, 'review_removed', 'Sua avaliação foi removida',
              coalesce(new.moderation_notes, 'A avaliação violou as regras de publicação.'),
              '/morador/avaliacoes');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_on_review on public.reviews;
create trigger trg_notify_on_review
  after insert or update on public.reviews
  for each row execute function private.notify_on_review();

-- Notify owner when business status changes
create or replace function private.notify_on_business_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.owner_id is not null and new.status is distinct from old.status then
    if new.status = 'active' then
      insert into public.notifications (user_id, type, title, body, link)
      values (new.owner_id, 'business_approved', 'Seu cadastro foi aprovado',
              'O perfil de ' || new.name || ' já está visível no Guia Local.',
              '/empresa-area/painel');
    elsif new.status = 'adjustments_requested' then
      insert into public.notifications (user_id, type, title, body, link)
      values (new.owner_id, 'business_adjustments', 'Seu cadastro precisa de ajustes',
              coalesce(new.adjustment_notes, 'Veja as observações e atualize o perfil.'),
              '/empresa-area/perfil');
    elsif new.status = 'rejected' then
      insert into public.notifications (user_id, type, title, body, link)
      values (new.owner_id, 'business_rejected', 'Seu cadastro não foi aprovado',
              coalesce(new.adjustment_notes, 'Entre em contato com o suporte.'),
              '/empresa-area/perfil');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_on_business_status on public.businesses;
create trigger trg_notify_on_business_status
  after update on public.businesses
  for each row execute function private.notify_on_business_status();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-photos', 'review-photos', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy review_photos_storage_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'review-photos');

create policy review_photos_storage_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'review-photos' and split_part(name, '/', 1) = auth.uid()::text);

create policy review_photos_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'review-photos' and split_part(name, '/', 1) = auth.uid()::text)
  with check (bucket_id = 'review-photos' and split_part(name, '/', 1) = auth.uid()::text);

create policy review_photos_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'review-photos' and (split_part(name, '/', 1) = auth.uid()::text or private.is_admin()));
