import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173/guia-local'
const OUT = process.env.SHOT_DIR || '/workspace/guia-local-final'
const PASSWORD = 'Demo@123456'
const ACCOUNTS = {
  morador: 'ana.p@example.com',
  empresa: 'juliana.limpeza@example.com',
  admin: 'guia.e2e.admin@example.com',
}

fs.mkdirSync(OUT, { recursive: true })

const results = []
const consoleIssues = []
let failed = 0

function ok(name, cond, extra = '') {
  const line = `${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && extra ? ' — ' + extra : ''}`
  console.log(line)
  results.push(line)
  if (!cond) failed++
  return Boolean(cond)
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file, fullPage: false })
  return file
}

function attachListeners(page, label) {
  page.on('pageerror', (err) => {
    consoleIssues.push(`[${label} pageerror] ${err.message}`)
  })
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      if (
        text.includes('favicon') ||
        text.includes('net::ERR_') ||
        text.includes('Failed to load resource')
      )
        return
      consoleIssues.push(`[${label} console] ${text}`)
    }
  })
}

async function visibleText(page, text, timeout = 8000) {
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout })
    return true
  } catch {
    return false
  }
}

async function login(page, email, password = PASSWORD) {
  await page.goto(`${BASE}/entrar`, { waitUntil: 'networkidle' })
  // already logged in?
  if (!page.url().includes('/entrar')) {
    await logout(page)
    await page.goto(`${BASE}/entrar`, { waitUntil: 'networkidle' })
  }
  const loginTab = page.getByRole('tab', { name: 'Entrar' })
  if (await loginTab.count()) await loginTab.click()
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.endsWith('/entrar'), { timeout: 20000 })
}

async function logout(page) {
  const managementOut = page.getByLabel('Sair', { exact: true })
  if (await managementOut.count()) {
    await managementOut.click()
    await page.waitForTimeout(500)
    return
  }
  const avatar = page.locator('button:has(.avatar), button:has-text("Sair")').first()
  if (await page.getByRole('button', { name: 'Sair', exact: true }).count()) {
    // maybe already open or visible on mobile
  }
  // try opening avatar menu
  const menuBtn = page.locator('header button, header a').filter({ has: page.locator('.avatar') }).first()
  if (await menuBtn.count()) {
    await menuBtn.click()
    await page.waitForTimeout(200)
  }
  const sair = page.getByText('Sair', { exact: true }).first()
  if (await sair.count()) {
    await sair.click()
    await page.waitForTimeout(500)
    return
  }
  const sairConta = page.getByRole('button', { name: /Sair da conta/ })
  if (await sairConta.count()) {
    await sairConta.click()
    await page.waitForTimeout(500)
  }
}

async function noDadosIlustrativos(page, label) {
  const count = await page.getByText('Dados ilustrativos').count()
  ok(`${label}: sem pill Dados ilustrativos`, count === 0, `found ${count}`)
}

async function gotoOk(page, path, expectText, label) {
  const errorsBefore = consoleIssues.length
  const res = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  const status = res?.status() ?? 0
  ok(`${label}: HTTP ${status} ${path}`, status === 200 || status === 304, `status=${status}`)
  if (expectText) {
    ok(`${label}: texto "${expectText}"`, await visibleText(page, expectText), `url=${page.url()}`)
  }
  const newErrors = consoleIssues.slice(errorsBefore)
  ok(`${label}: sem pageerror`, newErrors.length === 0, newErrors.join(' | '))
  return page
}

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

const context = await browser.newContext({
  viewport: { width: 1440, height: 992 },
  locale: 'pt-BR',
})
const page = await context.newPage()
attachListeners(page, 'desktop')

try {
  // ========== ANON ==========
  await gotoOk(page, '/', 'Guia Local', 'anon home')
  ok('anon home: categorias ou negócios', await visibleText(page, 'Limpeza') || await visibleText(page, 'Juliana'))
  await noDadosIlustrativos(page, 'anon home')
  const title = await page.title()
  ok('anon home: title SEO', /guia local/i.test(title), title)
  const og = await page.evaluate(() => document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '')
  ok('anon home: og:title', Boolean(og), 'missing og:title')
  await shot(page, '01-home')

  // search via header or home
  const searchBox = page.getByRole('searchbox').or(page.getByPlaceholder(/buscar|serviço|o que você/i)).first()
  if (await searchBox.count()) {
    await searchBox.fill('limpeza')
    await searchBox.press('Enter')
    await page.waitForTimeout(1200)
  } else {
    await page.goto(`${BASE}/busca?q=limpeza`, { waitUntil: 'networkidle' })
  }
  ok('anon busca: resultados', await visibleText(page, 'Juliana') || await visibleText(page, 'Limpeza') || await visibleText(page, 'resultado'))
  await shot(page, '02-busca')

  await gotoOk(page, '/empresa/juliana-limpeza', 'Juliana Limpeza', 'anon perfil')
  await shot(page, '03-perfil-visao-geral')
  const servicosTab = page.getByRole('tab', { name: /Serviços/ }).or(page.getByRole('link', { name: /Serviços/ })).or(page.getByText('Serviços e fotos'))
  if (await servicosTab.count()) {
    await servicosTab.first().click()
    await page.waitForTimeout(600)
  }
  ok('anon perfil: serviços', await visibleText(page, 'Serviços') || page.url().includes('servicos') || page.url().includes('tab='))
  await shot(page, '04-perfil-servicos')

  const reviewsTab = page.getByRole('tab', { name: /Avaliações/ }).or(page.getByRole('link', { name: /Avaliações/ })).or(page.getByText('Avaliações', { exact: true }))
  if (await reviewsTab.count()) {
    await reviewsTab.first().click()
    await page.waitForTimeout(600)
  }
  await shot(page, '05-perfil-avaliacoes')

  await gotoOk(page, '/empresa/juliana-limpeza/avaliar', null, 'anon avaliar')
  // may redirect to login or show form
  const onLogin = page.url().includes('/entrar')
  const hasForm = (await page.getByText(/Como foi|Avaliar|sua experiência|estrelas/i).count()) > 0
  ok('anon avaliar: formulário ou login', onLogin || hasForm, page.url())
  await shot(page, onLogin ? '06-avaliar-redir-login' : '06-avaliar')

  await gotoOk(page, '/empresa/paulo-eletrica', 'Paulo Elétrica', 'anon paulo')
  ok(
    'anon paulo: Consultar disponibilidade',
    await visibleText(page, 'Consultar disponibilidade'),
    await page.locator('body').innerText().then((t) => t.slice(0, 400)),
  )

  await gotoOk(page, '/l/juliana-limpeza', 'Juliana Limpeza', 'anon link-in-bio')
  await shot(page, '09-link-na-bio-publico')

  await gotoOk(page, '/entrar', 'Entrar ou criar conta', 'anon login')
  ok('anon login: Continuar com Google', await visibleText(page, 'Continuar com Google'))
  ok('anon login: Enviar link de acesso', await visibleText(page, 'Enviar link de acesso'))
  ok('anon login: campo senha', (await page.getByLabel('Senha').count()) > 0)
  await shot(page, '10-login')

  await gotoOk(page, '/indicar', null, 'anon indicar')
  ok('anon indicar: formulário ou título', await visibleText(page, 'Indicar') || await visibleText(page, 'negócio') || await visibleText(page, 'indicação'))

  // photos not empty placeholders
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  const imgs = await page.locator('img').evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute('src') || '').filter(Boolean),
  )
  ok(
    'anon home: fotos reais (unsplash/pexels/supabase/storage)',
    imgs.some((s) => /unsplash|pexels|supabase|storage/i.test(s)),
    imgs.slice(0, 5).join(', '),
  )

  // deep link refresh (SPA)
  const deep = await page.goto(`${BASE}/empresa/juliana-limpeza`, { waitUntil: 'networkidle' })
  ok('deep link HTTP', [200, 304].includes(deep?.status() ?? 0), String(deep?.status()))
  await page.reload({ waitUntil: 'networkidle' })
  ok('deep link refresh mantém perfil', await visibleText(page, 'Juliana Limpeza'), page.url())

  // mobile
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await shot(page, '11-home-mobile')
  const overflowHome = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)
  ok('mobile home: sem overflow horizontal', !overflowHome)
  await page.goto(`${BASE}/busca?q=limpeza`, { waitUntil: 'networkidle' })
  await shot(page, '12-busca-mobile')
  const bottomNav =
    (await page.getByText('Explorar').count()) > 0 &&
    ((await page.getByText('Favoritos').count()) > 0 || (await page.getByText('Conta').count()) > 0)
  ok('mobile busca: bottom nav Explorar/Favoritos/Conta', bottomNav)
  await page.setViewportSize({ width: 1440, height: 992 })

  // ========== MORADOR ==========
  await login(page, ACCOUNTS.morador)
  ok('morador: login', !page.url().includes('/entrar'), page.url())
  await gotoOk(page, '/morador/favoritos', 'favorit', 'morador favoritos')
  await shot(page, '20-morador-favoritos')
  await gotoOk(page, '/morador/avaliacoes', 'avalia', 'morador avaliacoes')
  await shot(page, '21-morador-avaliacoes')
  await gotoOk(page, '/morador/indicar', null, 'morador indicar')
  ok(
    'morador indicar: form',
    (await visibleText(page, 'Indique')) ||
      (await visibleText(page, 'indicação')) ||
      (await page.getByLabel(/nome|negócio|empresa/i).count()) > 0,
  )
  await shot(page, '22-morador-indicar')
  await gotoOk(page, '/morador/conta', 'Minha conta', 'morador conta')
  ok('morador conta: Sair da conta', await visibleText(page, 'Sair da conta'))
  ok('morador conta: Solicitar exclusão', await visibleText(page, 'exclusão') || await visibleText(page, 'Excluir'))
  await shot(page, '23-morador-conta')

  // favorite toggle on profile
  await page.goto(`${BASE}/empresa/juliana-limpeza`, { waitUntil: 'networkidle' })
  const favBtn = page.getByRole('button', { name: /favorit/i }).or(page.locator('button[aria-label*="favorit" i]')).or(page.locator('button:has(svg.lucide-heart)'))
  if (await favBtn.count()) {
    await favBtn.first().click()
    await page.waitForTimeout(1000)
    ok('morador: clique em favoritar não quebrou', !(await visibleText(page, 'Erro inesperado')), 'toast/error')
  } else {
    ok('morador: botão favoritar presente', false, 'não encontrado')
  }
  await logout(page)

  // ========== EMPRESA ==========
  await login(page, ACCOUNTS.empresa)
  ok('empresa: login vai à área ou site', true, page.url())
  const bizPages = [
    ['/empresa-area/painel', 'Meu', '30-empresa-painel'],
    ['/empresa-area/perfil', 'perfil', '31-empresa-perfil'],
    ['/empresa-area/servicos', 'Serviços', '32-empresa-servicos'],
    ['/empresa-area/avaliacoes', 'Avalia', '33-empresa-avaliacoes'],
    ['/empresa-area/disponibilidade', 'Disponib', '34-empresa-disponibilidade'],
    ['/empresa-area/divulgacao', 'Divulg', '35-empresa-divulgacao'],
    ['/empresa-area/configuracoes', 'Configura', '36-empresa-config'],
    ['/empresa-area/link', 'bio', '37-empresa-link'],
  ]
  for (const [path, text, shotName] of bizPages) {
    await gotoOk(page, path, text, `empresa ${path}`)
    await noDadosIlustrativos(page, `empresa ${path}`)
    await shot(page, shotName)
  }
  // sidebar items
  await page.goto(`${BASE}/empresa-area/painel`, { waitUntil: 'networkidle' })
  for (const label of ['Meu painel', 'Meu perfil', 'Serviços e fotos', 'Avaliações', 'Disponibilidade', 'Link na bio', 'Divulgação', 'Configurações']) {
    ok(`empresa sidebar: ${label}`, (await page.getByText(label, { exact: false }).count()) > 0)
  }
  ok('empresa: sineira/notificações', (await page.getByLabel(/Notifica/i).count()) > 0 || (await page.locator('button:has(svg.lucide-bell)').count()) > 0)
  // period filter
  const period = page.getByLabel(/Período/i).or(page.locator('select').first())
  if (await period.count()) {
    try {
      await period.first().selectOption({ index: 0 })
      ok('empresa painel: filtro de período', true)
    } catch (e) {
      ok('empresa painel: filtro de período', false, String(e))
    }
  }
  await logout(page)

  // ========== ADMIN ==========
  await login(page, ACCOUNTS.admin)
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' })
  ok('admin: acessou visão geral', page.url().includes('/admin') && (await visibleText(page, 'Visão geral') || await visibleText(page, 'Empresas cadastradas') || await visibleText(page, 'Atividade')), page.url())
  await shot(page, '40-admin-visao-geral')
  await noDadosIlustrativos(page, 'admin dashboard')

  const adminPages = [
    ['/admin/empresas', 'Empresa', '41-admin-empresas'],
    ['/admin/empresas/indicacoes', 'Indica', '42-admin-indicacoes'],
    ['/admin/avaliacoes', 'Avalia', '43-admin-avaliacoes'],
    ['/admin/usuarios', 'Usuário', '44-admin-usuarios'],
    ['/admin/buscas', 'Busca', '45-admin-buscas'],
    ['/admin/categorias', 'Categoria', '46-admin-categorias'],
    ['/admin/configuracoes', 'Identidade', '47-admin-config'],
  ]
  for (const [path, text, shotName] of adminPages) {
    await gotoOk(page, path, text, `admin ${path}`)
    await noDadosIlustrativos(page, `admin ${path}`)
    await shot(page, shotName)
  }

  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' })
  for (const label of ['Visão geral', 'Empresas', 'Avaliações', 'Usuários', 'Buscas e contatos', 'Categorias', 'Configurações']) {
    ok(`admin sidebar: ${label}`, (await page.getByText(label, { exact: false }).count()) > 0)
  }
  ok('admin: Ver site', await visibleText(page, 'Ver site'))

  const search = page.getByPlaceholder(/Buscar na plataforma/i).or(page.getByLabel(/Buscar na plataforma/i))
  if (await search.count()) {
    await search.first().fill('Juliana')
    await page.waitForTimeout(800)
    ok('admin busca global: Juliana', await visibleText(page, 'Juliana'))
    await shot(page, '48-admin-busca-global')
  } else {
    ok('admin busca global presente', false, 'campo não encontrado')
  }

  // CSV button
  await page.goto(`${BASE}/admin/buscas`, { waitUntil: 'networkidle' })
  ok('admin buscas: Exportar CSV', await visibleText(page, 'Exportar CSV') || await visibleText(page, 'CSV'))

  // users export
  await page.goto(`${BASE}/admin/usuarios`, { waitUntil: 'networkidle' })
  ok('admin usuários: Exportar lista', await visibleText(page, 'Exportar'))

  await logout(page)

  // cadastrar negócio CTA exists for anon
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  ok('anon: Cadastrar negócio', await visibleText(page, 'Cadastrar negócio'))
} catch (err) {
  ok('suite crashed', false, err.stack || String(err))
  try {
    await shot(page, '99-crash')
  } catch {}
}

await browser.close()

const errorLog = consoleIssues.length
  ? `\n\nConsole/page errors (${consoleIssues.length}):\n${consoleIssues.join('\n')}`
  : '\n\nNo console/page errors captured.'
const summary = `${results.join('\n')}${errorLog}\n\n${failed} failed, ${results.length - failed} passed, ${results.length} checks.`
fs.writeFileSync(path.join(OUT, 'report.txt'), summary)
console.log('\n==== SUMMARY ====\n' + summary)
process.exit(failed ? 1 : 0)
