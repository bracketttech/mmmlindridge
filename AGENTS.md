<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Nestly
- UI-only phases: pages read data only through `src/services/*` (backed by `src/mocks`) so a real backend can replace them without page changes.
- All UI copy lives in `src/lib/strings.ts`; en-ZA formatting helpers in `src/lib/format.ts`.
- Role-aware navigation is defined once in `src/lib/nav.ts`; shell, tab bar and route guards read from it.
- App pages live under the `_shell` pathless layout; product docs are in `DOCS/`.
- Auth screens are top-level public routes; the `_shell` layout is gated by a mock browser session (`src/lib/session.ts`, `ssr: false`) until real auth replaces `src/services/auth.ts`.
- Form validation rules (password strength, SA phone, matching passwords) live in `src/lib/validation.ts` and are covered by tests.
- All bundled images (property photos + small thumbs, avatars, auth art) live in `src/images` as WebP and are resolved only via `src/images/index.ts`; render them with `FadeImage`/`NAvatar` so they fade in on a placeholder, and the shell preloads them — avoids pop-in/flashes.
- Pages scope data by the switcher via `useAppState().propertyId` ("all" = portfolio) and pass it to services; dashboard aggregates live in `src/mocks/dashboard.ts`.
- Billing totals, VAT, invoice status, ageing, statements, deposits and gateway outcomes are pure functions in `src/lib/billing-rules.ts` (tested); `billingService` keeps tenant balances in the tenancy store in step so Tenants pages match billing.
- No-login link pages (`/sign/$token`, `/apply/$unitId`) are top-level public routes with `ssr: false` wrapped in `leasing/PublicLayout`; they read the same browser mock store, so in UI phases a link only works in the browser that created it.
- Applications & screening UI lives in `src/components/nestly/applications/*`; checklist rules (required checks, affordability, ready-to-approve) stay in `src/lib/leasing-rules.ts` (tested), the panel only applies them optimistically.
