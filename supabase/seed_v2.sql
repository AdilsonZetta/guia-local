-- Categories for the home strip + demo service businesses (Juliana Limpeza etc.)
-- Demo password for new users: Demo@123456

insert into public.categories (id, name, slug, icon, description, active, show_on_home, sort_order)
values
  ('33333333-3333-4333-8333-333333333311', 'Limpeza', 'limpeza', 'broom', 'Limpeza residencial, pós-obra e comercial', true, true, 0),
  ('33333333-3333-4333-8333-333333333312', 'Eletricista', 'eletricista', 'zap', 'Instalações e reparos elétricos', true, true, 0),
  ('33333333-3333-4333-8333-333333333313', 'Encanador', 'encanador', 'droplets', 'Hidráulica residencial e comercial', true, true, 0),
  ('33333333-3333-4333-8333-333333333314', 'Ar-condicionado', 'ar-condicionado', 'snowflake', 'Instalação e manutenção de ar-condicionado', true, true, 0)
on conflict (id) do update set name = excluded.name, slug = excluded.slug, icon = excluded.icon, show_on_home = excluded.show_on_home, active = true;

-- Reorder home categories: Limpeza, Eletricista, Encanador, Ar-condicionado, Automotivo, Pets
update public.categories set show_on_home = false;
update public.categories set show_on_home = true, sort_order = 1, icon = 'broom' where slug = 'limpeza';
update public.categories set show_on_home = true, sort_order = 2, icon = 'zap' where slug = 'eletricista';
update public.categories set show_on_home = true, sort_order = 3, icon = 'droplets' where slug = 'encanador';
update public.categories set show_on_home = true, sort_order = 4, icon = 'snowflake' where slug = 'ar-condicionado';
update public.categories set show_on_home = true, sort_order = 5, icon = 'car' where slug = 'servicos-automotivos';
update public.categories set name = 'Automotivo' where slug = 'servicos-automotivos';
update public.categories set show_on_home = true, sort_order = 6, icon = 'paw-print', name = 'Pets' where slug = 'pet';

-- Unfeature old restaurants so the new service businesses lead the home
update public.businesses set featured = false;

create or replace function private.seed_user(
  p_id uuid, p_email text, p_name text, p_phone text, p_role public.user_role
) returns void
language plpgsql security definer set search_path = auth, public, extensions
as $$
begin
  if exists (select 1 from auth.users where id = p_id or email = p_email) then
    alter table public.profiles disable trigger trg_protect_profile_privileges;
    update public.profiles set role = p_role, phone = coalesce(p_phone, phone), full_name = coalesce(p_name, full_name) where id = p_id or email = p_email;
    alter table public.profiles enable trigger trg_protect_profile_privileges;
    return;
  end if;
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, email_change_token_current,
    email_change_confirm_status, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt('Demo@123456', extensions.gen_salt('bf')),
    now() - interval '30 days',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_name, 'phone', p_phone),
    now() - interval '30 days', now() - interval '30 days',
    '', '', '', '', '', 0, false, false
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), p_id, p_id::text,
    jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
    'email', now(), now() - interval '30 days', now() - interval '30 days'
  );
  alter table public.profiles disable trigger trg_protect_profile_privileges;
  update public.profiles set role = p_role, phone = p_phone, full_name = p_name where id = p_id;
  alter table public.profiles enable trigger trg_protect_profile_privileges;
end;
$$;

select private.seed_user('11111111-1111-4111-8111-111111111111', 'juliana.limpeza@example.com', 'Juliana Limpeza', '34991001111', 'business');
select private.seed_user('11111111-1111-4111-8111-111111111112', 'clima.certo@example.com', 'Ricardo Alves', '34991001112', 'business');
select private.seed_user('11111111-1111-4111-8111-111111111113', 'paulo.eletrica@example.com', 'Paulo Henrique', '34991001113', 'business');
select private.seed_user('11111111-1111-4111-8111-111111111114', 'brilho.casa@example.com', 'Camila Rocha', '34991001114', 'business');
select private.seed_user('11111111-1111-4111-8111-111111111115', 'capricho.limpeza@example.com', 'Patrícia Gomes', '34991001115', 'business');
select private.seed_user('11111111-1111-4111-8111-111111111116', 'lar.ordem@example.com', 'Renata Silva', '34991001116', 'business');
select private.seed_user('11111111-1111-4111-8111-111111111204', 'ana.p@example.com', 'Ana P.', '34992002004', 'client');
select private.seed_user('11111111-1111-4111-8111-111111111205', 'mariana.f@example.com', 'Mariana F.', '34992002005', 'client');
select private.seed_user('11111111-1111-4111-8111-111111111206', 'carlos.a@example.com', 'Carlos A.', '34992002006', 'client');
select private.seed_user('11111111-1111-4111-8111-111111111207', 'mariana.s@example.com', 'Mariana S.', '34992002007', 'client');

alter table public.businesses disable trigger trg_protect_business_privileges;
alter table public.reviews disable trigger trg_protect_review_privileges;
alter table public.reviews disable trigger trg_notify_on_review;
alter table public.businesses disable trigger trg_notify_on_business_status;

-- helper photo urls
-- unsplash
insert into public.businesses (
  id, owner_id, name, slug, tagline, description, category_id, neighborhood_id,
  address, phone, whatsapp, instagram, logo_url, cover_url,
  status, is_paused, home_service, receiving_orders, receiving_orders_until,
  featured, attendance_type, show_whatsapp, brand_color, brand_icon,
  created_at, approved_at
) values
(
  '44444444-4444-4444-8444-444444444411',
  '11111111-1111-4111-8111-111111111111',
  'Juliana Limpeza', 'juliana-limpeza',
  'Limpeza residencial',
  'Limpeza residencial e pós-obra, com atenção aos detalhes e cuidado com o seu espaço.',
  '33333333-3333-4333-8333-333333333311',
  '22222222-2222-4222-8222-222222222201',
  null, '34991001111', '5534991001111', 'julianalimpeza',
  null,
  'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=1600&q=80',
  'active', false, true, true, current_date + 20, true,
  'client_address', true, '#F87171', 'home',
  now() - interval '100 days', now() - interval '98 days'
),
(
  '44444444-4444-4444-8444-444444444412',
  '11111111-1111-4111-8111-111111111112',
  'Clima Certo', 'clima-certo',
  'Ar-condicionado',
  'Instalação, manutenção e limpeza de ar-condicionado residencial e comercial em Uberaba.',
  '33333333-3333-4333-8333-333333333314',
  '22222222-2222-4222-8222-222222222201',
  null, '34991001112', '5534991001112', 'climacerto',
  null,
  'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1600&q=80',
  'active', false, true, true, current_date + 25, true,
  'client_address', true, '#38BDF8', 'snowflake',
  now() - interval '80 days', now() - interval '78 days'
),
(
  '44444444-4444-4444-8444-444444444413',
  '11111111-1111-4111-8111-111111111113',
  'Paulo Elétrica', 'paulo-eletrica',
  'Eletricista',
  'Instalações, quadros elétricos, iluminação e reparos com segurança e garantia.',
  '33333333-3333-4333-8333-333333333312',
  '22222222-2222-4222-8222-222222222202',
  null, '34991001113', '5534991001113', 'pauloeletrica',
  null,
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1600&q=80',
  'active', false, true, false, current_date - 2, true,
  'client_address', true, '#FBBF24', 'zap',
  now() - interval '70 days', now() - interval '68 days'
),
(
  '44444444-4444-4444-8444-444444444414',
  '11111111-1111-4111-8111-111111111114',
  'Brilho em Casa', 'brilho-em-casa',
  'Limpeza residencial',
  'Faxina regular e pontual, com produtos de qualidade e equipe treinada.',
  '33333333-3333-4333-8333-333333333311',
  '22222222-2222-4222-8222-222222222202',
  null, '34991001114', '5534991001114', 'brilhoemcasa',
  null,
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1600&q=80',
  'active', false, true, true, current_date + 15, false,
  'client_address', true, '#60A5FA', 'sparkles',
  now() - interval '60 days', now() - interval '58 days'
),
(
  '44444444-4444-4444-8444-444444444415',
  '11111111-1111-4111-8111-111111111115',
  'Capricho Limpeza', 'capricho-limpeza',
  'Limpeza residencial',
  'Limpeza detalhada de casas e apartamentos, com horário flexível.',
  '33333333-3333-4333-8333-333333333311',
  '22222222-2222-4222-8222-222222222203',
  null, '34991001115', '5534991001115', 'capricholimpeza',
  null,
  'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1600&q=80',
  'active', false, true, false, current_date - 5, false,
  'client_address', true, '#C084FC', 'flower-2',
  now() - interval '50 days', now() - interval '48 days'
),
(
  '44444444-4444-4444-8444-444444444416',
  '11111111-1111-4111-8111-111111111116',
  'Lar em Ordem', 'lar-em-ordem',
  'Limpeza residencial',
  'Organização e limpeza pesada para deixar a casa pronta para receber.',
  '33333333-3333-4333-8333-333333333311',
  '22222222-2222-4222-8222-222222222201',
  null, '34991001116', '5534991001116', 'laremordem',
  null,
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80',
  'active', false, true, true, current_date + 10, false,
  'client_address', true, '#4ADE80', 'home',
  now() - interval '40 days', now() - interval '38 days'
)
on conflict (id) do nothing;

-- service areas for juliana: Centro, Abadia, Santa Maria
insert into public.business_service_areas (business_id, neighborhood_id)
select '44444444-4444-4444-8444-444444444411', id from public.neighborhoods
where slug in ('centro','abadia','santa-maria')
on conflict do nothing;
insert into public.business_service_areas (business_id, neighborhood_id)
select '44444444-4444-4444-8444-444444444412', id from public.neighborhoods
where slug in ('centro','abadia')
on conflict do nothing;
insert into public.business_service_areas (business_id, neighborhood_id)
select '44444444-4444-4444-8444-444444444413', id from public.neighborhoods
where slug in ('abadia')
on conflict do nothing;
insert into public.business_service_areas (business_id, neighborhood_id)
select '44444444-4444-4444-8444-444444444414', id from public.neighborhoods
where slug in ('abadia','centro')
on conflict do nothing;
insert into public.business_service_areas (business_id, neighborhood_id)
select '44444444-4444-4444-8444-444444444415', id from public.neighborhoods
where slug in ('santa-maria','centro')
on conflict do nothing;
insert into public.business_service_areas (business_id, neighborhood_id)
select '44444444-4444-4444-8444-444444444416', id from public.neighborhoods
where slug in ('centro','abadia')
on conflict do nothing;

insert into public.business_hours (business_id, weekday, open_time, close_time, is_closed)
select b.id, d, case when d = 0 then null when d = 6 then '08:00'::time else '08:00'::time end,
  case when d = 0 then null when d = 6 then '12:00'::time else '18:00'::time end,
  d = 0
from (values
  ('44444444-4444-4444-8444-444444444411'::uuid),
  ('44444444-4444-4444-8444-444444444412'::uuid),
  ('44444444-4444-4444-8444-444444444413'::uuid),
  ('44444444-4444-4444-8444-444444444414'::uuid),
  ('44444444-4444-4444-8444-444444444415'::uuid),
  ('44444444-4444-4444-8444-444444444416'::uuid)
) as b(id)
cross join generate_series(0,6) as d
on conflict (business_id, weekday) do nothing;

insert into public.services (id, business_id, name, description, icon, sort_order, active) values
  ('66666666-6666-4666-8666-666666666601', '44444444-4444-4444-8444-444444444411', 'Limpeza residencial', 'Limpeza completa para casas e apartamentos.', 'home', 1, true),
  ('66666666-6666-4666-8666-666666666602', '44444444-4444-4444-8444-444444444411', 'Limpeza pós-obra', 'Cuidado com o imóvel após reformas.', 'broom', 2, true),
  ('66666666-6666-4666-8666-666666666603', '44444444-4444-4444-8444-444444444411', 'Limpeza para mudança', 'Preparação do imóvel para entrada ou saída.', 'package', 3, true),
  ('66666666-6666-4666-8666-666666666604', '44444444-4444-4444-8444-444444444412', 'Instalação de ar-condicionado', 'Instalação residencial e comercial.', 'snowflake', 1, true),
  ('66666666-6666-4666-8666-666666666605', '44444444-4444-4444-8444-444444444413', 'Instalação elétrica', 'Quadros, tomadas e iluminação.', 'zap', 1, true)
on conflict (id) do nothing;

insert into public.business_photos (business_id, url, is_cover, sort_order, alt) values
  ('44444444-4444-4444-8444-444444444411', 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=1200&q=80', true, 1, 'Cesta de limpeza'),
  ('44444444-4444-4444-8444-444444444411', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80', false, 2, 'Limpeza de bancada'),
  ('44444444-4444-4444-8444-444444444411', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80', false, 3, 'Quarto organizado'),
  ('44444444-4444-4444-8444-444444444411', 'https://images.unsplash.com/photo-1556912173-46c336c7fd55?auto=format&fit=crop&w=1200&q=80', false, 4, 'Cozinha'),
  ('44444444-4444-4444-8444-444444444411', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80', false, 5, 'Sala'),
  ('44444444-4444-4444-8444-444444444411', 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&q=80', false, 6, 'Banheiro'),
  ('44444444-4444-4444-8444-444444444411', 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=1200&q=80', false, 7, 'Bancada'),
  ('44444444-4444-4444-8444-444444444411', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80', false, 8, 'Janelas'),
  ('44444444-4444-4444-8444-444444444412', 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80', true, 1, 'Instalação de ar-condicionado'),
  ('44444444-4444-4444-8444-444444444413', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80', true, 1, 'Quadro elétrico'),
  ('44444444-4444-4444-8444-444444444414', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80', true, 1, 'Limpeza'),
  ('44444444-4444-4444-8444-444444444415', 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1200&q=80', true, 1, 'Aspirador'),
  ('44444444-4444-4444-8444-444444444416', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80', true, 1, 'Quarto pronto');

-- reviews for Juliana (published)
insert into public.reviews (id, business_id, user_id, rating, title, body, status, reply_text, replied_at, created_at, service_id, experience_month)
values
(
  '55555555-5555-4555-8555-555555555521',
  '44444444-4444-4444-8444-444444444411',
  '11111111-1111-4111-8111-111111111205',
  5, null, 'Muito caprichosa e pontual. Recomendo!',
  'published', 'Obrigada, Mariana! Foi um prazer atender você.', now() - interval '10 days',
  now() - interval '32 days',
  '66666666-6666-4666-8666-666666666601', date '2024-09-01'
),
(
  '55555555-5555-4555-8555-555555555522',
  '44444444-4444-4444-8444-444444444411',
  '11111111-1111-4111-8111-111111111206',
  4, null, 'Bom atendimento e serviço bem feito.',
  'published', null, null, now() - interval '9 days',
  '66666666-6666-4666-8666-666666666602', date '2024-10-01'
),
(
  '55555555-5555-4555-8555-555555555523',
  '44444444-4444-4444-8444-444444444411',
  '11111111-1111-4111-8111-111111111207',
  3, null, 'A limpeza ficou boa, mas houve atraso.',
  'published', null, null, now() - interval '11 days',
  '66666666-6666-4666-8666-666666666601', date '2024-10-01'
)
on conflict (business_id, user_id) do nothing;

-- more ratings to approach 4.7 (14 five-star would be a lot; add a few more from existing clients on other accounts? unique per user. skip extra)
-- visits/clicks for charts
insert into public.profile_visits (business_id, source, created_at)
select '44444444-4444-4444-8444-444444444411', (array['home','search','share','link-in-bio','instagram'])[1+(i%5)], now() - (i || ' hours')::interval
from generate_series(1, 180) as i;

insert into public.whatsapp_clicks (business_id, source, created_at)
select '44444444-4444-4444-8444-444444444411', (array['profile','search','instagram','google','direct'])[1+(i%5)], now() - (i || ' hours')::interval
from generate_series(1, 50) as i;

update public.link_in_bio
   set slug = 'juliana-limpeza', theme = 'forest', headline = 'Juliana Limpeza',
       bio = 'Limpeza residencial e pós-obra em Uberaba.', enabled = true
 where business_id = '44444444-4444-4444-8444-444444444411';

delete from public.link_in_bio_buttons where link_id in (
  select id from public.link_in_bio where business_id = '44444444-4444-4444-8444-444444444411'
);
insert into public.link_in_bio_buttons (link_id, label, url, icon, sort_order, enabled)
select l.id, x.label, x.url, x.icon, x.sort_order, true
from public.link_in_bio l
join lateral (values
  ('Pedir orçamento', 'https://wa.me/5534991001111', 'whatsapp', 1),
  ('Conhecer meus serviços', '/guia-local/empresa/juliana-limpeza?tab=servicos', 'broom', 2),
  ('Ver avaliações', '/guia-local/empresa/juliana-limpeza?tab=avaliacoes', 'star', 3),
  ('Instagram', 'https://instagram.com/julianalimpeza', 'instagram', 4)
) as x(label, url, icon, sort_order) on true
where l.business_id = '44444444-4444-4444-8444-444444444411';

drop function private.seed_user(uuid, text, text, text, public.user_role);

alter table public.businesses enable trigger trg_protect_business_privileges;
alter table public.reviews enable trigger trg_protect_review_privileges;
alter table public.reviews enable trigger trg_notify_on_review;
alter table public.businesses enable trigger trg_notify_on_business_status;
