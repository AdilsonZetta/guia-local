-- Residents can report a review without gaining update access to other reviews.
create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 10 and 2000),
  created_at timestamptz not null default now(),
  unique (review_id, user_id)
);
alter table public.review_reports enable row level security;
create policy "Residents submit review reports" on public.review_reports for insert to authenticated with check (auth.uid() = user_id);
create policy "Residents read own reports" on public.review_reports for select to authenticated using (auth.uid() = user_id);
create policy "Admins read review reports" on public.review_reports for select to authenticated using (private.is_admin());

-- The original invoker view inherits the private profiles RLS and hides review
-- authors from visitors. Expose only the public identity of published authors.
create or replace view public.public_profiles
with (security_invoker = false, security_barrier = true) as
select p.id, p.full_name, p.avatar_url
from public.profiles p
where p.status = 'active'
  and exists (select 1 from public.reviews r where r.user_id = p.id and r.status = 'published');
revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;
