You are continuing the Guia Local app in /workspace/guia-local. The public site, auth, and resident area are already implemented and `npm run build` passes. Do NOT rewrite those public/auth/resident pages unless you must fix a compile error you introduced.

GOAL: implement the full business area and admin area with REAL Supabase data (no mock arrays). Follow docs/SPEC.md. All UI in Portuguese pt-BR, existing design system (Button, Input, Field, Select, Textarea, Card, Badge, Modal, Spinner, CategoryIcon, BusinessCard), tokens bg-brand, text-brand-dark, bg-brand-soft, bg-canvas, text-ink, text-muted, border-line, bg-card. Tailwind v4, TypeScript 7 with verbatimModuleSyntax (`import type`), no enums.

Replace these stubs completely (no PlaceholderPage, no TODOs):

Business (use `useAuth().business`; if the signed-in user has no business yet, show a registration form: name, category, neighborhood, whatsapp, description, then refreshProfile):
- src/pages/business/BusinessDashboardPage.tsx
- src/pages/business/BusinessProfileEditPage.tsx
- src/pages/business/BusinessServicesPage.tsx
- src/pages/business/BusinessReviewsPage.tsx
- src/pages/business/BusinessAvailabilityPage.tsx
- src/pages/business/BusinessLinkInBioPage.tsx
- src/pages/business/BusinessPromoPage.tsx
- src/pages/business/BusinessSettingsPage.tsx

Admin (only reachable by role admin; layouts already exist):
- src/pages/admin/AdminDashboardPage.tsx
- src/pages/admin/AdminBusinessesPage.tsx
- src/pages/admin/AdminSuggestionsPage.tsx
- src/pages/admin/AdminModerationPage.tsx
- src/pages/admin/AdminSearchesPage.tsx
- src/pages/admin/AdminCategoriesPage.tsx
- src/pages/admin/AdminUsersPage.tsx
- src/pages/admin/AdminSettingsPage.tsx

DETAILS

Business dashboard:
- KPI cards: visits (count profile_visits last 30 days), WhatsApp clicks (whatsapp_clicks last 30 days), average rating + review_count from business_stats, awaiting_reply_count.
- Line or bar chart with recharts of daily visits for last 30 days.
- Toggle “recebendo pedidos”. When turning ON, set receiving_orders=true and receiving_orders_until = today + site_settings.availability_validity_days. When OFF, set receiving_orders=false.
- Profile completeness bar using profileCompleteness() from utils (include services/photos/hours counts).
- Share button (Web Share or copy public profile URL). Public profile path is `/empresa/{slug}` (basename is already /guia-local).

Business profile edit:
- Form for name, tagline, description, category, neighborhood, address, phone, whatsapp, email, website, instagram, home_service, logo and cover (URL or upload).
- Live preview card on the side (desktop) using the current form values.
- Save updates the businesses row. Upload logo/cover to bucket `business-photos` at `{business_id}/{timestamp}-{filename}` and store public URL.

Services and photos:
- CRUD services (name, description, price, price_label, active, sort_order with up/down).
- Photo gallery: upload to `business-photos` path `{business_id}/...`, insert business_photos, set is_cover (also update businesses.cover_url), reorder, delete (remove storage object if storage_path set).

Reviews:
- List all reviews for the business (RLS allows owner to see pending/flagged too). Show rating, author name via public_profiles, status, body, existing reply.
- Reply form (update reply_text; trigger fills replied_at).
- Report/denunciar: set reported_by_business=true and report_reason (trigger flags it).

Availability:
- Receiving orders toggle + date input for receiving_orders_until.
- Weekly hours (0=Sunday..6=Saturday): for each day, is_closed or open_time/close_time. Upsert business_hours.
- Multi-select neighborhoods as service areas (business_service_areas). Load all neighborhoods.

Link in bio:
- Edit slug (unique), headline, bio, theme (forest|rose|ocean|sand), enabled.
- Buttons CRUD: label, url, icon, enabled, sort_order. Reorder.
- Live phone-frame preview like the public /l/:slug page.
- Show the public URL `{origin}/guia-local/l/{slug}`.

Divulgação:
- Public profile link, copy, share on WhatsApp (wa.me with invite text).
- Download a simple business card image (canvas or a nicely laid out card that can be saved as PNG): logo, name, category, whatsapp, public URL.
- QR code (qrcode.react) pointing to `{origin}/guia-local/empresa/{slug}/avaliar` — download PNG and a print view.
- Invite message textarea, prefilled, copy button.

Business settings:
- Account: full_name, phone (profiles), email read-only.
- Notification toggles (notify_review_email, etc.).
- Pause profile (is_paused).
- Request deletion (deletion_requested_at = now()) with confirmation.

Admin dashboard:
- Stats: active businesses, pending businesses, pending+flagged reviews, pending suggestions, searches last 7 days, whatsapp clicks last 7 days.
- Activity chart (recharts) last 14-30 days from activity_log and/or searches/visits.
- “Precisa de atenção” box: pending businesses, flagged reviews, pending suggestions (links to the right pages).
- Recent registrations (latest businesses).

Empresas e prestadores:
- Tabs: Todos / Pendentes / Ativos (and maybe Ajustes).
- Search by name.
- Table/list with status badges.
- Side panel to analyze a business (details, adjustment_notes). Actions: Aprovar (status=active, approved_at=now(), approved_by=current user), Solicitar ajustes (status=adjustments_requested + notes), Rejeitar, Arquivar.
- “Novo cadastro” modal/page: admin creates a business (name, slug auto, category, neighborhood, whatsapp, owner email optional). Admin bypasses pending trigger so you may set status active or pending.

Indicações:
- List suggestions with status. Actions: “Criar cadastro” — insert a pending business from the suggestion fields, set suggestion status=registration_created and created_business_id; or Arquivar.

Moderação de avaliações:
- Queue of status in (pending, flagged, adjustment_requested).
- Show body, rating, business name, author, report_reason/flag_reason.
- Keep/publish (status=published), request adjustment (status=adjustment_requested + moderation_notes), remove (status=removed + justification).

Buscas e contatos:
- Totals, top queries, searches with results_count=0, WhatsApp click origins (group by source), export CSV of searches (downloadTextFile in utils).

Categorias:
- CRUD, slug auto from name via slugify, active, show_on_home, icon select using the keys in CategoryIcon (utensils, sparkles, heart-pulse, hammer, car, graduation-cap, paw-print, smartphone, party-popper, home, tag), sort_order with up/down buttons that swap orders.

Usuários:
- List profiles with filters (role, status, search). Detail drawer. Suspend with reason (status=suspended, suspension_reason). Reactivate. Export CSV. Do not allow suspending the currently logged-in admin.

Configurações:
- site_settings form: site_name, site_description, logo upload to bucket `site-assets`, city_name, state_code, moderate_business_signups, moderate_reviews, link_in_bio_enabled, availability_validity_days.
- Neighborhoods CRUD (name, slug, active, sort_order) in the same page, city context is the settings city.

When admin approves or moderates, also insert a row into activity_log (actor_id, action, entity_type, entity_id, metadata).

Do not commit .env.local. Do not break vite base, BrowserRouter basename, or AuthProvider.

When finished, run `npx tsc -b` and `npm run build` and fix every error.
