# Nestly Property Manager

Create: Nestly (store markdown files under "DOCS" for reference) and start building as per Phase 1. The uploaded videos and screenshots are reference for UI layout and design

nestly-product-overview.md (Product Overview)

nestly-app-build-structure.md (Application Build Structure)
-----------------------------------------------------------------------------

You are a senior product designer + front-end engineer. We are building NESTLY, a mobile-first property management web app for South African landlords. I am attaching reference UI screenshots (4 desktop, 2 mobile) and 2 videos (desktop + mobile) showing the exact visual style and animations to recreate. Treat them as the visual source of truth — high-fidelity reconstruction of the look, spacing, card geometry and motion, NOT "inspired by". The reference content is real-estate sales; Nestly re-maps it to property management (landlord, caretaker, staff, tenants).

==================================================

START AT PHASE 1 — UI ONLY

==================================================

We are building in phases. Do ONLY Phase 1 now, then STOP and wait for my sign-off before Phase 2.

CRITICAL RULES (credit saving):

- UI ONLY. Use mock data from /src/mocks, accessed through service functions in /src/services (so a real backend can be swapped in later without redesigning pages).

- Do NOT enable Lovable Cloud. Do NOT create database tables, auth backends, storage buckets, edge functions or call any external API.

- No landing/marketing page. The app will start at Auth (login/signup etc.) in Phase 2; for now "/" redirects to the dashboard shell.

- English only (en-ZA). Currency ZAR formatted like "R 12 500,00". Dates "14 Oct 2026". Keep all UI strings in one file (/src/lib/strings.ts).

- Keep prompts/work small and focused; do not build pages beyond Phase 1 scope.

==================================================

PRODUCT CONTEXT (for naming and mock data)

==================================================

Roles: Owner/Admin, Caretaker, Agent, Finance, Legal, Tenant. Agents/Finance/Legal/Caretakers belong to ONE owner account only.

An owner can have multiple properties and switches between them with a property switcher. Tenants log requests (faults, upgrades), receive invoices/statements and can pay rent in-app via a payment gateway. Nestly never holds or moves money.

Mock data should look South African: properties like "Sunset Gardens, Sandton", "Rosebank Lofts, Johannesburg", "Bryanston Villas"; tenants with SA names; suburbs/provinces; +27 phone numbers; rents R 6 500 – R 28 000.

==================================================

DESIGN SYSTEM (match the screenshots)

==================================================

Look & feel: calm, premium, airy. Soft sage-green vertical gradient canvas fading to warm off-white; glassmorphism cards (translucent white, thin light border, backdrop blur, soft shadow, 20–28px radius); deep olive accent; pill buttons with a white circular icon button at the right end ("Add client ⊕" style); segmented chip filters in a glass pill; "···" menu on cards; KPI tiles with big number + unit + mini visual (donut / sparkline / tick-bar) + delta chip (↗ +18 this month); two-tone page titles with trailing full stop ("Tenants & *units.*" — second word muted); airy tables with selected row highlighted pale sage; charts in olive with dark tooltip chip.

Create these as CSS variables + Tailwind theme tokens (single source of truth):

Colors

- --olive-900: #2E361D   (darkest button/tooltip)

- --olive-800: #363C26   (dark panels)

- --olive-700: #4C5633   (PRIMARY: buttons, active pill, selected day/time)

- --olive-500: #7E8C58   (chart lines/bars, progress)

- --olive-200: #DCE4C8   (chips, soft highlights)

- --olive-100: #E7ECDD   (selected row)

- --canvas-top: #CBD6B3 → --canvas-mid: #E9EBDD → --canvas-bottom: #F3F2EC  (page gradient; outer bg #F1F0EC)

- --surface: #F7F8F3 (cards) / --surface-solid: #FBFBF8 (inputs, tables)

- --glass: rgba(255,255,255,.62) with backdrop-blur 16–24px

- --ink-900: #1B1F16 (headlines) / --ink-500: #6B7062 (secondary text)

- --border-soft: rgba(70,84,42,.12)

- --sidebar-bg: #141613 (dark near-black) with WHITE icons

- Status: success #5E7F3A, warning #C9962B, danger #B5483B, info #4A7C8C (always paired with icon/text, never colour alone)

Radius: 10 / 16 / 22 / 28 / pill. Shadow: 0 10px 30px -12px rgba(40,50,20,.18). Spacing: 4-pt scale.

Typography — Hanken Grotesk (Google Font; fallback Figtree/Albert Sans), tabular numerals:

- Display 56/36px (desktop/mobile) weight 300–400, tracking −0.02em

- H1 page title 40/28px weight 400, two-tone (second word --ink-500), trailing full stop

- H2 section 24/20px wt 500 · H3 card title 18/16px wt 500

- KPI number 44/32px wt 400

- Body 15–16px wt 400 · Label/Button 14px wt 500

- Caption/meta 12–13px · Overline/table head 11px wt 500 UPPERCASE +0.08em

- Sentence case everywhere; italics only for a single accent phrase on hero/mobile greeting.

==================================================

PHASE 1 SCOPE — Foundation, Design System & App Shell

==================================================

1. Scaffold: React + Tailwind + routing. Role-aware route map with placeholder pages for every future menu item (Dashboard, Properties, Tenants, Requests, Schedule, Invoices & Payments, Leases & Documents, Applications & Screening, Staff & Permissions, Legal & Notices, Announcements, Reports, Settings). Placeholders should use the EmptyState component ("Coming in a later phase") — NOT blank pages.

2. Design tokens as above + Hanken Grotesk loaded.

3. Core reusable components (in /src/components/ui and /src/components/nestly):

   GlassCard, PillButton (variants: primary olive with circular white icon, secondary white, ghost), SegmentedChips, StatusChip, KpiTile (variants: donut, sparkline, tick-bar, plain), PageHeader (two-tone title + sub-line + actions), DataTable (selectable row, avatar+name/email cell, status chip cell, progress bar cell), Tooltip, Avatar + AvatarUploader (mock: choose image → crop/preview → save → DELETE returns initials fallback), Modal, BottomSheet (mobile), Toast, Skeleton, EmptyState, ChartCard (area/line with dashed comparison, tick-bar chart, semi-circle gauge — each with a HOVER/TAP TOOLTIP showing values), Timeline list, Stepper.

4. APP SHELL

   - Desktop: LEFT SIDEBAR in dark near-black (#141613) with WHITE icons, COLLAPSIBLE/EXPANDABLE ON CLICK via a toggle button (expanded ≈264px with labels ↔ collapsed ≈76px icon rail with tooltip labels on hover). Remember state in localStorage. Smooth width transition. Active item = olive pill/indicator.

   - Main area uses the sage gradient canvas with glass cards, inside a rounded outer frame like the reference.

   - Top bar: PROPERTY SWITCHER dropdown (property avatar, name, address; "All properties" option; names TRUNCATE with tooltip), global search field, notifications bell with dot, avatar menu (profile, settings, role switcher label, sign out placeholder).

   - Mobile (primary target, 360px+): no sidebar; FLOATING dark pill bottom tab bar with 5 icons (active icon in white circle) exactly like the reference mobile screens; role-aware tabs (Owner: Home · Properties · Requests · Money · Profile; Tenant: Home · Requests · Pay · Documents · Profile) plus a "More" slide-over for remaining menus.

   - Mock DEV ROLE SWITCHER (small control in avatar menu) to preview Owner / Caretaker / Agent / Finance / Legal / Tenant navigation without a backend.

5. TRUNCATION & TOOLTIP CONVENTION (apply everywhere from now on):

   - Any text that can overflow uses `truncate` (single line) or `line-clamp-2/3` and shows the full text in a Tooltip on hover/focus (long-press on touch).

   - Every chart shows a tooltip on hover (desktop) and tap (mobile) with formatted values (ZAR, months).

6. MOTION (from the videos): page change = soft fade/blur-in; page title reveals first, then cards STAGGER in (translate-up + opacity, ~60ms stagger); active nav pill slides between items; cards lift 2–4px on hover; mobile tap ripple; success screens show a ringed check-mark pulse. Respect prefers-reduced-motion.

7. A hidden-from-nav route "/design" — a component showcase page showing every component/variant, long-text truncation + tooltip examples, all three chart types with tooltips, empty/loading states, and the Avatar uploader. This is how I will review Phase 1.

8. Mock layer: /src/mocks (properties, units, tenants, requests, invoices, staff, notifications) + /src/services interfaces returning Promises (with small artificial delay) so skeleton states can be seen.

==================================================

ACCESSIBILITY / QUALITY (Definition of Done)

==================================================

- Works at 360px, 768px, 1280px+; no horizontal scroll on mobile.

- Visible keyboard focus, AA contrast, aria-labels on icon buttons, prefers-reduced-motion respected.

- Loading (skeleton), empty and error states exist for reusable components.

- No console errors; clean build.

==================================================

PHASE 1 PASS CRITERIA (I will test these)

==================================================

1. Sidebar collapses/expands on click (≈264 ↔ 76px), icons stay white on near-black, tooltips show in collapsed rail, state survives refresh.

2. Role switcher changes the navigation correctly (e.g. Tenant sees only tenant tabs).

3. /design shows every component; long text truncates with tooltip; each chart type shows a tooltip on hover/tap.

4. At 360px the floating pill tab bar appears and nothing overflows.

5. Side-by-side with my screenshots: glass cards, radius, olive accents, two-tone titles, pill buttons with circular icon, and stagger animation look the same.

6. Avatar uploader: upload → preview → save → delete (falls back to initials).

When Phase 1 is complete: summarise what was built, list any deviations from the screenshots, and STOP. Do not start Phase 2 until I say "Proceed to Phase 2".

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e8ff3613-692c-414b-bb0f-9015c96a8d73).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
