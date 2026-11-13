# Guia Local

Plataforma para encontrar empresas e prestadores de confiança em **Uberaba, MG**. O sistema tem três áreas:

- **Site público** — busca, perfis, avaliações, indicações e páginas de link na bio
- **Área da empresa** — painel, perfil, serviços, fotos, disponibilidade, divulgação e link na bio
- **Admin** — moderação de cadastros e avaliações, categorias, usuários, buscas e configurações

Interface em português (pt-BR).

## Endereços

- Site: https://adilsonzetta.github.io/guia-local/
- Código: https://github.com/AdilsonZetta/guia-local
- Backend: [Supabase](https://supabase.com) (projeto **Guia Local**, região São Paulo)

## Como se tornar admin

1. Abra o site e crie uma conta com o e-mail **grupozettaoficial@gmail.com**.
2. O banco promove esse e-mail para o papel `admin` automaticamente no cadastro.
3. Entre de novo e acesse `/admin`.

Não crie a senha em outro lugar: você mesmo define a senha no formulário de cadastro.

## Contas de demonstração

Todas usam a senha `Demo@123456`:

| Papel   | E-mail                      | Acesso                         |
|---------|-----------------------------|--------------------------------|
| Empresa | sabor.mineiro@example.com   | Área da empresa (Sabor Mineiro)|
| Empresa | ana.beleza@example.com      | Studio Ana Beleza              |
| Morador | joao.morador@example.com    | Favoritos e avaliações         |

Há outras empresas e moradores de exemplo no mesmo padrão (`@example.com`).

## Stack

Vite, React, TypeScript, Tailwind CSS, supabase-js. O app é uma SPA hospedada no GitHub Pages (`/guia-local/`).

## Desenvolvimento local

```bash
npm install
cp .env.example .env.local
# preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

O Vite usa `base: /guia-local/`. As variáveis `VITE_*` entram no bundle do navegador; a chave `anon`/`publishable` é pública por desenho. A chave `service_role` nunca deve ir para o frontend nem para o repositório.

## O que já está no banco

O projeto Supabase já tem o esquema, RLS, buckets de Storage (`business-photos`, `avatars`, `site-assets`) e dados de demonstração (bairros de Uberaba, categorias, empresas, avaliações, buscas e cliques). As migrações estão em `supabase/migrations/` e o seed em `supabase/seed.sql`.

## Limitações conhecidas

- **Login com Google**: o botão aparece, mas ainda falta configurar um cliente OAuth do Google no Supabase.
- **E-mail (link mágico e confirmação)**: o projeto usa o SMTP padrão do Supabase, que tem limite diário baixo. Em produção, configure um SMTP próprio.
- **URLs de autenticação**: no painel do Supabase, em Authentication → URL Configuration, defina o Site URL como `https://adilsonzetta.github.io/guia-local/` e acrescente essa origem em Redirect URLs (e `http://localhost:5173/guia-local/` para desenvolvimento).
