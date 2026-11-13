# Guia Local — especificação de implementação

App em português (pt-BR), tema verde `#0F7B5A`, fonte Nunito, cards e sidebar.
Stack: Vite + React + TypeScript + Tailwind v4 + supabase-js + React Router (BrowserRouter, basename `/guia-local/`).
Todos os dados vêm do Supabase. Proibido deixar arrays mockados no lugar de consultas reais.

Cliente: `src/lib/supabase.ts`. Tipos: `src/lib/database.types.ts`.
Auth: `src/context/AuthProvider.tsx`. Utilitários: `src/lib/utils.ts`, `src/lib/analytics.ts`.
Hospedagem: GitHub Pages em `https://adilsonzetta.github.io/guia-local/`.

## Rotas (já declaradas em App.tsx)

Público: `/`, `/busca`, `/empresa/:slug`, `/empresa/:slug/avaliar`, `/empresa/:slug/avaliar/enviada`, `/indicar`, `/entrar`, `/l/:slug`
Morador (login): `/morador/favoritos`, `/morador/avaliacoes`, `/morador/indicar`, `/morador/conta`
Empresa (login business/admin): `/empresa-area/*`
Admin (login admin): `/admin/*`

## Regras de dados

- Empresas públicas: `status = 'active'` e `is_paused = false` (já filtrado pelo RLS).
- Avaliações públicas: `status = 'published'`.
- Cadastro de empresa e avaliação entram como `pending` (triggers no banco).
- Clique no WhatsApp: `logWhatsAppClick` + abrir `wa.me`.
- Visita de perfil: `logVisit` ao abrir `/empresa/:slug`.
- Busca: após consultar, `logSearch` com `results_count` (0 se não houver resultado).
- Joins típicos de empresa:

```ts
supabase.from('businesses').select(`
  *,
  categories (id, name, slug, icon),
  neighborhoods (id, name, slug),
  business_stats (avg_rating, review_count, awaiting_reply_count)
`)
```

## Auth

- Email + senha: `signInWithPassword` / `signUp` com `options.data: { full_name, phone }` e `emailRedirectTo` para a origem + `/guia-local/`.
- Link mágico: `signInWithOtp({ email, options: { emailRedirectTo }})`.
- Google: botão visível; ao clicar, mostrar aviso amigável de que o login com Google ainda não foi configurado (não quebrar).
- Cadastro tem escolha: "Sou morador" ou "Sou empresa". Empresa, depois de criar a conta, mostra um passo para cadastrar o negócio (nome, categoria, bairro, WhatsApp, descrição). `owner_id = user.id`; o trigger promove o perfil para `business`.
- Se o e-mail de confirmação for exigido, explicar que o usuário deve olhar a caixa de entrada (SMTP padrão do Supabase tem limite).
- Adilson se torna admin automaticamente ao se cadastrar com `grupozettaoficial@gmail.com`. Não criar senha para ele.

## Telas públicas

### Home
Hero com título tipo “Encontre empresas e prestadores de confiança em Uberaba”, campo de busca (serviço ou nome) + bairro, botão Buscar indo para `/busca?q=&bairro=`.
Grid de categorias com `show_on_home = true`, ícone via `CategoryIcon`, clique vai para `/busca?categoria=slug`.
Seção “Destaques” com `featured = true`.
CTA “Indicar empresa”.
Rodapé já está no layout.

### Busca
Filtros: categoria, bairro, atende em casa, recebendo pedidos, nota mínima. Ordenação: relevância, melhor avaliados, mais recentes.
Lista com `BusinessCard`. Estado vazio amigável. Registrar a busca.

### Perfil da empresa
Capa, logo, nome, categoria, bairro, nota, badges (atende em casa, recebendo pedidos).
Ações: Salvar (favorito, exige login), Compartilhar (Web Share API ou copiar link), Avaliar, Chamar no WhatsApp.
Abas: Visão geral (descrição, endereço, horários, bairros de atendimento), Serviços e fotos, Avaliações (só publicadas, com resposta da empresa).
Registrar visita.

### Avaliar
Formulário: nota 1–5, título opcional, texto obrigatório. Exige login; se não estiver logado, redireciona para `/entrar` e volta. Sucesso vai para `/empresa/:slug/avaliar/enviada` explicando que a avaliação entra em moderação.

### Link na bio (`/l/:slug`)
Página pública mobile-first com tema (forest, rose, ocean, sand), foto, nome, bio e botões ativos. Se um botão for WhatsApp, registrar clique.

### Indicar empresa (público)
Formulário: nome da empresa, categoria, bairro, telefone, observações, nome e contato de quem indica (pré-preenchido se logado).

## Área do morador
- Favoritos: lista com opção de remover.
- Avaliações: status (pendente, publicada, etc.), editar (volta para moderação) e excluir.
- Indicar empresa: mesmo form.
- Conta: nome, telefone, e-mail (somente leitura), preferências de notificação, pedido de exclusão (`deletion_requested_at`).

## Área da empresa
Usar `useAuth().business`. Se o usuário ainda não tiver empresa, oferecer o cadastro.
- Painel: visitas, cliques no WhatsApp, nota, avaliações aguardando resposta, gráfico (recharts) de visitas nos últimos 30 dias, toggle de disponibilidade (define `receiving_orders_until` = hoje + `availability_validity_days` das configurações), barra de completude do perfil, botão compartilhar.
- Perfil: edição com preview ao vivo do card público.
- Serviços e fotos: CRUD de serviços; upload de fotos no bucket `business-photos`, caminho `{business_id}/{timestamp}-{nome}`; definir capa; reordenar.
- Avaliações: ver todas as da empresa (RLS libera), responder, denunciar com motivo (marca `reported_by_business` e vira `flagged`).
- Disponibilidade: toggle recebendo pedidos + data de validade, horários da semana, bairros de atendimento (N:N).
- Link na bio: slug customizado (`/l/slug`), botões editáveis/reordenáveis/liga-desliga, temas, preview no celular.
- Divulgação: link público, compartilhar no WhatsApp, baixar cartão (gerar imagem em canvas), baixar/imprimir QR da avaliação (`/empresa/{slug}/avaliar`), texto de convite.
- Configurações: dados da conta, notificações, pausar perfil (`is_paused`), solicitar exclusão.

## Admin
- Visão geral: totais (empresas ativas, pendentes, avaliações aguardando, indicações), gráfico de atividade (cadastros / buscas / cliques), caixa “precisa de atenção”, cadastros recentes.
- Empresas: abas Todos / Pendentes / Ativos, busca, painel lateral para analisar, botões Aprovar / Solicitar ajustes (com texto) / Rejeitar / Arquivar, “Novo cadastro” (admin cria empresa, status já ativo se quiser — admin bypassa o trigger).
- Indicações: criar cadastro pendente a partir da indicação ou arquivar.
- Moderação: fila de `flagged` + `pending`, manter (publicar), solicitar ajuste, remover com justificativa.
- Buscas e contatos: totais, serviços mais buscados, buscas sem resultado, origem dos cliques no WhatsApp, exportar CSV.
- Categorias: CRUD, slug, ativo, exibir na home, ordem (campos numéricos de `sort_order`, setas para cima/baixo), ícone (select com os nomes já mapeados em `CategoryIcon`).
- Usuários: lista, filtros (papel, status), detalhes, suspender com motivo, exportar CSV. Não permitir auto-suspensão do admin logado.
- Configurações: nome e descrição do site, logo (upload em `site-assets`), cidade e UF, bairros (CRUD), toggles de moderação e link na bio, dias de validade da disponibilidade.

## Qualidade
- UI 100% pt-BR, responsiva.
- `npm run build` e `tsc` precisam passar.
- Não commitar `.env.local` nem service_role.
- Não quebrar AuthProvider, router basename nem `vite.config.ts` `base`.
