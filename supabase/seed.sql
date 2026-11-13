-- Demo data for Guia Local (Uberaba, MG)
-- Demo login password for all seeded users: Demo@123456

-- Allow privileged field values during seed
alter table public.profiles disable trigger trg_protect_profile_privileges;
alter table public.businesses disable trigger trg_protect_business_privileges;
alter table public.reviews disable trigger trg_protect_review_privileges;

create or replace function private.seed_user(
  p_id uuid,
  p_email text,
  p_name text,
  p_phone text,
  p_role public.user_role
)
returns void
language plpgsql
security definer
set search_path = auth, public, extensions
as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change, email_change_token_current,
    email_change_confirm_status, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    extensions.crypt('Demo@123456', extensions.gen_salt('bf')),
    now() - interval '20 days',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_name, 'phone', p_phone),
    now() - interval '20 days',
    now() - interval '20 days',
    '', '', '', '', '',
    0, false, false
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    p_id,
    p_id::text,
    jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
    'email',
    now() - interval '2 days',
    now() - interval '20 days',
    now() - interval '20 days'
  );

  update public.profiles
     set role = p_role,
         phone = p_phone,
         full_name = p_name
   where id = p_id;
end;
$$;

select private.seed_user('11111111-1111-4111-8111-111111111101', 'sabor.mineiro@example.com', 'Carlos Mendes', '34991001001', 'business');
select private.seed_user('11111111-1111-4111-8111-111111111102', 'ana.beleza@example.com', 'Ana Souza', '34991001002', 'business');
select private.seed_user('11111111-1111-4111-8111-111111111103', 'clinica.vida@example.com', 'Helena Dias', '34991001003', 'business');
select private.seed_user('11111111-1111-4111-8111-111111111104', 'reforma.total@example.com', 'Paulo Oliveira', '34991001004', 'business');
select private.seed_user('11111111-1111-4111-8111-111111111105', 'auto.uberaba@example.com', 'Roberto Lima', '34991001005', 'business');
select private.seed_user('11111111-1111-4111-8111-111111111106', 'petamigo@example.com', 'Fernanda Costa', '34991001006', 'business');
select private.seed_user('11111111-1111-4111-8111-111111111107', 'techfix@example.com', 'Lucas Martins', '34991001007', 'business');
select private.seed_user('11111111-1111-4111-8111-111111111108', 'tommaior@example.com', 'Marina Teixeira', '34991001008', 'business');
select private.seed_user('11111111-1111-4111-8111-111111111109', 'barbearia.ze@example.com', 'José Ferreira', '34991001009', 'business');
select private.seed_user('11111111-1111-4111-8111-111111111201', 'joao.morador@example.com', 'João Pedro Alves', '34992002001', 'client');
select private.seed_user('11111111-1111-4111-8111-111111111202', 'maria.moradora@example.com', 'Maria Clara Santos', '34992002002', 'client');
select private.seed_user('11111111-1111-4111-8111-111111111203', 'rafael.morador@example.com', 'Rafael Nunes', '34992002003', 'client');

insert into public.neighborhoods (id, name, slug, active, sort_order) values
  ('22222222-2222-4222-8222-222222222201', 'Centro', 'centro', true, 1),
  ('22222222-2222-4222-8222-222222222202', 'Abadia', 'abadia', true, 2),
  ('22222222-2222-4222-8222-222222222203', 'Santa Maria', 'santa-maria', true, 3),
  ('22222222-2222-4222-8222-222222222204', 'São Benedito', 'sao-benedito', true, 4);

insert into public.categories (id, name, slug, icon, description, active, show_on_home, sort_order) values
  ('33333333-3333-4333-8333-333333333301', 'Alimentação', 'alimentacao', 'utensils', 'Restaurantes, lanchonetes e docerias', true, true, 1),
  ('33333333-3333-4333-8333-333333333302', 'Beleza e estética', 'beleza-e-estetica', 'sparkles', 'Salões, barbearias e clínicas de estética', true, true, 2),
  ('33333333-3333-4333-8333-333333333303', 'Saúde e bem-estar', 'saude-e-bem-estar', 'heart-pulse', 'Clínicas, terapeutas e academias', true, true, 3),
  ('33333333-3333-4333-8333-333333333304', 'Casa e reforma', 'casa-e-reforma', 'hammer', 'Pedreiros, pintores, elétricos e reformas', true, true, 4),
  ('33333333-3333-4333-8333-333333333305', 'Serviços automotivos', 'servicos-automotivos', 'car', 'Oficinas, auto elétricas e lava-rápidos', true, true, 5),
  ('33333333-3333-4333-8333-333333333306', 'Educação', 'educacao', 'graduation-cap', 'Cursos, escolas e professores particulares', true, true, 6),
  ('33333333-3333-4333-8333-333333333307', 'Pet', 'pet', 'paw-print', 'Pet shops, clínicas veterinárias e banho e tosa', true, true, 7),
  ('33333333-3333-4333-8333-333333333308', 'Tecnologia', 'tecnologia', 'smartphone', 'Assistência técnica, informática e celular', true, true, 8),
  ('33333333-3333-4333-8333-333333333309', 'Eventos', 'eventos', 'party-popper', 'Buffets, decoração e fotografia', true, false, 9),
  ('33333333-3333-4333-8333-333333333310', 'Serviços domésticos', 'servicos-domesticos', 'home', 'Diaristas, encanadores e chaveiros', true, true, 10);

insert into public.businesses (
  id, owner_id, name, slug, tagline, description, category_id, neighborhood_id,
  address, phone, whatsapp, email, website, instagram, logo_url, cover_url,
  status, is_paused, home_service, receiving_orders, receiving_orders_until,
  featured, created_at, approved_at
) values
(
  '44444444-4444-4444-8444-444444444401',
  '11111111-1111-4111-8111-111111111101',
  'Sabor Mineiro',
  'sabor-mineiro',
  'Comida caseira com gosto de Minas',
  'Restaurante familiar no Centro de Uberaba, com pratos mineiros, almoço executivo e opções vegetarianas. Ambiente acolhedor e atendimento rápido.',
  '33333333-3333-4333-8333-333333333301',
  '22222222-2222-4222-8222-222222222201',
  'Rua Artur Machado, 320, Centro, Uberaba-MG',
  '34991001001', '5534991001001', 'contato@sabormineiro.example.com',
  'https://sabormineiro.example.com', 'sabormineirouberaba',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&h=200&q=80',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80',
  'active', false, false, true, current_date + 18, true,
  now() - interval '80 days', now() - interval '78 days'
),
(
  '44444444-4444-4444-8444-444444444402',
  '11111111-1111-4111-8111-111111111102',
  'Studio Ana Beleza',
  'studio-ana-beleza',
  'Cabelo, estética e bem-estar',
  'Salão completo no bairro Santa Maria. Cortes, coloração, manicure, design de sobrancelhas e tratamentos faciais com hora marcada.',
  '33333333-3333-4333-8333-333333333302',
  '22222222-2222-4222-8222-222222222203',
  'Rua Santa Quitéria, 148, Santa Maria, Uberaba-MG',
  '34991001002', '5534991001002', 'ana@studiobeleza.example.com',
  null, 'studioanabeleza',
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=200&h=200&q=80',
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1600&q=80',
  'active', false, false, true, current_date + 22, true,
  now() - interval '70 days', now() - interval '68 days'
),
(
  '44444444-4444-4444-8444-444444444403',
  '11111111-1111-4111-8111-111111111103',
  'Clínica Vida',
  'clinica-vida',
  'Cuidado de verdade, perto de você',
  'Clínica multidisciplinar na Abadia, com consultas em clínica geral, pediatria, fisioterapia e exames simples. Atendimento particular e convênios selecionados.',
  '33333333-3333-4333-8333-333333333303',
  '22222222-2222-4222-8222-222222222202',
  'Av. Leopoldino de Oliveira, 2100, Abadia, Uberaba-MG',
  '34991001003', '5534991001003', 'contato@clinicavida.example.com',
  'https://clinicavida.example.com', 'clinicavidauberaba',
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=200&h=200&q=80',
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=80',
  'active', false, false, true, current_date + 25, true,
  now() - interval '90 days', now() - interval '88 days'
),
(
  '44444444-4444-4444-8444-444444444404',
  '11111111-1111-4111-8111-111111111104',
  'Reforma Total',
  'reforma-total',
  'Reformas residenciais com prazo e capricho',
  'Equipe de pedreiros, pintores e eletricistas para reformas residenciais e comerciais. Orçamento sem compromisso e atendimento em toda Uberaba.',
  '33333333-3333-4333-8333-333333333304',
  '22222222-2222-4222-8222-222222222204',
  'Rua São Sebastião, 75, São Benedito, Uberaba-MG',
  '34991001004', '5534991001004', 'paulo@reformatotal.example.com',
  null, 'reformatotaluberaba',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=200&h=200&q=80',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=80',
  'active', false, true, true, current_date + 12, false,
  now() - interval '40 days', now() - interval '38 days'
),
(
  '44444444-4444-4444-8444-444444444405',
  '11111111-1111-4111-8111-111111111105',
  'Auto Center Uberaba',
  'auto-center-uberaba',
  'Mecânica, elétrica e revisão completa',
  'Oficina completa no Centro: revisão, freios, suspensão, auto elétrica e diagnóstico computadorizado. Atendimento para carros e utilitários leves.',
  '33333333-3333-4333-8333-333333333305',
  '22222222-2222-4222-8222-222222222201',
  'Av. Santos Dumont, 890, Centro, Uberaba-MG',
  '34991001005', '5534991001005', 'contato@autocenteruberaba.example.com',
  null, 'autocenteruberaba',
  'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=200&h=200&q=80',
  'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1600&q=80',
  'active', false, false, true, current_date + 9, false,
  now() - interval '60 days', now() - interval '58 days'
),
(
  '44444444-4444-4444-8444-444444444406',
  '11111111-1111-4111-8111-111111111106',
  'PetAmigo',
  'petamigo',
  'Banho, tosa e muito carinho',
  'Pet shop e banho e tosa na Abadia, com produtos, rações selecionadas e veterinário parceiro para consultas de rotina.',
  '33333333-3333-4333-8333-333333333307',
  '22222222-2222-4222-8222-222222222202',
  'Rua da Abadia, 412, Abadia, Uberaba-MG',
  '34991001006', '5534991001006', 'oi@petamigo.example.com',
  null, 'petamigouberaba',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=200&h=200&q=80',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1600&q=80',
  'active', false, true, true, current_date + 27, true,
  now() - interval '50 days', now() - interval '48 days'
),
(
  '44444444-4444-4444-8444-444444444407',
  '11111111-1111-4111-8111-111111111107',
  'TechFix Assistência',
  'techfix-assistencia',
  'Celular, notebook e conserto rápido',
  'Assistência técnica especializada em smartphones, notebooks e tablets. Troca de tela, bateria e recuperação de dados com garantia.',
  '33333333-3333-4333-8333-333333333308',
  '22222222-2222-4222-8222-222222222201',
  'Rua Governador Valadares, 55, Centro, Uberaba-MG',
  '34991001007', '5534991001007', 'lucas@techfix.example.com',
  'https://techfix.example.com', 'techfixuberaba',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=200&h=200&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80',
  'active', false, false, true, current_date + 15, false,
  now() - interval '35 days', now() - interval '33 days'
),
(
  '44444444-4444-4444-8444-444444444408',
  '11111111-1111-4111-8111-111111111108',
  'Escola de Música Tom Maior',
  'escola-tom-maior',
  'Aulas de instrumento para todas as idades',
  'Escola de música em Santa Maria com aulas de violão, teclado, canto e bateria. Turmas infantis e adultos, presenciais e online.',
  '33333333-3333-4333-8333-333333333306',
  '22222222-2222-4222-8222-222222222203',
  'Rua Itália, 90, Santa Maria, Uberaba-MG',
  '34991001008', '5534991001008', 'contato@tommaior.example.com',
  null, 'escolatommaior',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=200&h=200&q=80',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1600&q=80',
  'active', false, false, false, null, false,
  now() - interval '45 days', now() - interval '43 days'
),
(
  '44444444-4444-4444-8444-444444444409',
  '11111111-1111-4111-8111-111111111109',
  'Barbearia do Zé',
  'barbearia-do-ze',
  'Corte clássico e barba desenhada',
  'Barbearia tradicional pedindo cadastro no Guia Local. Atendimento no Centro, com hora marcada e ambiente casual.',
  '33333333-3333-4333-8333-333333333302',
  '22222222-2222-4222-8222-222222222201',
  'Rua da Constituição, 18, Centro, Uberaba-MG',
  '34991001009', '5534991001009', 'ze@barbearia.example.com',
  null, 'barbeariadoze',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=200&h=200&q=80',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1600&q=80',
  'pending', false, false, false, null, false,
  now() - interval '2 days', null
),
(
  '44444444-4444-4444-8444-444444444410',
  '11111111-1111-4111-8111-111111111104',
  'Oliveira Elétrica',
  'oliveira-eletrica',
  'Instalações e manutenção residencial',
  'Cadastro em ajustes: falta informar bairros de atendimento e fotos recentes dos serviços.',
  '33333333-3333-4333-8333-333333333304',
  '22222222-2222-4222-8222-222222222204',
  'Rua São Benedito, 200, São Benedito, Uberaba-MG',
  '34991001010', '5534991001010', 'oliveira@eletrica.example.com',
  null, null,
  null,
  null,
  'adjustments_requested', false, true, false, null, false,
  now() - interval '8 days', null
);

update public.businesses
   set adjustment_notes = 'Inclua fotos reais dos serviços e os bairros em que atende para aprovarmos o perfil.'
 where id = '44444444-4444-4444-8444-444444444410';

-- Hours: 0=Sunday ... 6=Saturday. Most closed Sunday, Sat shorter.
insert into public.business_hours (business_id, weekday, open_time, close_time, is_closed)
select b.id, d.weekday,
  case when d.weekday = 0 then null when d.weekday = 6 then '08:00'::time else '08:00'::time end,
  case when d.weekday = 0 then null when d.weekday = 6 then '13:00'::time else '18:00'::time end,
  d.weekday = 0
from public.businesses b
cross join generate_series(0, 6) as d(weekday)
where b.status = 'active';

-- Sabor Mineiro open Sunday for lunch
update public.business_hours
   set is_closed = false, open_time = '11:00', close_time = '15:00'
 where business_id = '44444444-4444-4444-8444-444444444401' and weekday = 0;

insert into public.business_service_areas (business_id, neighborhood_id)
select '44444444-4444-4444-8444-444444444404'::uuid, id from public.neighborhoods
union all
select '44444444-4444-4444-8444-444444444406'::uuid, id from public.neighborhoods
union all
select '44444444-4444-4444-8444-444444444401'::uuid, '22222222-2222-4222-8222-222222222201'::uuid
union all
select '44444444-4444-4444-8444-444444444403'::uuid, '22222222-2222-4222-8222-222222222202'::uuid
union all
select '44444444-4444-4444-8444-444444444403'::uuid, '22222222-2222-4222-8222-222222222201'::uuid;

insert into public.services (business_id, name, description, price, price_label, sort_order) values
  ('44444444-4444-4444-8444-444444444401', 'Almoço executivo', 'Prato do dia com suco e sobremesa', 32.00, 'A partir de R$ 32', 1),
  ('44444444-4444-4444-8444-444444444401', 'Feijoada aos sábados', 'Feijoada completa para duas pessoas', 89.00, 'R$ 89', 2),
  ('44444444-4444-4444-8444-444444444401', 'Marmita para viagem', 'Quentinha com duas opções de proteína', 22.00, 'R$ 22', 3),
  ('44444444-4444-4444-8444-444444444402', 'Corte e hidratação', 'Corte personalizado com tratamento', 120.00, 'R$ 120', 1),
  ('44444444-4444-4444-8444-444444444402', 'Design de sobrancelhas', 'Com henna ou tintura', 45.00, 'R$ 45', 2),
  ('44444444-4444-4444-8444-444444444402', 'Manicure e pedicure', 'Atendimento com hora marcada', 70.00, 'R$ 70', 3),
  ('44444444-4444-4444-8444-444444444403', 'Consulta clínica geral', 'Avaliação e encaminhamentos', 220.00, 'R$ 220', 1),
  ('44444444-4444-4444-8444-444444444403', 'Fisioterapia (sessão)', 'Sessão de 50 minutos', 130.00, 'R$ 130', 2),
  ('44444444-4444-4444-8444-444444444404', 'Pintura residencial', 'Mão de obra por cômodo', 450.00, 'A partir de R$ 450', 1),
  ('44444444-4444-4444-8444-444444444404', 'Reforma de banheiro', 'Projeto e execução', 3200.00, 'A partir de R$ 3.200', 2),
  ('44444444-4444-4444-8444-444444444405', 'Revisão completa', 'Óleo, filtros e checklist de 30 itens', 380.00, 'A partir de R$ 380', 1),
  ('44444444-4444-4444-8444-444444444405', 'Diagnóstico eletrônico', 'Leitura de módulos e orçamento', 90.00, 'R$ 90', 2),
  ('44444444-4444-4444-8444-444444444406', 'Banho e tosa higiênica', 'Cães de pequeno e médio porte', 80.00, 'A partir de R$ 80', 1),
  ('44444444-4444-4444-8444-444444444406', 'Pacote mensal de banhos', 'Quatro banhos no mês', 260.00, 'R$ 260', 2),
  ('44444444-4444-4444-8444-444444444407', 'Troca de tela de celular', 'Peças com garantia de 90 dias', 280.00, 'A partir de R$ 280', 1),
  ('44444444-4444-4444-8444-444444444407', 'Formatação e backup', 'Notebook ou desktop', 150.00, 'R$ 150', 2),
  ('44444444-4444-4444-8444-444444444408', 'Aula particular de violão', 'Aula de 50 minutos, presencial ou online', 90.00, 'R$ 90 / aula', 1),
  ('44444444-4444-4444-8444-444444444408', 'Curso trimestral infantil', 'Uma aula por semana', 540.00, 'R$ 540 / trimestre', 2);

insert into public.business_photos (business_id, url, is_cover, sort_order, alt) values
  ('44444444-4444-4444-8444-444444444401', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80', true, 1, 'Salão do restaurante'),
  ('44444444-4444-4444-8444-444444444401', 'https://images.unsplash.com/photo-1544025162-d76690232da6?auto=format&fit=crop&w=1200&q=80', false, 2, 'Prato mineiro'),
  ('44444444-4444-4444-8444-444444444401', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80', false, 3, 'Mesa posta'),
  ('44444444-4444-4444-8444-444444444402', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80', true, 1, 'Interior do salão'),
  ('44444444-4444-4444-8444-444444444402', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80', false, 2, 'Atendimento de cabelo'),
  ('44444444-4444-4444-8444-444444444403', 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80', true, 1, 'Recepção da clínica'),
  ('44444444-4444-4444-8444-444444444403', 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80', false, 2, 'Consultório'),
  ('44444444-4444-4444-8444-444444444404', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80', true, 1, 'Obra em andamento'),
  ('44444444-4444-4444-8444-444444444405', 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1200&q=80', true, 1, 'Oficina'),
  ('44444444-4444-4444-8444-444444444406', 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80', true, 1, 'Cães no pet shop'),
  ('44444444-4444-4444-8444-444444444406', 'https://images.unsplash.com/photo-1541364983171-4e88a8d53744?auto=format&fit=crop&w=1200&q=80', false, 2, 'Banho e tosa'),
  ('44444444-4444-4444-8444-444444444407', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80', true, 1, 'Bancada técnica'),
  ('44444444-4444-4444-8444-444444444408', 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80', true, 1, 'Sala de aula de música');

-- Reviews
insert into public.reviews (
  id, business_id, user_id, rating, title, body, status, reply_text, replied_at, created_at,
  reported_by_business, report_reason, reported_at, flag_reason, moderation_notes
) values
(
  '55555555-5555-4555-8555-555555555501',
  '44444444-4444-4444-8444-444444444401',
  '11111111-1111-4111-8111-111111111201',
  5, 'Almoço excelente',
  'Comida gostosa, porção generosa e atendimento rápido. Voltarei com a família.',
  'published', 'Obrigado, João! Foi um prazer receber vocês.', now() - interval '10 days',
  now() - interval '14 days', false, null, null, null, null
),
(
  '55555555-5555-4555-8555-555555555502',
  '44444444-4444-4444-8444-444444444401',
  '11111111-1111-4111-8111-111111111202',
  4, 'Muito gostoso',
  'O tropeiro estava ótimo. Só achei o estacionamento um pouco apertado.',
  'published', null, null, now() - interval '6 days',
  false, null, null, null, null
),
(
  '55555555-5555-4555-8555-555555555503',
  '44444444-4444-4444-8444-444444444402',
  '11111111-1111-4111-8111-111111111202',
  5, 'Atendimento impecável',
  'A Ana é muito atenciosa e o resultado do cabelo ficou lindo. Recomendo demais.',
  'published', 'Maria, obrigada! Qualquer hora é só chamar.', now() - interval '8 days',
  now() - interval '12 days', false, null, null, null, null
),
(
  '55555555-5555-4555-8555-555555555504',
  '44444444-4444-4444-8444-444444444403',
  '11111111-1111-4111-8111-111111111203',
  5, 'Profissionais atenciosos',
  'Consulta pontual e explicação clara. Clínica limpa e organizada.',
  'published', 'Ficamos felizes em ajudar, Rafael.', now() - interval '4 days',
  now() - interval '9 days', false, null, null, null, null
),
(
  '55555555-5555-4555-8555-555555555505',
  '44444444-4444-4444-8444-444444444406',
  '11111111-1111-4111-8111-111111111201',
  5, 'Meu cachorro saiu lindo',
  'Banho caprichado e a equipe trata os animais com muito carinho.',
  'published', null, null, now() - interval '3 days',
  false, null, null, null, null
),
(
  '55555555-5555-4555-8555-555555555506',
  '44444444-4444-4444-8444-444444444407',
  '11111111-1111-4111-8111-111111111203',
  4, 'Consertou no mesmo dia',
  'Tela trocada rápido e com garantia. Preço justo.',
  'published', 'Valeu, Rafael! Qualquer coisa estamos aqui.', now() - interval '2 days',
  now() - interval '5 days', false, null, null, null, null
),
(
  '55555555-5555-4555-8555-555555555507',
  '44444444-4444-4444-8444-444444444404',
  '11111111-1111-4111-8111-111111111202',
  5, 'Reforma do banheiro perfeita',
  'Equipe pontual e acabamento muito bom. Super indico.',
  'published', null, null, now() - interval '7 days',
  false, null, null, null, null
),
(
  '55555555-5555-4555-8555-555555555508',
  '44444444-4444-4444-8444-444444444405',
  '11111111-1111-4111-8111-111111111201',
  3, 'Demorou mais do que o combinado',
  'O serviço ficou bom, mas a revisão atrasou dois dias. Gostaria de uma explicação.',
  'pending', null, null, now() - interval '1 day',
  false, null, null, null, null
),
(
  '55555555-5555-4555-8555-555555555509',
  '44444444-4444-4444-8444-444444444408',
  '11111111-1111-4111-8111-111111111203',
  2, 'Não gostei da aula experimental',
  'Achei desorganizado e o professor atrasou. Texto possivelmente injusto.',
  'flagged', null, null, now() - interval '2 days',
  true, 'A avaliação não corresponde à aula dada e usa tom agressivo.', now() - interval '1 day',
  'Denunciada pelo responsável da empresa', null
),
(
  '55555555-5555-4555-8555-555555555510',
  '44444444-4444-4444-8444-444444444402',
  '11111111-1111-4111-8111-111111111203',
  5, 'Sobrancelha impecável',
  'Ficou natural e o atendimento foi ótimo. Já indiquei para amigas.',
  'pending', null, null, now() - interval '8 hours',
  false, null, null, null, null
);

insert into public.favorites (user_id, business_id) values
  ('11111111-1111-4111-8111-111111111201', '44444444-4444-4444-8444-444444444401'),
  ('11111111-1111-4111-8111-111111111201', '44444444-4444-4444-8444-444444444406'),
  ('11111111-1111-4111-8111-111111111202', '44444444-4444-4444-8444-444444444402'),
  ('11111111-1111-4111-8111-111111111202', '44444444-4444-4444-8444-444444444403'),
  ('11111111-1111-4111-8111-111111111203', '44444444-4444-4444-8444-444444444407');

insert into public.suggestions (suggested_by, suggester_name, business_name, category_id, neighborhood_id, phone, notes, status, created_at)
values
(
  '11111111-1111-4111-8111-111111111201',
  'João Pedro Alves',
  'Padaria Pão Quente',
  '33333333-3333-4333-8333-333333333301',
  '22222222-2222-4222-8222-222222222201',
  '34988881111',
  'Padaria nova no Centro, com pão quente o dia todo e café da manhã.',
  'pending',
  now() - interval '1 day'
),
(
  '11111111-1111-4111-8111-111111111202',
  'Maria Clara Santos',
  'Chaveiro 24h Uberaba',
  '33333333-3333-4333-8333-333333333310',
  '22222222-2222-4222-8222-222222222202',
  '34988882222',
  'Atende madrugada na Abadia e no Centro.',
  'pending',
  now() - interval '3 days'
);

-- Link in bio customizations (rows already created by trigger)
update public.link_in_bio
   set slug = 'sabor-mineiro', theme = 'forest', headline = 'Sabor Mineiro', bio = 'Almoço mineiro no Centro de Uberaba. Peça pelo WhatsApp.'
 where business_id = '44444444-4444-4444-8444-444444444401';
update public.link_in_bio
   set slug = 'ana-beleza', theme = 'rose', headline = 'Studio Ana Beleza', bio = 'Beleza com hora marcada em Santa Maria.'
 where business_id = '44444444-4444-4444-8444-444444444402';
update public.link_in_bio
   set slug = 'clinica-vida', theme = 'ocean', headline = 'Clínica Vida', bio = 'Cuidado de verdade, perto de você.'
 where business_id = '44444444-4444-4444-8444-444444444403';
update public.link_in_bio
   set slug = 'petamigo', theme = 'sand', headline = 'PetAmigo', bio = 'Banho, tosa e carinho na Abadia.'
 where business_id = '44444444-4444-4444-8444-444444444406';

insert into public.link_in_bio_buttons (link_id, label, url, icon, sort_order, enabled)
select l.id, x.label, x.url, x.icon, x.sort_order, true
from public.link_in_bio l
join public.businesses b on b.id = l.business_id
join lateral (values
  ('Chamar no WhatsApp', 'https://wa.me/' || b.whatsapp, 'whatsapp', 1),
  ('Ver perfil no Guia Local', 'https://adilsonzetta.github.io/guia-local/empresa/' || b.slug, 'globe', 2),
  ('Instagram', 'https://instagram.com/' || coalesce(b.instagram, ''), 'instagram', 3)
) as x(label, url, icon, sort_order) on true
where l.slug in ('sabor-mineiro', 'ana-beleza', 'clinica-vida', 'petamigo');

-- Analytics: visits, searches, whatsapp clicks over 30 days
insert into public.profile_visits (business_id, source, created_at)
select bid, src, now() - (g || ' hours')::interval
from (
  values
    ('44444444-4444-4444-8444-444444444401'::uuid, 220),
    ('44444444-4444-4444-8444-444444444402'::uuid, 180),
    ('44444444-4444-4444-8444-444444444403'::uuid, 160),
    ('44444444-4444-4444-8444-444444444404'::uuid, 90),
    ('44444444-4444-4444-8444-444444444405'::uuid, 110),
    ('44444444-4444-4444-8444-444444444406'::uuid, 140),
    ('44444444-4444-4444-8444-444444444407'::uuid, 125),
    ('44444444-4444-4444-8444-444444444408'::uuid, 70)
) as b(bid, n)
cross join lateral generate_series(1, n) as s(i)
cross join lateral (select (array['home','search','share','link-in-bio','direct'])[1 + (i % 5)] as src) t
cross join lateral (select (i * 5 + (i % 17)) as g) z;

insert into public.whatsapp_clicks (business_id, source, created_at)
select bid, src, now() - (g || ' hours')::interval
from (
  values
    ('44444444-4444-4444-8444-444444444401'::uuid, 70),
    ('44444444-4444-4444-8444-444444444402'::uuid, 55),
    ('44444444-4444-4444-8444-444444444403'::uuid, 40),
    ('44444444-4444-4444-8444-444444444404'::uuid, 30),
    ('44444444-4444-4444-8444-444444444405'::uuid, 28),
    ('44444444-4444-4444-8444-444444444406'::uuid, 48),
    ('44444444-4444-4444-8444-444444444407'::uuid, 36),
    ('44444444-4444-4444-8444-444444444408'::uuid, 18)
) as b(bid, n)
cross join lateral generate_series(1, n) as s(i)
cross join lateral (select (array['profile','search','home','link-in-bio','divulgacao'])[1 + (i % 5)] as src) t
cross join lateral (select (i * 7 + (i % 11)) as g) z;

insert into public.searches (query, results_count, category_id, created_at)
values
  ('restaurante no centro', 3, '33333333-3333-4333-8333-333333333301', now() - interval '2 hours'),
  ('almoço executivo', 1, '33333333-3333-4333-8333-333333333301', now() - interval '5 hours'),
  ('salão de beleza', 2, '33333333-3333-4333-8333-333333333302', now() - interval '8 hours'),
  ('clínica pediatria', 1, '33333333-3333-4333-8333-333333333303', now() - interval '12 hours'),
  ('banho e tosa', 1, '33333333-3333-4333-8333-333333333307', now() - interval '18 hours'),
  ('troca de tela celular', 1, '33333333-3333-4333-8333-333333333308', now() - interval '20 hours'),
  ('mecânico de confiança', 1, '33333333-3333-4333-8333-333333333305', now() - interval '1 day'),
  ('aula de violão', 1, '33333333-3333-4333-8333-333333333306', now() - interval '1 day 4 hours'),
  ('pintor residencial', 1, '33333333-3333-4333-8333-333333333304', now() - interval '2 days'),
  ('feijoada', 1, '33333333-3333-4333-8333-333333333301', now() - interval '2 days 6 hours'),
  ('diarista', 0, '33333333-3333-4333-8333-333333333310', now() - interval '3 hours'),
  ('advogado trabalhista', 0, null, now() - interval '9 hours'),
  ('padaria 24 horas', 0, '33333333-3333-4333-8333-333333333301', now() - interval '15 hours'),
  ('chaveiro 24h', 0, '33333333-3333-4333-8333-333333333310', now() - interval '1 day 2 hours'),
  ('academia 24 horas', 0, '33333333-3333-4333-8333-333333333303', now() - interval '3 days');

-- more repeated searches to fill "top services"
insert into public.searches (query, results_count, category_id, created_at)
select q, r, c, now() - (i || ' hours')::interval
from (
  values
    ('restaurante', 3, '33333333-3333-4333-8333-333333333301'::uuid),
    ('salão', 2, '33333333-3333-4333-8333-333333333302'::uuid),
    ('pet shop', 1, '33333333-3333-4333-8333-333333333307'::uuid),
    ('restaurante', 3, '33333333-3333-4333-8333-333333333301'::uuid),
    ('conserto de celular', 1, '33333333-3333-4333-8333-333333333308'::uuid),
    ('salão', 2, '33333333-3333-4333-8333-333333333302'::uuid),
    ('clínica', 1, '33333333-3333-4333-8333-333333333303'::uuid),
    ('oficina', 1, '33333333-3333-4333-8333-333333333305'::uuid)
) as v(q, r, c)
cross join generate_series(1, 6) as s(i);

insert into public.activity_log (actor_id, action, entity_type, entity_id, metadata, created_at)
values
  (null, 'cadastro_empresa', 'business', '44444444-4444-4444-8444-444444444409', '{"name":"Barbearia do Zé"}'::jsonb, now() - interval '2 days'),
  (null, 'avaliacao_enviada', 'review', '55555555-5555-4555-8555-555555555508', '{"business":"Auto Center Uberaba"}'::jsonb, now() - interval '1 day'),
  (null, 'avaliacao_denunciada', 'review', '55555555-5555-4555-8555-555555555509', '{"business":"Escola de Música Tom Maior"}'::jsonb, now() - interval '1 day'),
  (null, 'indicacao_enviada', 'suggestion', null, '{"name":"Padaria Pão Quente"}'::jsonb, now() - interval '1 day'),
  (null, 'cadastro_empresa', 'business', '44444444-4444-4444-8444-444444444410', '{"name":"Oliveira Elétrica"}'::jsonb, now() - interval '8 days'),
  (null, 'avaliacao_enviada', 'review', '55555555-5555-4555-8555-555555555510', '{"business":"Studio Ana Beleza"}'::jsonb, now() - interval '8 hours');

drop function private.seed_user(uuid, text, text, text, public.user_role);

alter table public.profiles enable trigger trg_protect_profile_privileges;
alter table public.businesses enable trigger trg_protect_business_privileges;
alter table public.reviews enable trigger trg_protect_review_privileges;
