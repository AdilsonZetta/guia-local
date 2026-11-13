import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const mode = process.argv[2] || 'signup'
const password = process.env.TEST_PASSWORD || 'Teste@123456'
let failed = 0
const log = []

function ok(name, cond, extra = '') {
  const line = `${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && extra ? ' — ' + extra : ''}`
  console.log(line)
  log.push(line)
  if (!cond) failed++
}

async function signIn(email) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`signIn ${email}: ${error.message}`)
  return data
}

if (mode === 'signup') {
  const stamp = Date.now()
  const clientEmail = `guia-local-test-client-${stamp}@example.com`
  const bizEmail = `guia-local-test-biz-${stamp}@example.com`
  const adminEmail = `guia-local-test-admin-${stamp}@example.com`

  const demo = await supabase.auth.signInWithPassword({
    email: 'sabor.mineiro@example.com',
    password: 'Demo@123456',
  })
  ok('demo business login', !demo.error && Boolean(demo.data.session), demo.error?.message)
  if (demo.data.session) {
    const { data: myBiz } = await supabase
      .from('businesses')
      .select('name,status,slug')
      .eq('owner_id', demo.data.user.id)
    ok('demo owner sees own business', (myBiz ?? []).some((b) => b.slug === 'sabor-mineiro'))
    await supabase.auth.signOut()
  }

  const { data: pendingAnon } = await supabase
    .from('businesses')
    .select('slug,status')
    .in('slug', ['barbearia-do-ze', 'oliveira-eletrica'])
  ok('anon cannot see pending businesses', (pendingAnon ?? []).length === 0, JSON.stringify(pendingAnon))

  const created = {}
  for (const [role, email, name] of [
    ['client', clientEmail, 'Cliente Teste'],
    ['business', bizEmail, 'Empresa Teste'],
    ['admin', adminEmail, 'Admin Teste'],
  ]) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    ok(`${role} signup`, !error && Boolean(data.user?.id), error?.message)
    created[role] = { email, id: data.user?.id ?? null, hasSession: Boolean(data.session) }
  }

  console.log('CREATED ' + JSON.stringify({ password, ...created }))
  process.exit(0)
}

if (mode === 'flow') {
  const clientEmail = process.env.TEST_CLIENT_EMAIL
  const bizEmail = process.env.TEST_BIZ_EMAIL
  const adminEmail = process.env.TEST_ADMIN_EMAIL
  const slug = process.env.TEST_BIZ_SLUG || `empresa-teste-${Date.now()}`

  // pick a category and neighborhood
  const { data: cats, error: cErr } = await supabase.from('categories').select('id,slug').limit(1)
  const { data: hoods } = await supabase.from('neighborhoods').select('id,slug').limit(1)
  ok('load category/neighborhood', !cErr && cats?.length && hoods?.length, cErr?.message)
  const categoryId = cats[0].id
  const neighborhoodId = hoods[0].id

  // --- business creates listing ---
  const bizAuth = await signIn(bizEmail)
  ok('business sign-in', Boolean(bizAuth.session))
  const { data: newBiz, error: bizErr } = await supabase
    .from('businesses')
    .insert({
      owner_id: bizAuth.user.id,
      name: 'Empresa Teste E2E',
      slug,
      tagline: 'Teste automatizado',
      description: 'Empresa criada pelo teste ponta a ponta do Guia Local.',
      category_id: categoryId,
      neighborhood_id: neighborhoodId,
      whatsapp: '34999990099',
      phone: '34999990099',
    })
    .select('id,status,slug,owner_id')
    .single()
  ok('business created', !bizErr && newBiz?.id, bizErr?.message)
  ok('new business starts pending', newBiz?.status === 'pending', newBiz?.status)
  const businessId = newBiz?.id
  await supabase.auth.signOut()

  // anon should not see it
  const { data: hidden } = await supabase.from('businesses').select('id').eq('id', businessId)
  ok('anon cannot see pending test business', (hidden ?? []).length === 0)

  // --- admin approves ---
  const adminAuth = await signIn(adminEmail)
  ok('admin sign-in', Boolean(adminAuth.session))
  const { data: isAdmin } = await supabase.rpc('is_admin')
  ok('admin rpc is_admin true', isAdmin === true, String(isAdmin))
  const { data: pendingVisible, error: pErr } = await supabase
    .from('businesses')
    .select('id,status')
    .eq('id', businessId)
    .single()
  ok('admin can see pending business', !pErr && pendingVisible?.id === businessId, pErr?.message)
  const { error: apprErr } = await supabase
    .from('businesses')
    .update({
      status: 'active',
      approved_at: new Date().toISOString(),
      approved_by: adminAuth.user.id,
    })
    .eq('id', businessId)
  ok('admin approval update', !apprErr, apprErr?.message)
  await supabase.auth.signOut()

  const { data: publicBiz } = await supabase.from('businesses').select('id,status,slug').eq('id', businessId)
  ok('anon sees business after approval', publicBiz?.[0]?.status === 'active', JSON.stringify(publicBiz))

  // --- client favorite + review + whatsapp ---
  const clientAuth = await signIn(clientEmail)
  ok('client sign-in', Boolean(clientAuth.session))

  const { error: favErr } = await supabase
    .from('favorites')
    .insert({ user_id: clientAuth.user.id, business_id: businessId })
  ok('client favorite insert', !favErr, favErr?.message)
  const { data: favs } = await supabase.from('favorites').select('business_id').eq('user_id', clientAuth.user.id)
  ok('client can read own favorite', (favs ?? []).some((f) => f.business_id === businessId))

  const { data: review, error: revErr } = await supabase
    .from('reviews')
    .insert({
      business_id: businessId,
      user_id: clientAuth.user.id,
      rating: 5,
      title: 'Ótimo teste',
      body: 'Avaliação enviada pelo teste automatizado do Guia Local.',
    })
    .select('id,status')
    .single()
  ok('review submitted', !revErr && review?.id, revErr?.message)
  ok('review starts pending', review?.status === 'pending', review?.status)
  await supabase.auth.signOut()

  const { data: hiddenReview } = await supabase.from('reviews').select('id,status').eq('id', review?.id ?? '00000000-0000-0000-0000-000000000000')
  ok('anon cannot see pending review', (hiddenReview ?? []).length === 0)

  // admin publishes review
  await signIn(adminEmail)
  const { error: pubErr } = await supabase.from('reviews').update({ status: 'published' }).eq('id', review.id)
  ok('admin publishes review', !pubErr, pubErr?.message)
  await supabase.auth.signOut()
  const { data: pubRev } = await supabase.from('reviews').select('id,status').eq('id', review.id)
  ok('anon sees published review', pubRev?.[0]?.status === 'published')

  // whatsapp click as anon
  const { error: waErr } = await supabase.from('whatsapp_clicks').insert({
    business_id: businessId,
    source: 'e2e',
  })
  ok('anon whatsapp click log', !waErr, waErr?.message)

  // visit log
  const { error: visErr } = await supabase.from('profile_visits').insert({
    business_id: businessId,
    source: 'e2e',
  })
  ok('anon profile visit log', !visErr, visErr?.message)

  console.log('BUSINESS_ID ' + businessId)
  console.log('REVIEW_ID ' + review.id)
  console.log(failed === 0 ? 'ALL_PASSED' : `FAILURES ${failed}`)
  process.exit(failed === 0 ? 0 : 1)
}

console.error('unknown mode')
process.exit(2)
