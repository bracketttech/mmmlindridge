# Nestly — Product Overview

> Property management for South African landlords. One place for owners, caretakers, staff and tenants to talk, pay, request and resolve.
> Status: **Product Overview (v1)**. The App Build Structure (phases) is intentionally *not* in this file — it follows in the next prompt.

---

## 1. Vision & Positioning

**Nestly** is a mobile-first, web-based property management platform that acts as the communication and administration conduit between a **property owner (landlord)** and their **tenants**, with caretakers and specialist staff in between.

**Primary market:** South African landlords and small-to-mid portfolio owners (1–50 units), including those who self-manage and those who run a small team.

**Core promise:**
- Owner sees every property, request, invoice and payment in one dashboard and can switch between properties instantly.
- Tenants do almost everything from their phone: view lease/statement, pay, log a fault, request an upgrade, update details.
- Staff (caretaker, agent, finance, legal) each see only what their role allows.

**Design promise:** calm, premium, glassmorphic UI (sage/olive palette), not a cluttered "accounting tool".

---

## 2. Users, Roles & Permissions

### 2.1 Roles

| Role | Who | Primary purpose |
|---|---|---|
| **Owner / Admin** | Property owner (account holder) | Full control; adds properties, staff, tenants; configures permissions |
| **Caretaker / Property Manager** | On-site/area manager | Day-to-day maintenance, inspections, tenant requests for assigned properties |
| **Agent** | Rental/leasing agent | Listings, enquiries, viewings, applications, new leases |
| **Finance** | Bookkeeper / rent controller | Invoices, payments, arrears, deposits, statements, reports |
| **Legal** | Legal/compliance staff | Notices, breach letters, eviction pipeline, lease documents |
| **Tenant** | Resident | Self-service portal (mobile first) |
| *(Optional later)* **Contractor** | Plumber, electrician, etc. | Receive and update job tickets via link/WhatsApp |
| *(Optional later)* **Co-owner / Accountant (read-only)** | Spouse, accountant | Read-only reporting access |

### 2.2 Permission model
- **Role-based defaults** + **per-user overrides** set by Owner (e.g. caretaker can approve ≤ R2 000 repair spend).
- Permissions are **scoped per property** (a caretaker for Property A can't see Property B).
- Granular permission keys, grouped by module (view / create / edit / delete / approve / export).
- Roles stored in a **separate roles table** (never on the profile) to prevent privilege escalation.
- **Audit log** for every sensitive action (who, what, when, from where).

### 2.3 Default permission matrix (starting point)

| Module | Owner | Caretaker | Agent | Finance | Legal | Tenant |
|---|---|---|---|---|---|---|
| Properties & units | ✅ Full | 👁 Assigned | 👁 Assigned | 👁 | 👁 | — |
| Tenant profiles | ✅ Full | 👁/✏ Assigned | ✏ Applicants | 👁 | 👁 | Own only |
| Requests / maintenance | ✅ | ✅ | 👁 | 👁 (costs) | 👁 | Own only |
| Invoices & payments | ✅ | 👁 | — | ✅ | 👁 | Own only |
| Leases & documents | ✅ | 👁 | ✏ Draft | 👁 | ✅ | Own only |
| Notices / evictions | ✅ | 👁 | — | 👁 | ✅ | Receive |
| Reports | ✅ | Limited | Limited | ✅ | Limited | — |
| Staff & permissions | ✅ | — | — | — | — | — |

---

## 3. Core Concept Flows (from the brief)

1. **Owner → Properties:** Owner creates multiple properties, each with units; a **property switcher** changes the context of the whole app.
2. **Tenant onboarding:** Owner loads/edits/deletes tenant profiles → system sends a **property-specific registration link** → tenant registers, sees captured details.
3. **Change of details:** Tenant taps **"Change details"**, edits fields → system emails **"Request for change of details"** to the landlord → owner approves/rejects → profile updates (with history).
4. **Requests:** Tenants submit **upgrade requests, fault reports**, etc.; owner/caretaker triages, assigns, updates status; tenant is notified.
5. **Billing:** Owner/Finance generates **monthly rental invoices and statements** and sends them (email/WhatsApp/SMS + in-app).
6. **Staff:** Owner (admin) adds a **caretaker** and **multiple staff** (Agents, Finance, Legal), assigns property scope and permissions.

---

## 4. Feature Catalogue

Legend: **[MVP]** must-have for launch · **[V2]** soon after · **[V3]** premium / later

### 4.1 Account, Auth & Security
- [MVP] Email + password sign-up/login, magic-link/invite sign-up, password reset
- [MVP] Invite-based onboarding for staff and tenants (token links, expiry, single-use)
- [MVP] Role-based access control, property-scoped permissions
- [MVP] Avatar upload / replace / delete (all users)
- [MVP] Profile & notification preferences
- [V2] 2FA (TOTP / SMS) — mandatory option for Owner, Finance
- [V2] Session/device management, login history
- [V2] Audit log viewer

### 4.2 Property & Unit Management
- [MVP] Multiple properties per owner; **property switcher** (global context)
- [MVP] Property types: house, apartment block, complex/sectional title, townhouse, commercial, student housing, backroom/granny flat
- [MVP] Units/rooms with status (vacant / occupied / notice / maintenance), rent amount, deposit, features
- [MVP] Property details: address (SA format, province, suburb), photos, amenities, municipal account refs, meter numbers
- [MVP] Property documents (title deed, compliance certificates, insurance, plans)
- [V2] Body corporate / HOA / levies tracking, levy statements
- [V2] Asset & appliance register with warranty and service dates
- [V3] Portfolio valuation & yield tracking

### 4.3 Tenant Management
- [MVP] Add / edit / delete / archive tenant profiles; assign to property + unit
- [MVP] Occupants & emergency contacts; co-tenants / surety
- [MVP] **Registration link** per property/unit (email, WhatsApp, SMS, copy link)
- [MVP] Tenant self-service profile view with **"Change details" request → owner approval workflow** with change history
- [MVP] Tenant documents (ID copy, proof of income, lease) — private storage
- [V2] Tenant applications & screening workflow (see 4.10)
- [V2] Tenant rating / payment-behaviour score (internal)
- [V3] Move-in / move-out checklists with photos & signatures

### 4.4 Requests & Maintenance (Tenant ↔ Owner)
- [MVP] Request types: **fault report, upgrade request, general query, complaint, move-out notice, other**
- [MVP] Photo/video attachments, priority, category (plumbing, electrical, security, etc.)
- [MVP] Status pipeline: *New → Acknowledged → Assigned → In progress → Awaiting parts/quote → Resolved → Closed*
- [MVP] Assign to caretaker / contractor; internal notes vs tenant-visible comments
- [MVP] Request thread (chat-style) with notifications
- [V2] Quotes & approvals (owner approves spend), cost capture against property/unit
- [V2] SLA timers and overdue escalation
- [V2] Contractor directory + ratings; contractor job link (no login)
- [V2] Preventive maintenance schedules (geyser, gutters, fire equipment, pest control)
- [V3] Recurring-issue detection per unit/asset

### 4.5 Billing, Rent & Finance
- [MVP] Lease-based **recurring monthly rental invoices** (auto-generate on schedule, manual override)
- [MVP] Additional charges: utilities, levies, parking, late fees, deposits, one-offs
- [MVP] **Tenant statements** (running balance) — PDF + in-app
- [MVP] Send invoices/statements via email / WhatsApp / SMS / in-app
- [MVP] Manual payment capture (EFT, cash, card) with proof of payment upload
- [MVP] Arrears dashboard & ageing (30/60/90+), automated reminders
- [MVP] Deposit tracking (held, interest, deductions, refund)
- [V2] **Online payments** (SA gateways e.g. Ozow/PayFast/Paystack/Peach — to be selected), debit orders (DebiCheck), payment links
- [V2] Bank statement import & auto-reconciliation (CSV/OFX)
- [V2] Rent escalation scheduler (e.g. 8% annual) with tenant notice
- [V2] Utility billing (prepaid/sub-meter readings, water/electricity split)
- [V2] Owner statements & expense tracking; landlord-to-property P&L
- [V3] Landlord payouts (collect → fees → pay out), commission management for agents
- [V3] Accounting export / integration (Xero, Sage, QuickBooks) and tax pack (rental income for SARS)

### 4.6 Lease Management
- [MVP] Lease records: start/end, rent, escalation, deposit, notice period, special terms
- [MVP] Lease document storage and renewal reminders
- [V2] **Lease templates** (SA-compliant) with merge fields + e-signature
- [V2] Renewal & escalation workflows; month-to-month conversion
- [V3] Inspection-linked lease events (incoming/outgoing condition reports)

### 4.7 Inspections & Condition Reports
- [V2] Incoming/outgoing/periodic inspections (mobile-friendly checklists)
- [V2] Photo evidence per room/item, tenant sign-off
- [V2] Deposit deduction support tied to the outgoing report (aligns with Rental Housing Act timelines)

### 4.8 Communication
- [MVP] In-app announcements (per property / unit / whole portfolio)
- [MVP] Request/message threads (owner/caretaker ↔ tenant)
- [MVP] Email notifications (transactional)
- [V2] WhatsApp & SMS notifications and bulk messaging with templates
- [V2] Push notifications (PWA)
- [V2] Notice board, community/complex rules, emergency broadcast (e.g. water outage)
- [V3] Two-way WhatsApp inbox

### 4.9 Legal & Compliance (Legal role)
- [V2] Notice templates: reminder, **letter of demand**, breach notice, lease termination, renewal
- [V2] **Eviction pipeline tracker** (breach notice → cancellation → court/tribunal steps → outcome) with dates and documents
- [V2] Document generation (PDF) with delivery proof (email/WhatsApp read status)
- [V2] POPIA tooling: consent records, data-subject requests, retention rules
- [V3] Rental Housing Tribunal case log

### 4.10 Agents: Listings, Viewings & Applications
- [V2] Vacancy listing management (public listing page/share link)
- [V2] Enquiries/leads pipeline, viewing scheduler (calendar + time-slot booking — mirrors the *Tours & bookings* reference)
- [V2] Online applications, document upload, consent for credit check
- [V3] Credit/background check integrations (e.g. TPN/XDS — evaluate), syndication to Property24/Private Property (where APIs allow)

### 4.11 Reporting & Analytics
- [MVP] Dashboard KPIs: occupancy, rent due vs collected, arrears, open requests, upcoming lease expiries
- [V2] Reports: rent roll, arrears ageing, income vs expenses, maintenance cost by property, vacancy duration, tenant turnover
- [V2] Export CSV / PDF / scheduled email reports
- [V3] Forecasting (cash-flow, vacancy risk), portfolio insights (mirrors *Market insights* reference layout)

### 4.12 Platform & Admin
- [MVP] Global search, notifications centre, activity feed
- [MVP] Multi-property switcher, collapsible sidebar
- [V2] Subscription plans & billing for Nestly itself (per unit / per property tiers), trials
- [V2] Data import (CSV) for properties/tenants, export all data
- [V2] Multi-language (English first; Afrikaans, isiZulu, Sesotho later)
- [V3] Public API / webhooks; white-label for agencies

---

## 5. South African Context & Compliance (validate with legal counsel before launch)

| Area | Why it matters for Nestly |
|---|---|
| **POPIA** (Protection of Personal Information Act) | Tenant IDs, income, contact details → lawful processing, consent, retention, breach process. Store documents in **af-south-1 (Cape Town)**; encrypt at rest/in transit; appoint information officer fields. |
| **Rental Housing Act 50 of 1999** | Written-lease expectations, deposit held in **interest-bearing account**, itemised deductions after inspections, refund timelines, tenant/landlord duties, **Rental Housing Tribunals**. |
| **Consumer Protection Act (CPA)** | Fixed-term lease cancellation rights/notice, auto-renewal rules — affects renewal workflow & notices. |
| **PIE Act 19 of 1998** | Eviction requires court process; Nestly's legal pipeline must **never** imply self-help eviction. |
| **Electronic Communications & Transactions Act (ECTA)** | Validity of e-signatures and electronic notices. |
| **FICA / PPRA** | Relevant if agents handle funds or operate as estate agents (PPRA registration, trust-account rules) — flag for agent/payout features. |
| **Municipal & utility realities** | Prepaid meters, water/electricity split billing, load-shedding-related maintenance, levies, body corporate. |
| **Payment realities** | EFT-dominant, DebiCheck debit orders, instant EFT gateways; ZAR (R) formatting `R 12 500,00`; VAT only where applicable. |
| **Localisation** | ZAR currency, SA provinces/suburbs, +27 phone formats, date format `DD MMM YYYY`, SAST timezone. |

> Not legal advice — these are product-design considerations to confirm with a South African property attorney.

---

## 6. Data Model Overview (conceptual)

`Owner Account` → `Properties` → `Units` → `Leases` ↔ `Tenants`
- `Staff Members` (role + property scope + permission overrides)
- `Requests` (+ comments, attachments, status history, assignments, costs)
- `Invoices` → `Invoice Lines` → `Payments` (+ allocations) · `Statements` · `Deposits`
- `Documents` (private; typed: lease, ID, POP, notice, inspection)
- `Notices / Legal Cases`
- `Change-of-Details Requests` (old vs new values, status, decided by/at)
- `Announcements`, `Notifications`, `Message Threads`
- `Invitations` (registration links: property, unit, role, expiry)
- `Audit Log`, `Roles/Permissions`, `Profiles (avatar, prefs)`

---

## 7. Notification Matrix (examples)

| Event | Tenant | Owner | Caretaker | Finance | Channel |
|---|---|---|---|---|---|
| Registration link sent | ✅ | | | | Email / WhatsApp / SMS |
| Change-of-details requested | ✅ confirm | ✅ | | | Email + in-app |
| New fault request | ✅ ack | ✅ | ✅ | | In-app + email |
| Request status changed | ✅ | | ✅ | | In-app / WhatsApp |
| Invoice issued | ✅ | | | ✅ | Email / WhatsApp |
| Payment received | ✅ | ✅ | | ✅ | Email / in-app |
| Rent overdue | ✅ | ✅ | | ✅ | Email / SMS / WhatsApp |
| Lease expiring (90/60/30 d) | ✅ | ✅ | | | Email / in-app |

---

## 8. UI / UX Direction

### 8.1 Reference analysis (from supplied screenshots & videos)
The reference set is a real-estate app with these signature traits — Nestly keeps the **visual language**, and re-maps the **content** to property management:

- **Canvas:** soft **sage-green vertical gradient** fading to warm off-white; outer rounded frame with a faint white border.
- **Glassmorphism cards:** translucent white panels, thin light border, soft blur, large radius (~20–28 px), very light shadow.
- **Primary accent:** deep **olive/forest green** (pills, active nav, primary buttons, selected rows, selected day/time).
- **Buttons:** long olive pill with label left and a **white circular icon button** at the right end (e.g. "Add client ⊕", "Book a tour ↗").
- **KPI tiles:** label + `···` menu, big number + unit, mini visual (donut, sparkline, bar-tick chart), delta chip (`↗ +18 new this month`).
- **Typography:** large light-weight headline with a **two-tone treatment** ("Clients & *buyers.*" — second word muted/greyed), with a trailing full stop; small grey sub-line. Mobile headline uses an *italic* accent ("*yours already.*").
- **Tables:** airy rows, avatar + name/email, status chips, thin progress bars, subtle dividers, highlighted selected row (pale sage).
- **Charts:** olive area/line with dashed comparison line, dark tooltip chip, ticker-style bar charts, semi-circle gauge.
- **Mobile:** floating dark pill bottom-nav (5 icons, active icon in white circle), segmented chips, date-pill picker, time-slot grid, success screen with ringed check-mark.
- **Motion (from videos):** page transitions fade/blur in; headline types/reveals first, then cards **stagger in** (translate-up + opacity); active nav pill slides between tabs; tap ripple on mobile; success check pulses; hover lifts cards slightly.

### 8.2 App Shell (your requirements merged with the reference)
- **Left sidebar: dark grey / near-black (`#121412`–`#1A1D19`) with white icons**, **collapsible on click** (expanded ≈ 264 px with labels ↔ collapsed ≈ 76 px icon rail; tooltip labels in rail; state persisted).
- **Main canvas:** the sage-gradient/glass look from the reference (so the dark rail frames the light content).
- **Top bar:** property switcher (dropdown with property avatar), global search, notifications, avatar menu; page title uses the two-tone headline style.
- **Mobile (primary design target):** no sidebar; **floating dark pill tab bar** (Home · Properties/Units · Requests · Money · Profile; role-aware) + slide-over menu for the rest. Tenants get a simplified 4–5 tab bar.
- **Mobile-first breakpoints:** 360 → 640 → 768 → 1024 → 1280 → 1536; desktop uses multi-column dashboards like the reference.
- **Avatars:** upload, crop, replace, delete; fallback to initials chip in olive tones.

### 8.3 Design tokens (starting values — refine against screenshots)

| Token | Value (approx.) | Use |
|---|---|---|
| `--bg-gradient` | `#CBD6B3 → #E9EBDD → #F3F2EC` | Page canvas |
| `--surface-glass` | `rgba(255,255,255,.62)` + `backdrop-blur 16–24px` | Cards |
| `--surface-solid` | `#FBFBF8` | Inputs, tables |
| `--olive-900` | `#2F3A1D` | Dark panels / tooltips |
| `--olive-700` | `#46542A` | Primary buttons, active pill |
| `--olive-500` | `#7E8C58` | Charts, progress |
| `--olive-200` | `#DCE4C8` | Selected rows, chips |
| `--ink-900` | `#1B1F16` | Headlines |
| `--ink-500` | `#6B7062` | Secondary text |
| `--border-soft` | `rgba(70,84,42,.12)` | Card borders |
| `--sidebar-bg` | `#141613` | Sidebar (dark) |
| Status | success `#5E7F3A` · warning `#C9962B` · danger `#B5483B` · info `#4A7C8C` | Chips (always paired with icon/text) |
| Radius | 10 / 16 / 22 / 28 / pill | inputs / chips / cards / panels / buttons |
| Shadow | `0 10px 30px -12px rgba(40,50,20,.18)` | Cards |
| Spacing | 4-pt scale (4,8,12,16,24,32,48,64) | Layout |

### 8.4 Typography & hierarchy
The reference uses a clean, slightly wide **geometric grotesk** with light/regular weights and tabular figures. Closest free Google Fonts for Lovable: **Hanken Grotesk** (preferred), alternates **Figtree** or **Albert Sans**. Use one family with weight/size to create hierarchy; numerals tabular.

| Level | Size (desktop / mobile) | Weight | Tracking | Use |
|---|---|---|---|---|
| Display / Hero | 56 / 36 px | 300–400 | −0.02em | Auth & marketing, mobile hero ("Homes that feel *yours already.*") |
| H1 – Page title | 40 / 28 px | 400 (second word in `ink-500`) | −0.02em | "Clients & *buyers.*" style |
| H2 – Section | 24 / 20 px | 500 | −0.01em | Card/section titles |
| H3 – Card title | 18 / 16 px | 500 | 0 | Table headers, list cards |
| KPI number | 44 / 32 px | 400 | −0.02em | Stat tiles (tabular nums) |
| Body | 15–16 / 15 px | 400 | 0 | Paragraphs |
| Label / Button | 14 / 14 px | 500 | 0 | Buttons, tabs, inputs |
| Caption / Meta | 12–13 px | 400 | +0.01em | Sub-lines, deltas |
| Overline / Table head | 11 px | 500 | +0.08em UPPERCASE | "CLIENT · STAGE · BUDGET" headers |

Rules: sentence case, trailing full stop on page titles, muted second word for emphasis, italics only for a single accent phrase on hero/mobile greeting.

### 8.5 Core components to design (reusable)
Collapsible sidebar · property switcher · top bar · two-tone page header · KPI tile (donut / sparkline / ticks) · glass card · pill button with circular icon · segmented filter chips · data table (selectable row) · status chip · progress bar · timeline list (day schedule) · calendar & slot picker · request card + thread · invoice / statement view · document uploader · avatar uploader · gauge / area / bar charts with tooltip · empty states · skeleton loaders · toasts · modal / bottom sheet · floating mobile tab bar · success screen (ringed check).

### 8.6 Reference-to-Nestly screen mapping

| Reference screen | Becomes in Nestly |
|---|---|
| Overview (greeting, hero property card, KPI tiles, chart, today's tours) | **Owner Dashboard** — featured property card (occupancy), KPIs (collected, arrears, open requests, vacancies), rent collection chart, today's tasks |
| Listings grid | **Properties & Units** grid with status badges (Occupied / Vacant / Notice) |
| Tours & bookings (calendar + timeline + detail panel) | **Requests & Schedule** — calendar of inspections/maintenance visits, daily timeline, request detail panel with Confirm / Reschedule |
| Clients & buyers (KPIs + table + detail rail) | **Tenants** — KPIs, tenant table (unit, lease, balance, status), side profile with "Change details" requests |
| Market insights | **Reports & Insights** — rent roll, arrears gauge, income vs expenses, top-performing properties |
| Mobile: home, property detail, book tour, "You're all set" | **Tenant app**: home (balance, due date, quick actions), property/unit & lease, **Log a fault / request upgrade** flow, success confirmation |

---

## 9. Non-Functional Requirements
- **Mobile-first** responsive, installable **PWA**; fast on 3G/4G, low-data friendly (lazy images, skeletons).
- **Security:** row-level data isolation per owner account & property; least privilege; signed URLs for documents; audit logs.
- **Privacy:** POPIA-aligned data handling; private documents never publicly accessible.
- **Accessibility:** WCAG 2.2 AA contrast (verify olive-on-sage pairings), keyboard & screen-reader support, status never colour-only, `prefers-reduced-motion` respected.
- **Reliability:** backups, error monitoring, graceful offline states for tenants.
- **Performance:** animations GPU-friendly; glass blur used on key surfaces only.

---

## 10. Integrations (deferred to the final build phases)

Build with **mock data and free/mock APIs first**; connect paid/live services only near the last phase, before security audit and real-world testing.

| Service | Purpose | Notes |
|---|---|---|
| **Lovable Cloud** | Database, auth, storage during build/test | Enabled **after** UI phases to conserve credits; migrate to **PostgreSQL** before go-live |
| **Mailgun** | Transactional email (invites, invoices, change-request emails) | Part of app shell notifications |
| **Twilio** | WhatsApp + SMS | Templates need WhatsApp approval |
| **AWS S3 (af-south-1, Cape Town)** | Private user profiles, avatars, personal documents | POPIA data-residency alignment |
| **Cloudflare R2** | Public images (marketing site, landing page) | |
| **Cloudflare DNS** | Application DNS | |
| *(Your brief ended with "I haven't mentioned API's… let's use:" — list continues above; payment gateway, e-signature, credit-check and push providers are still open decisions.)* | | |

---

## 11. Adapted UI Design-Copy Prompt (for Lovable)

> Replaces the Sierra CRM reference with the Nestly reference screenshots/videos and the property-management context.

```
You are a senior UI engineer and design replication specialist. Recreate the visual design language, layout system and interaction patterns of the attached NESTLY reference screenshots (desktop: theme-1…theme-4; mobile: theme-1-mobile-1, theme-1-mobile-2) and videos (real-estate-desktop.mp4, real-estate-mobile.mp4) as faithfully as possible, for my property management app "NESTLY".

PRIMARY OBJECTIVE
High-fidelity reconstruction of the reference UI (not "inspired by"). Keep the visual character, spacing rhythm, card geometry and motion; re-map the content to property management for South African landlords, caretakers, staff and tenants. Do not invent a new style direction, do not add trendy patterns that aren't in the reference.

1. VISUAL CHARACTER
- Soft sage-green vertical gradient canvas fading to warm off-white
- Glassmorphism cards: translucent white, thin light border, backdrop blur, 20–28px radius, very soft shadow
- Deep olive/forest-green accent for primary buttons, active nav pill, selected rows, selected date/time
- Primary button = olive pill, label left, WHITE CIRCULAR ICON BUTTON at right end
- Segmented filter chips in a glass pill; "···" menu on cards
- KPI tiles: label, big number + unit, mini visual (donut / sparkline / tick-bar), delta chip (↗ +18 this month)
- Page titles: large light weight, two-tone ("Tenants & *units.*" second word muted), trailing full stop, small grey sub-line
- Airy tables: avatar + name/email, status chips, thin progress bars, selected row in pale sage
- Charts: olive area/line + dashed comparison line, dark tooltip chip, tick-bar chart, semi-circle gauge
- Typography: Hanken Grotesk (fallback Figtree / Albert Sans), light/regular weights, tabular numerals; follow the type scale in the Product Overview §8.4

2. APP SHELL (IMPORTANT DEVIATION FROM REFERENCE TOP-NAV)
- LEFT SIDEBAR in dark grey / near-black (#141613) with WHITE icons, collapsible/expandable on click (264px ↔ 76px icon rail, tooltips when collapsed, state remembered)
- Main content uses the sage gradient + glass cards from the reference
- Top bar: property switcher (owner can have multiple properties), search, notifications, avatar menu (users can upload & delete avatars)
- MOBILE FIRST: floating dark pill bottom tab bar (5 icons, active icon in white circle) exactly like the reference mobile screens; role-aware tabs; simplified tab bar for tenants

3. SCREENS TO DESIGN (UI ONLY, MOCK DATA — NO BACKEND YET)
Owner/Staff: Dashboard · Properties & Units · Tenants (table + detail rail + change-of-details requests) · Requests & Maintenance (list + thread + status pipeline) · Calendar/Schedule · Invoices & Statements · Payments & Arrears · Leases & Documents · Staff & Permissions · Legal/Notices · Reports & Insights · Announcements · Settings/Profile
Tenant (mobile first): Home (balance, due date, quick actions) · My lease & unit · Log a fault / Request upgrade (multi-step like the "Book a tour" flow) · Request tracker · Statements & invoices · My details + "Change details" · Notifications
Auth: Login, register-via-link, forgot password
Reuse the reference layouts: Overview→Dashboard, Listings→Properties grid, Tours→Schedule/Requests, Clients→Tenants, Insights→Reports, Mobile booking→Fault/Upgrade request flow, "You're all set"→Request submitted confirmation.

4. MOTION (from the videos)
Page change: soft fade/blur-in; title reveals first, then cards stagger in (translate-up + fade, ~60ms stagger); active nav pill slides; card hover lifts 2–4px; mobile tap ripple; success check-mark pulse ring. Respect prefers-reduced-motion.

5. TECHNICAL
React + Tailwind. Reusable components (Sidebar, TopBar, PropertySwitcher, PageHeader, KpiTile, GlassCard, PillButton, SegmentedChips, DataTable, StatusChip, Timeline, CalendarPicker, SlotPicker, RequestThread, Chart components, MobileTabBar, SuccessScreen, AvatarUploader). Central design tokens (colors, spacing, radius, shadows, type). Semantic HTML, WCAG AA contrast, keyboard focus states, skeleton loaders, empty states.

6. RULES
- UI first, mock data only; do NOT enable Lovable Cloud / database yet
- Replace all reference real-estate-sales content with property-management content; brand is NESTLY (keep the diamond-cluster logo style, "Nestly™" wordmark)
- Currency ZAR (R 12 500,00), SAST dates, South African suburbs/provinces in mock data
- Before finalising, self-check: section-for-section fidelity, type scale, card radius/padding, olive accent usage, glass effect, sidebar collapse works, mobile tab bar matches reference
```

---

## 12. Open Questions / Decisions for Later
1. Pricing model for Nestly (per property, per unit, flat tiers)?
2. Will Nestly **hold or move money** (payouts)? If yes, compliance (PPRA/FICA/trust accounts) rises sharply — recommend V3.
3. Preferred SA payment gateway (Ozow / PayFast / Paystack / Peach) and DebiCheck provider.
4. E-signature provider (or build in-house).
5. Credit/background-check provider (TPN, XDS, etc.).
6. Languages beyond English at launch?
7. Roles: do Agents/Finance/Legal belong to one owner account only, or can an agency manage multiple owners (multi-tenant agency mode)?

---

## 13. Next Step
Awaiting your go-ahead for the **App Build Structure** prompt: phased build plan (Phase 1 → final), each phase listing **(a) sections built, (b) why, (c) how to test/pass**, UI-first (mock data) before Lovable Cloud, collapsible dashboard, mobile-first + desktop, and API integrations (Mailgun, Twilio, AWS S3 af-south-1, Cloudflare R2/DNS, PostgreSQL migration) placed in the last phases before security audit.