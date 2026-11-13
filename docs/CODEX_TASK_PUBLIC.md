You are implementing the Guia Local web app already scaffolded in this repo. Work in /workspace/guia-local.

GOAL FOR THIS SESSION: replace the stub pages for the public site, auth, and resident area with fully functional implementations that read and write REAL Supabase data. Do not leave mock arrays in the UI.

Read docs/SPEC.md first and follow it. The database, RLS, auth helpers, layouts, design system, router, and stub files already exist. Do not rewrite the scaffold unless you must fix a bug. Fill in these files (and add helper components as needed):

- src/pages/public/HomePage.tsx
- src/pages/public/SearchPage.tsx
- src/pages/public/BusinessProfilePage.tsx
- src/pages/public/WriteReviewPage.tsx
- src/pages/public/ReviewSuccessPage.tsx
- src/pages/public/LinkInBioPage.tsx
- src/pages/public/SuggestPage.tsx
- src/pages/auth/LoginPage.tsx
- src/pages/resident/FavoritesPage.tsx
- src/pages/resident/MyReviewsPage.tsx
- src/pages/resident/SuggestBusinessPage.tsx
- src/pages/resident/AccountPage.tsx

You may extract shared forms (e.g. suggestion form) into src/components/.

UI: Portuguese pt-BR, green brand #0F7B5A, Nunito already loaded, rounded-2xl cards, existing Button/Input/Card/Badge/Modal/Spinner/BusinessCard/CategoryIcon components. Tailwind v4 with tokens: bg-brand, text-brand-dark, bg-brand-soft, bg-canvas, text-ink, text-muted, border-line, bg-card.

Env is in .env.local (already gitignored). Client is src/lib/supabase.ts.

Important implementation details:
- BrowserRouter basename is `/guia-local`. Links must be like `/busca`, not `/guia-local/busca`.
- Favorites require login. WhatsApp clicks and visits must be logged via src/lib/analytics.ts.
- Search params: q, categoria (slug), bairro (slug), casa=1, pedidos=1, nota, ordem.
- Receiving orders badge uses isReceivingNow() from utils.
- Login page: tabs Entrar / Criar conta; methods email+password, magic link, and a Google button that only shows a friendly message that Google login is not configured yet. Signup has account type morador vs empresa; empresa continues to a business registration form after signUp (name, category, neighborhood, whatsapp, description).
- emailRedirectTo should be `${window.location.origin}/guia-local/` (or the current origin + basename).
- After writing a review, navigate to the success screen. Reviews start pending because of a DB trigger; do not try to set status=published from the client.
- Link-in-bio themes: forest (green), rose, ocean, sand. Style the public /l/:slug page as a mobile phone-width column centered on desktop.
- TypeScript: this project uses TypeScript 7 with verbatimModuleSyntax (use `import type`) and no enums. Keep `npm run build` green.
- If signUp returns a session, proceed; if it requires email confirmation, show a clear message.
- Do not add new dependencies unless necessary. qrcode.react, recharts, lucide-react, date-fns, supabase-js are already installed.
- When done, run `npx tsc -b` and `npm run build` and fix all errors.

Implement complete, polished, production-quality pages. No TODOs, no placeholders.
