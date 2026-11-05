# Nestly — App Build Structure (Phased)

> Companion to **Nestly-Product-Overview.md**. Every phase lists **(a) what is built, (b) why, (c) how to test / pass criteria.**

---

## 0. Ground Rules (apply to every phase)

### 0.1 The credit-saving rule (VERY IMPORTANT)
> In the first few Building Phases, focus on as much UI as possible **before** we enable Lovable Cloud and build the database. Create the UI and design of **all dashboard items** before connecting those menus to Lovable Cloud where data can be processed.
> **Logic:** Lovable burns a lot of credits when building the database. A complete UI saves building credits. Once the UI is done, we enable Lovable Cloud and the dashboard pages start having real data as we build.

How this is enforced:
- **Phases 1–10 = UI only.** No Lovable Cloud, no database, no auth backend, no storage, no edge functions, no real API calls. All data comes from a single **mock data layer** (`/src/mocks`) behind a **service interface** (`/src/services/*`).
- Mock "login" uses a **role switcher** (Owner / Caretaker / Agent / Finance / Legal / Tenant) so every role's UI can be reviewed without a backend.
- Every Lovable prompt in Phases 1–10 must start with: *"UI only. Use mock data from /src/mocks. Do NOT enable Lovable Cloud, create tables, or call external APIs."*
- **Phase 11 is the gate** — Lovable Cloud is enabled only after UI sign-off (Phase 10).
- Because components talk to `services/*`, Phases 12+ swap mock services for real ones **without redesigning pages**.

### 0.2 Product decisions locked in
| Topic | Decision |
|---|---|
| Landing page | **None.** App opens at **Auth** (Login, Sign up, Forgot/Reset password, Accept invite) → then **Dashboard**. Marketing site is out of scope (R2 is only for public app images). |
| Test hosting | **Vercel** during test (live URL for performance & device testing) → later migrate to **Cloudflare Workers**. |
| Truncation & tooltips | App shell and all cards/tables use **`truncate`** (single-line ellipsis; `line-clamp-2/3` for descriptions) with a **hover/focus tooltip** for the full text. **All dashboard charts show tooltips on hover** (and tap on mobile). |
| Money | Nestly **does not hold or move money / no landlord payouts.** Tenants can **pay rent in-app via a payment gateway (Yoco or Fastpay)**; funds settle directly to the landlord's own merchant account at the gateway. Nestly only records status (paid/failed/pending) and reconciles. |
| E-signature | In scope: leases, notices, addendums, inspection sign-off (built in-app; provider TBD, see §3). |
| Credit/background checks | **Done by the Owner outside Nestly.** App shell includes an **Owner screening checklist** (per applicant/tenant) — no bureau integration. |
| Language | **English only** (en-ZA). Still keep strings in a single file so more languages can be added later. |
| Pricing | **By number of tenants per property** (see §2). |
| Staff scope | Agents / Finance / Legal / Caretakers belong to **one Owner account (Admin) only.** No agency multi-owner mode. |
| Currency / locale | ZAR (`R 12 500,00`), SAST, `DD MMM YYYY`, +27 phone formats. |
| Design | As per Product Overview §8 — sage gradient, glass cards, olive accent, dark collapsible sidebar with white icons, mobile floating tab bar, Hanken Grotesk. |

### 0.3 Definition of Done (every phase)
1. Works at **360 px, 768 px, 1280 px+** (mobile first).
2. Sidebar collapse/expand works (desktop); mobile tab bar works.
3. Long text **truncates** with a tooltip; **charts have hover/tap tooltips**.
4. Loading (skeleton), empty and error states exist for each new page.
5. Keyboard focus visible; contrast AA; `prefers-reduced-motion` respected.
6. No console errors; builds and deploys cleanly to Vercel.
7. Owner (you) signs off the phase before the next begins.

---

## 1. Phase Map

| # | Phase | Type | Lovable Cloud? |
|---|---|---|---|
| 1 | Foundation, design system & app shell | UI | ❌ |
| 2 | Auth screens & invitation/registration flows | UI | ❌ |
| 3 | Owner dashboard & property switcher | UI | ❌ |
| 4 | Properties, units & documents | UI | ❌ |
| 5 | Tenants & change-of-details workflow | UI | ❌ |
| 6 | Requests & maintenance | UI | ❌ |
| 7 | Billing, statements & rent payment (gateway UI) | UI | ❌ |
| 8 | Leases, e-signature, applications & screening checklist | UI | ❌ |
| 9 | Staff & permissions, legal/notices, schedule, announcements, reports | UI | ❌ |
| 10 | Tenant portal (mobile-first) polish, full UI QA & **UI freeze** | UI | ❌ |
| — | **🚦 GATE: UI sign-off → enable Lovable Cloud** | | |
| 11 | Backend foundation: Cloud, auth, roles, RLS, audit | Data | ✅ |
| 12 | Properties, units, tenants & invitations (real data) | Data | ✅ |
| 13 | Requests, messaging, documents & notifications (in-app) | Data | ✅ |
| 14 | Billing, leases, pricing/subscriptions & reports (real data) | Data | ✅ |
| 15 | PostgreSQL migration & data hardening | Data | ➡ Postgres |
| 16 | API integrations (sandbox/test keys) | Integrations | ✅ |
| 17 | Security audit, POPIA review & real-life testing | QA | ✅ |
| 18 | Go-live: live API keys, Cloudflare migration & launch | Launch | ✅ |

---

# PART A — UI-ONLY PHASES (No Lovable Cloud)

## Phase 1 — Foundation, Design System & App Shell

**(a) What is built**
- Project scaffold: React + Tailwind, routing, role-aware route map (all routes exist as placeholders).
- **Design tokens** (colours, radius, shadows, type scale, spacing) per Product Overview §8.3–8.4; Hanken Grotesk loaded.
- **Core components:** GlassCard, PillButton (with circular icon), SegmentedChips, StatusChip, KpiTile (donut / sparkline / tick-bar variants), PageHeader (two-tone title), DataTable, Tooltip, Avatar + AvatarUploader (mock: pick → crop → preview → delete), Modal / BottomSheet, Toast, Skeleton, EmptyState, ChartCard with tooltip wrapper.
- **App shell:** dark near-black **collapsible sidebar** (white icons, expand/collapse on click, tooltip labels in collapsed rail, state remembered), top bar (**property switcher**, search, notifications, avatar menu), mobile **floating pill tab bar**, page transition + staggered card animation.
- **Mock layer:** `/src/mocks` + `/src/services` interfaces; **role switcher** (dev-only) to preview each role's navigation.
- `truncate` utility conventions + tooltip pattern documented in a `/design` showcase page.

**(b) Why**
Everything else reuses these parts. Locking the look, shell and mock architecture first prevents rework and protects credits; the service layer makes the later backend swap cheap.

**(c) How to test / pass**
- Sidebar collapses/expands on click (264 ↔ 76 px), icons stay white, tooltips appear in rail, state survives refresh.
- Role switcher changes nav items correctly (e.g. Tenant sees tenant tabs only).
- Showcase page renders every component incl. long-text truncation + tooltip, chart tooltip on hover/tap.
- Mobile 360 px: tab bar floats, no horizontal scroll.
- Visual side-by-side with reference screenshots: radius, glass blur, olive accents, two-tone titles match.
- Deploy to **Vercel** preview succeeds.

---

## Phase 2 — Auth Screens & Invitation/Registration Flows (UI)

**(a) What is built** (the app **starts here — no landing page**)
- Auth layout (form + brand/visual panel; mobile single column): **Login, Sign up (Owner), Forgot password, Reset password, Verify email (screen), Accept staff invite, Tenant registration via link** (property + unit prefilled and locked; tenant sees their captured details), 2FA code screen (UI), Session-expired screen.
- Form validation (client-side), password strength meter, show/hide password, error and success states.
- Mock behaviour: successful "login" routes to the dashboard for the selected mock role; invitation links open the right mock flow.
- Owner **onboarding wizard** (UI): business/landlord details → add first property → choose plan preview → invite staff (skippable).

**(b) Why**
Auth is the app's front door and defines the first-run experience for all six roles. Designing every state now (invalid link, expired invite, etc.) avoids costly backend rework later.

**(c) How to test / pass**
- Navigating to `/` redirects to Login; no marketing page exists.
- Each form shows correct validation (empty, bad email, weak password, mismatched passwords).
- Invite link (mock tokens): valid → registration; expired/used → friendly error screen.
- Tenant registration shows prefilled property/unit read-only.
- Mock login as each role lands on the correct home (Owner dashboard, Tenant home, etc.).
- Mobile and desktop layouts verified; keyboard-only completion of login works.

---

## Phase 3 — Owner Dashboard & Property Switcher (UI)

**(a) What is built**
- **Owner Dashboard** (mirrors the *Overview* reference): greeting header, featured property card (glass overlay), KPI tiles (rent collected vs due, arrears, occupancy, open requests, upcoming lease expiries), **rent collection chart (tooltip on hover)**, arrears ageing gauge, "Today / needs attention" list, recent activity feed.
- **Property switcher** dropdown (avatar, name, address truncated, "All properties" option) that changes mock data context across the app.
- Notification centre dropdown + page; global search overlay (mock results).
- Role-specific dashboard variants: Caretaker, Agent, Finance, Legal (reduced KPIs/widgets).

**(b) Why**
The dashboard is the product's home and the best place to validate cards, charts, tooltips and the multi-property concept before building deeper pages.

**(c) How to test / pass**
- Switching property updates all KPI numbers, chart and lists.
- Every chart shows a tooltip on hover (desktop) and tap (mobile) with correct formatting (ZAR, months).
- Long property names/addresses truncate with tooltip; no layout overflow at 360 px.
- Each role sees only its own dashboard variant.
- Skeleton → content transition and stagger animation play once, smoothly.

---

## Phase 4 — Properties, Units & Documents (UI)

**(a) What is built**
- **Properties grid** (image cards, status badges, filters: type/province/status) and **Add/Edit property** (multi-step form: details, address (SA), photos, amenities, municipal/meter info, rules).
- **Property detail** (tabs: Overview · Units · Tenants · Documents · Maintenance · Finance snapshot · Staff assigned).
- **Units** list/grid (vacant / occupied / notice / maintenance), add/edit unit, bulk add units.
- **Documents** UI: folder/list view, upload dialog (mock), type tags (title deed, compliance cert, insurance, plans), preview drawer.
- Empty state: "Add your first property".

**(b) Why**
Properties and units are the spine of the data model; tenants, leases, requests and billing all hang off them.

**(c) How to test / pass**
- Create/edit/delete property and unit flows complete with mock data and confirmation dialogs.
- Filters and search work on mock data; empty and zero-result states appear.
- Upload dialog shows progress, rejects wrong file type/size (UI validation) and previews files.
- Tabs deep-link by URL; browser back works.
- Mobile: cards stack, tables become card lists.

---

## Phase 5 — Tenants & Change-of-Details Workflow (UI)

**(a) What is built**
- **Tenants** page (mirrors *Clients* reference): KPI tiles, filterable table (tenant, unit, lease end, balance, status), selectable row → **side profile rail** (contact, lease, balance, requests, documents).
- **Add / edit / archive / delete tenant** (multi-step), assign to property + unit, occupants, emergency contact, surety.
- **Send registration link** dialog (copy link / email / WhatsApp / SMS — mock send, shows preview of message).
- **Tenant "My details" page** (tenant view) with **Change details** → edit form → submit confirmation.
- **Owner "Change requests" inbox**: old vs new values diff, Approve / Reject (with reason), history log; the "Request for change of details" **email template preview**.
- Avatar upload/delete on tenant and staff profiles.

**(b) Why**
Tenant onboarding and the change-of-details loop is a headline requirement; validating the full interaction (owner ↔ tenant) in UI first ensures the logic is right before it is coded.

**(c) How to test / pass**
- Owner: add tenant → "send registration link" → mock link opens Phase 2 tenant registration.
- Tenant: tap Change details → edit → submit → status shows "Pending approval".
- Owner: open Change requests → diff displays only changed fields → approve → tenant view shows updated data (mock) and history entry.
- Reject requires a reason; tenant sees it.
- Avatar upload → crop → save → delete returns initials fallback.
- Table → card list on mobile; names/emails truncate with tooltips.

---

## Phase 6 — Requests & Maintenance (UI)

**(a) What is built**
- **Tenant:** multi-step **Log a fault / Request upgrade / General query / Move-out notice** flow (modelled on the *Book a tour* mobile flow: category → details → photos → priority → review → **"You're all set"** success screen), request tracker with status timeline.
- **Owner/Caretaker:** requests list + board view (status pipeline: New → Acknowledged → Assigned → In progress → Awaiting quote → Resolved → Closed), filters (property, priority, category, assignee), **request detail panel** (mirrors *Tours* right rail) with chat-style thread, internal notes vs tenant-visible comments, assign caretaker/contractor, cost capture, quote approval dialog.
- Contractor directory (simple list/cards).
- Preventive maintenance schedule (UI list/calendar entries).
- Resolved-request tenant rating prompt.

**(b) Why**
Requests are the core day-to-day interaction between tenants and the owner; this is the most used flow on mobile.

**(c) How to test / pass**
- Tenant completes each request type on a 360 px phone; success screen animates.
- Status changes on owner side reflect in tenant tracker (mock state).
- Internal notes never appear in tenant view.
- Attachments: preview thumbnails, remove, file validation messages.
- Board and list views stay in sync; chart on "requests by category" has tooltips.

---

## Phase 7 — Billing, Statements & Rent Payment (Gateway UI)

**(a) What is built**
- **Invoices:** list, create invoice (recurring rent + extra charges: utilities, levy, parking, late fee, deposit), recurring schedule setup, preview (PDF-style view), send dialog (email / WhatsApp / SMS / in-app — mock).
- **Statements:** per-tenant running balance, date range, download (mock PDF preview).
- **Payments (record-keeping):** manual payment capture (EFT/cash/card) with proof-of-payment upload; payment list with statuses; **arrears dashboard** with ageing (30/60/90+) and reminder templates.
- **Deposits** tracker (held, interest, deductions, refund) with itemised deduction UI.
- **Tenant "Pay rent" flow (gateway UI mock):** invoice → pay now → gateway checkout **placeholder (Yoco / Fastpay style hosted checkout screen)** → success / failed / pending screens → receipt. Clearly labelled *"Payment processed by [Gateway]. Nestly does not hold your funds."*
- **Rent escalation** scheduler UI.
- Finance-role views (collections, reconciliation list, export buttons).

**(b) Why**
Billing is the highest-value and highest-risk module. Locking the invoice, statement and payment-status UX now — including failure and pending states — avoids expensive logic rewrites with a live gateway.

**(c) How to test / pass**
- Create an invoice with multiple lines → totals/VAT toggle compute correctly (ZAR formatting).
- Recurring schedule preview shows next 3 invoice dates.
- Tenant pay flow shows all outcomes: success, failed card, abandoned, pending; each leads to the correct screen and mock balance update.
- Arrears ageing chart tooltip shows tenant count and amount.
- Statement lines reconcile to invoice/payment totals in mock data.
- Wording about not holding funds appears on the pay screens and invoice emails preview.

---

## Phase 8 — Leases, E-Signature, Applications & Screening Checklist (UI)

**(a) What is built**
- **Leases:** list, detail (term, rent, escalation, deposit, notice period, special terms), renewal & expiry reminders UI, month-to-month conversion.
- **Lease templates** (SA-style structure) with merge-field editor preview.
- **E-signature (UI):**
  - Prepare document → add signers (owner, tenant, co-tenant, surety, witness) → place signature/initial/date fields → send.
  - **Signer experience** (mobile first, no login via secure link): review → draw/type/upload signature → consent checkbox → sign → confirmation.
  - Status tracker (Draft / Sent / Viewed / Signed / Declined / Expired), audit-trail view (timestamps, IP/device — mock), signed PDF preview, reminders.
  - Used for leases, addendums, notices, inspection sign-off, move-in/out checklists.
- **Applications (Agent/Owner):** vacancy list, enquiries pipeline, viewing scheduler, application form (tenant-facing via link), applicant detail.
- **Owner Screening Checklist** (in app shell, per applicant/tenant): owner ticks off checks they conduct themselves — ID verified, proof of income, employer verification, credit check (done externally), previous landlord reference, background/criminal check (external), affordability (rent ≤ ~30–35% income), POPIA consent captured, deposit agreed. Fields: result (Pass / Concern / Fail), notes, date, attachment of the external report. Progress ring + "Ready to approve" state. **No bureau integration.**
- Inspections (incoming/outgoing) checklist UI with photos and sign-off via e-signature.

**(b) Why**
Leases and signatures are the legal backbone; the owner-run screening checklist replaces bureau integrations (simpler, cheaper, still POPIA-aware by recording consent).

**(c) How to test / pass**
- Prepare a lease → add 2 signers → send → open signer link on a phone → sign (draw & typed) → status changes to Signed; audit trail displays.
- Declined/expired states render properly.
- Screening checklist: progress updates as items are ticked; cannot mark "Ready to approve" until required items are complete; notes/attachments persist in mock state.
- Application → approve → "Create tenant & lease" shortcut works with mock data.
- Inspection: photos per room, tenant sign-off flow completes.

---

## Phase 9 — Staff & Permissions, Legal/Notices, Schedule, Announcements & Reports (UI)

**(a) What is built**
- **Staff & permissions:** staff list (Caretaker, Agent, Finance, Legal), **invite staff** dialog, per-property scope selector, **permission matrix editor** (view/create/edit/delete/approve/export by module) with role presets and overrides, spend-limit field for caretakers, deactivate/remove staff, avatar management. *(All staff belong to this owner account only.)*
- **Legal:** notice templates (reminder, letter of demand, breach, termination, renewal), generate-and-send flow with delivery status, **eviction pipeline tracker** (stages, dates, documents) with a visible note that eviction follows a lawful court process.
- **Schedule/Calendar** (mirrors *Tours & bookings*): month calendar, day timeline, open slots, detail panel — for inspections, maintenance visits, viewings.
- **Announcements:** compose (property/unit/all), preview, schedule, history; tenant notice board.
- **Reports & Insights** (mirrors *Market insights*): rent roll, arrears ageing, income vs expenses, maintenance cost by property, vacancy duration, turnover; date-range and property filters; **chart tooltips**, export buttons (mock).
- **Settings:** profile, notification preferences, company details & branding (logo upload), **Subscription & billing (pricing by number of tenants per property)** — plan calculator, usage meter, invoices (mock), upgrade/downgrade dialogs.
- **Audit log viewer** (mock rows) and activity feed.

**(b) Why**
Completes every remaining sidebar item so there are no "dead" menus before the backend is enabled — exactly what saves credits later.

**(c) How to test / pass**
- Change a permission in the matrix → switch to that mock role → nav items/buttons appear or disappear accordingly.
- Caretaker scoped to Property A cannot see Property B in the switcher.
- Notice generation shows merge fields filled with mock tenant data; delivery statuses render.
- Pricing calculator updates the monthly cost as tenant counts per property change.
- Every sidebar link in every role opens a designed page (no 404/placeholder).
- Report charts: tooltips, empty states and date filters function.

---

## Phase 10 — Tenant Portal Polish, Full UI QA & UI Freeze

**(a) What is built**
- **Tenant portal (mobile first)** finalised: Home (balance, due date, Pay now, quick actions), My lease & unit, Requests, Statements & invoices, Documents (lease, signed docs), My details, Notifications, Announcements. Floating pill tab bar with 4–5 tabs.
- **PWA basics** (manifest, icons, install prompt UI) — still no backend.
- Cross-app QA pass: consistency (spacing, radius, type), copy review (English only), `truncate` + tooltip audit, chart-tooltip audit, empty/error/loading audit, accessibility audit (contrast, focus, reduced motion), performance audit (image sizes, bundle, blur usage).
- Responsive sweep at 360 / 390 / 768 / 1024 / 1280 / 1536.
- **Vercel** production-style deploy of the mock app for real-device testing.
- **UI Freeze document:** list of pages, components, mock-data shapes → becomes the schema checklist for Phase 11.

**(b) Why**
Tenants are mostly on phones, so their experience must be flawless before any data work. The UI freeze gives a clean hand-off: anything changed afterwards costs backend credits.

**(c) How to test / pass**
- Full click-through for each of the six roles with no dead ends or console errors.
- Lighthouse (mobile) targets on the Vercel URL: Performance ≥ 85, Accessibility ≥ 95.
- Real-device test on at least one Android and one iPhone (Safari) — tab bar, keyboard overlap, signature drawing, file picker.
- Sign-off checklist completed by you → **🚦 GATE PASSED**.

---

# 🚦 GATE — Enable Lovable Cloud only after Phase 10 is signed off

---

# PART B — DATA PHASES (Lovable Cloud enabled)

> From here, **replace each mock service with a real one, page by page.** Don't redesign pages. Work in vertical slices (one module at a time), keep prompts small to conserve credits, and test each slice before moving on.

## Phase 11 — Backend Foundation: Cloud, Auth, Roles, RLS & Audit

**(a) What is built**
- Enable **Lovable Cloud**; environments and secrets structure.
- **Auth:** email/password, email verification, password reset, invite acceptance, session handling, optional 2FA hooks.
- **Schema (core):** profiles (avatar ref), **separate user_roles table**, owner accounts, staff memberships, property-scope assignments, permissions, invitations (token, role, property, unit, expiry, single-use), audit_log.
- **Row-Level Security** per owner account and per property scope; security-definer helper functions for role checks.
- Replace mock auth + role switcher with real auth (keep a dev-only role preview for the Owner if wanted).

**(b) Why**
Security model first: every later table inherits these rules. Roles in a separate table and strict RLS prevent privilege escalation and data leakage between owners.

**(c) How to test / pass**
- Sign up → verify → login → logout → reset password works end-to-end.
- Two test owners: Owner A cannot read/modify Owner B's rows (attempt via UI and direct query).
- Caretaker scoped to Property A cannot read Property B.
- Invitations: valid works once; reused/expired/tampered tokens fail.
- Audit log records login, role change, invite events.
- Users cannot change their own role (attempt blocked).

## Phase 12 — Properties, Units, Tenants & Invitations (Real Data)

**(a) What is built**
- Tables + services: properties, units, tenants, occupants, tenant–unit links, change-of-details requests (old/new JSON, status, decided_by/at).
- Property switcher uses real data; CRUD for properties/units/tenants; registration links tied to property/unit.
- Change-of-details workflow end-to-end (notification in-app; email stubbed until Phase 16).
- Avatar/document upload to **temporary Cloud storage** (migrated to S3 in Phase 16).
- Seed script for realistic South African test data.

**(b) Why**
Core entities power every other module; doing them first lets billing, requests and leases reference real IDs.

**(c) How to test / pass**
- Create owner → property → units → tenant → registration link → tenant registers → tenant sees own captured details only.
- Tenant edits details → owner sees diff → approve → data updates, history stored; reject stores reason.
- Deleting/archiving a tenant respects related records (no orphan data).
- Property switcher persists selection; RLS holds across roles.

## Phase 13 — Requests, Messaging, Documents & In-App Notifications

**(a) What is built**
- Requests, comments (internal vs public), attachments, status history, assignments, costs/quotes.
- Document records (typed, per property/tenant) with signed-URL access; upload/download/delete rules by role.
- In-app notification engine (event → notification rows → bell/centre), realtime updates for requests and threads.
- Announcements and notice board (data-backed); calendar/schedule items.

**(b) Why**
Requests and messaging are the highest-frequency tenant interaction; documents must be private by default.

**(c) How to test / pass**
- Tenant logs fault with photo → owner/caretaker sees it live → assigns → status updates → tenant notified.
- Internal notes invisible to tenants (verify via direct API attempt).
- Document URLs expire; tenant cannot access another tenant's file.
- Notification counts accurate and mark-as-read persists.

## Phase 14 — Billing, Leases, E-Signature Records, Pricing & Reports (Real Data)

**(a) What is built**
- Leases, invoices, invoice lines, payments, payment allocations, statements, deposits, arrears calculations, recurring invoice scheduler (scheduled job), escalation scheduler.
- **Payment status model** (pending / paid / failed / refunded) ready for gateway webhooks — no funds held by Nestly.
- E-signature data model (envelopes, signers, fields, events/audit trail, signed document hash); in-app signing flow functional with Cloud storage (provider/legal-validity review in Phase 16–17).
- Screening checklist persistence (per applicant/tenant, with attachments).
- Pricing/subscription tables: plan = **tenants per property** tiers; usage counting; plan-limit enforcement and upgrade prompts.
- Reports/queries (rent roll, arrears, income vs expenses, maintenance cost, vacancy, turnover) backed by real data, with CSV/PDF export.

**(b) Why**
Completes all business logic with real numbers, while still using test integrations — the app becomes functionally complete.

**(c) How to test / pass**
- Generate a month of recurring invoices for a seeded portfolio; totals match expected (spreadsheet cross-check).
- Record payments (manual) → statement/arrears update correctly; deposits reconcile.
- Sign a lease with two signers; audit trail complete; document hash stable; tampering detected.
- Exceeding plan tenant limit blocks adding tenant and shows upgrade path.
- Report totals equal underlying invoice/payment sums.

## Phase 15 — PostgreSQL Migration & Data Hardening

**(a) What is built**
- Migrate database from Lovable Cloud to **PostgreSQL** (managed host chosen with SA latency/POPIA in mind); migrate schema, RLS/policies (or equivalent authorisation layer), functions, scheduled jobs, seed/test data.
- Connection pooling, indexes (property_id, tenant_id, due_date, status), constraints, soft-delete & retention rules, backup & restore plan, migration scripts and rollback plan.
- Update env config on **Vercel**; verify all slices again.

**(b) Why**
You asked to be on Postgres **before** paid live APIs go live; doing it now means integrations, audit and launch happen on the final database.

**(c) How to test / pass**
- Row counts and checksums match pre/post migration for every table.
- Full regression of Phases 11–14 test scripts passes against Postgres.
- Restore-from-backup drill succeeds; documented RPO/RTO.
- Query performance check on a 50-property / 2 000-tenant seeded dataset (key pages < 1.5 s).

---

# PART C — INTEGRATIONS, SECURITY & LAUNCH

## Phase 16 — API Integrations (Sandbox / Test Keys)

> Mock/free APIs were used throughout the build. Here each service is wired up using **sandbox or test credentials**; live keys are switched on only in Phase 18.

**(a) What is built**
| Integration | Scope |
|---|---|
| **Mailgun** | Transactional emails: invites, registration links, change-of-details request, invoices/statements, reminders, notices, e-sign requests; templates, bounce/complaint webhooks, SPF/DKIM via Cloudflare DNS |
| **Twilio SMS + WhatsApp** | Rent reminders, request updates, registration links; approved WhatsApp templates; opt-in/opt-out (POPIA); delivery webhooks |
| **AWS S3 (af-south-1, Cape Town)** | Private buckets for avatars, ID docs, leases, signed PDFs, proofs of payment; encryption at rest, signed URLs, lifecycle/retention; migrate files from temporary storage |
| **Cloudflare R2** | Public app images only (e.g. brand/auth visuals, default property imagery) |
| **Cloudflare DNS** | App domain records, email auth records |
| **Payment gateway — Yoco or Fastpay (final choice at this phase)** | Hosted checkout/payment links for tenant rent; webhooks update payment status; refunds/disputes handled at gateway; settlement goes directly to landlord's merchant account — **Nestly never holds or moves funds**; confirm per-landlord merchant onboarding model and fees with the provider before building |
| **E-signature provider (decide: in-house vs provider)** | Confirm legal validity under ECTA, audit trail, advanced vs simple signatures; wire final provider if chosen |
| **Push (PWA / FCM)** | Optional: web push for requests and rent due |

**(b) Why**
Integrations cost money and add failure modes; adding them last keeps the build cheap, and sandbox keys let us verify behaviour without real charges or messages.

**(c) How to test / pass**
- Each integration has a **test checklist**: send/receive in sandbox, webhook signature verified, retries/failure path, logging.
- Email deliverability: SPF/DKIM/DMARC pass; test to Gmail/Outlook/Yahoo inboxes.
- WhatsApp/SMS reach a test device; STOP/opt-out honoured.
- Files land in **af-south-1**; direct public access to private buckets is denied; signed URLs expire.
- Gateway sandbox: successful, failed, abandoned and duplicate-webhook payments all leave correct invoice status; no card data touches Nestly servers.
- E-sign: signed PDF stored in S3 with audit trail attached.

## Phase 17 — Security Audit, POPIA Review & Real-Life Testing

**(a) What is built / done**
- **Security audit:** RLS/authorisation tests per role, OWASP Top 10 review, dependency scan, secrets scan, rate limiting, brute-force protection, CSP/security headers, file-upload scanning, webhook verification, session/2FA review, audit-log completeness.
- **POPIA review:** data inventory, lawful basis & consent records, retention/deletion, data-subject request flow (export/delete), privacy notice, breach-response plan, operator agreements for Mailgun/Twilio/AWS/gateway.
- **Legal review:** lease templates, notices, e-signature validity, deposit handling language (Rental Housing Act), "no self-help eviction" messaging.
- **UAT with real people:** 1–3 real landlords and 5–10 real tenants on real devices and networks (incl. low-signal), using test data then limited real data.
- Performance/load test; accessibility re-test; bug-bash and fix cycle.

**(b) Why**
This is the final line of defence before real personal data and real payments are in play.

**(c) How to test / pass**
- No critical/high findings open; mediums have accepted mitigation.
- Penetration-style test confirms cross-owner and cross-property isolation.
- DSR test: export and delete a test tenant's data end-to-end.
- UAT success criteria: ≥ 90 % of tasks completed unaided; no data-loss bugs; owner sign-off.

## Phase 18 — Go-Live: Live Keys, Cloudflare Migration & Launch

**(a) What is built / done**
- Switch integrations to **live keys** (Mailgun, Twilio, gateway, S3, e-sign) with spending caps and alerts.
- **Migrate hosting from Vercel to Cloudflare Workers**; Cloudflare DNS cut-over, SSL, WAF, caching rules (R2 for public images only), environment variables, CI/CD.
- Monitoring & alerting (errors, uptime, webhooks, scheduled jobs), backups verified, runbook/rollback plan.
- Production data onboarding (CSV import tools for properties/tenants), support channel, in-app help links.
- Staged launch: pilot landlords → general availability.

**(b) Why**
Controlled cut-over reduces risk; pilot users reveal real-world issues before full release.

**(c) How to test / pass**
- Smoke test on production URL: signup → add property → invite tenant → tenant pays small real invoice (live gateway) → receipt, statement and notifications correct.
- DNS/SSL/headers verified; Cloudflare Workers response times acceptable from SA locations.
- Rollback to previous release tested.
- Alerts fire on a deliberate test failure; first 7 days monitored with daily review.

---

## 2. Pricing Model Notes (per tenants per property)

- **Unit of billing:** active tenants per property (archived tenants don't count).
- **Suggested shape (to be finalised before Phase 9 UI & Phase 14 logic):** tiered per property, e.g. Starter (up to 5 tenants), Standard (up to 20), Pro (up to 50), Custom (50+); monthly or annual; free trial.
- Rules to decide: do vacant units count? Are limits per property or pooled? Behaviour on exceeding limit (block vs grace/auto-upgrade)? Proration on mid-month changes?
- Nestly subscription billing is separate from tenant rent payments (rent goes to landlords via the gateway; the subscription is Nestly's own revenue — needs its own gateway setup).

## 3. Open Items to Confirm (do not block Phases 1–10)

1. **Yoco vs Fastpay:** confirm which supports per-landlord settlement (each landlord's own merchant account) and webhook/API access suitable for a software platform; fees and onboarding requirements.
2. **E-signature approach:** build in-app (simple e-signature with audit trail) vs integrate a provider; confirm legal-validity needs under ECTA (advanced signatures aren't required for most residential leases, but confirm with counsel).
3. **Pricing tiers** and trial rules (above).
4. **PostgreSQL host** choice (SA/EU region, managed service) for Phase 15.
5. **Domain name** and email sending domain for Cloudflare DNS/Mailgun.
6. **Legal review** of lease/notice templates by a South African property attorney.

---

## 4. Lovable Prompting Tips (credit-saving)
- One phase → several small prompts (one page or component group per prompt); avoid "build everything".
- In UI phases always include: *"UI only. Mock data from /src/mocks via /src/services. Do NOT enable Lovable Cloud. Use truncate + tooltip for long text and tooltips on all charts."*
- Reuse components from Phase 1; ask Lovable to *extend* existing components rather than create new ones.
- In data phases: one table group per prompt, state RLS rules explicitly, and test before the next prompt.
- Keep a `PROJECT_NOTES.md` in the repo (design tokens, service interfaces, role matrix) so each prompt can say "follow PROJECT_NOTES.md".