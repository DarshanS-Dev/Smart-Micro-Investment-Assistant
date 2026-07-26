# Loud Piggy Bank — frontend

Next.js (App Router) frontend for the Smart Expense & Micro-Investment
Assistant, built from the locked "Loud Piggy Bank" design system: lime /
ink / warm-white brand moments, monospace-everywhere financial data.

## Run it

```bash
npm install
cp .env.example .env.local   # point NEXT_PUBLIC_API_URL at your backend
npm run dev
```

Visits `/` → `/onboarding` → `/upload` → `/dashboard`, exactly per the
locked 4-step flow. There is no synthetic-data path — CSV upload is the
only way data gets in.

`npm run build` has been verified to produce a clean, error-free
production build (Turbopack, Next 16, React 19, Tailwind v4).

## Talking to the backend

Every call goes through `lib/api.ts`, one function per endpoint in the
contract table, all with `Authorization: Bearer <token>` injected
automatically from the JWT in `sessionStorage`. Nothing here is mocked —
it's wired to hit real endpoints as soon as they exist:

| Endpoint | Used by |
|---|---|
| `POST /auth/signup`, `POST /auth/login` | `app/page.tsx` |
| `POST /user/bucket` | `app/onboarding/page.tsx` |
| `POST /transactions/upload` (multipart) | `app/upload/page.tsx` |
| `GET /dashboard/summary` | `app/page.tsx` (post-login routing), `app/dashboard/page.tsx` |
| `POST /prices/refresh` | `components/dashboard/SummaryStrip.tsx` |

## Three gaps vs. the current backend schema — worth syncing on

I built defensively around these so the app still looks and works fully
today, but flagging them since they affect what the backend should
eventually return:

1. **`has_data` on `GET /dashboard/summary`.** The page spec calls for
   this boolean explicitly; `schemas.DashboardResponse` doesn't have it
   yet. Until it exists, the frontend treats a failed/404 dashboard
   fetch as "no data yet" and redirects to `/upload` — same outcome,
   but a real field is cleaner and avoids relying on status codes.

2. **`UploadResponse` doesn't echo back the ingested rows.** The Page 3
   preview table needs `date | merchant | amount | round-up` for what
   was just uploaded. Right now the frontend parses the CSV client-side
   and mirrors the `compute_roundup` (round up to nearest ₹10) purely
   for display — functional, but it's recomputing something the server
   already knows. If useful, having `POST /transactions/upload` return
   the parsed+round-up'd rows would let the frontend drop that logic
   entirely (see `lib/csv.ts`).

3. **`TransactionFeedItem` has no `asset` or `price_at_purchase`.** The
   original ledger spec listed those as table columns; the current
   schema only carries `category`. The Ledger table (Section C) has
   been built against what's actually in the schema — it shows
   Category instead, and drops the price column rather than faking a
   value.

None of these block anything — the app degrades gracefully and every
page is fully interactive against synthetic/mocked responses. They're
just the fastest three wins if your backend architect friend wants the
frontend to need less client-side inference.

## Structure

```
app/            → the 4 routed pages + root layout (fonts, providers)
components/ui/  → Button, Input, PillToggle, SegmentedControl, Toast, ProgressBar, GridCanvas
components/onboarding, upload, dashboard, layout/ → feature components
lib/            → api.ts (fetch wrappers), auth-context.tsx (JWT in sessionStorage),
                   types.ts (mirrors backend schemas.py), csv.ts, utils.ts
```

## Design system

Tokens live in `app/globals.css` as a Tailwind v4 `@theme` block — lime
`#D6FF3D`, ink `#0B0B0B`, warm canvas `#FAFAF7`, positive/negative
green/red reserved strictly for financial state. Display font is Clash
Display, body is Satoshi (both loaded from Fontshare at runtime), and
every numeric/financial value uses JetBrains Mono via the `.mono-figure`
class or `font-mono` utility — no exceptions, per the dashboard-hardening
rule in the brief.
