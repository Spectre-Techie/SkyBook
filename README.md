# SkyBook App

SkyBook is an airline reservation MVP built with Next.js, Prisma, and Neon.

Production deployment steps are documented in `DEPLOYMENT.md`.

This codebase now uses a hybrid reference-data strategy:

- AviationStack for airport and route metadata
- Local flight schedules managed by your own system (seed script and admin flow)

## 0) Project Structure (Frontend and Backend)

This is a full-stack Next.js app, so frontend and backend are in one repository.

- Frontend routes and screens: `app/**`
- Backend API routes: `app/api/**`
- Backend core logic: `lib/**`

To make client/server boundaries explicit:

- Shared frontend layer: `client/**`
  - `client/api`: centralized Axios client and API functions
  - `client/theme`: theme provider (system/light/dark)
- Logical backend map: `server/**`
  - documentation of backend boundaries

This gives you the same architectural clarity as `client` and `server` folders while keeping Next.js best practices.

## 1) Prerequisites

- Node.js 20+
- pnpm 9+
- Neon account
- AviationStack account (optional if you only want fallback mode)

## 2) Install dependencies

```bash
pnpm install
```

## 3) Configure environment variables

Copy `.env.example` into `.env` and update values.

Required:

- `NEXT_PUBLIC_APP_URL` (public app URL)
- `FRONTEND_URL` (same public app URL, used for Stripe redirects)
- `DATABASE_URL` (Neon pooled URL for runtime)
- `DIRECT_URL` (Neon direct URL for migrations)
- `BETTER_AUTH_SECRET` (32+ chars)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Optional but recommended:

- `AVIATIONSTACK_API_KEY`
- `AVIATIONSTACK_BASE_URL` (defaults to `https://api.aviationstack.com/v1`)
- `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` (only if using client-side Stripe widgets)

Optional admin bootstrap for seeding:

- `ADMIN_FULL_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## 4) How to get Neon URLs (fast, no guessing)

1. Create a Neon project.
2. Open your project dashboard and click "Connection Details".
3. Copy the pooled connection string and paste it into `DATABASE_URL`.
4. Copy the direct connection string and paste it into `DIRECT_URL`.
5. Keep `sslmode=require` in both URLs.

## 5) How to get AviationStack key

1. Create an account at `aviationstack.com`.
2. Open dashboard and copy your API key.
3. Put it in `AVIATIONSTACK_API_KEY`.
4. Leave `AVIATIONSTACK_BASE_URL` as default unless AviationStack changes endpoint version.

If `AVIATIONSTACK_API_KEY` is missing, the app automatically uses fallback airport and route data.

Important for free plans:

- Some AviationStack functions can return `function_access_restricted`.
- SkyBook handles this automatically:
  - Route data falls back to deriving routes from `/v1/flights`.
  - Airport lookup by 3-letter IATA code falls back to deriving airport data from `/v1/flights`.
  - Text airport search still uses local fallback data when catalog endpoints are restricted.

## 6) Database setup and seed

```bash
pnpm prisma migrate dev --name init
pnpm prisma generate
pnpm db:seed
```

What `db:seed` does:

- Creates or updates sample flights
- Optionally creates an admin user when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set

## 7) Run app locally

```bash
pnpm dev
```

Open `http://localhost:3000`.

## 8) Reference data API endpoints

Airports search:

```bash
curl "http://localhost:3000/api/reference/airports?q=lag&limit=10"
```

Routes lookup:

```bash
curl "http://localhost:3000/api/reference/routes?depIata=LOS&arrIata=NBO&limit=20"
```

Response shape:

```json
{
  "source": "aviationstack",
  "data": []
}
```

Live route data (free-plan compatible strategy):

```bash
curl "http://localhost:3000/api/reference/routes?depIata=LOS&arrIata=NBO&limit=5"
```

Live airport data by IATA (free-plan compatible strategy):

```bash
curl "http://localhost:3000/api/reference/airports?q=LOS&limit=5"
```

When AviationStack fails or quota is exhausted:

```json
{
  "source": "fallback",
  "warning": "AviationStack request failed; fallback route data returned for stability.",
  "data": []
}
```

## 9) Build checks

Run these before every commit:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Windows helper (runs env + lint + typecheck + build checks):

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/predeploy-check.ps1
```

## 10) Why this hybrid architecture works for a 2-day timeline

- You avoid dependency on live booking APIs for core reservation logic.
- You still use real-world aviation metadata from AviationStack.
- Your booking engine remains fully owned and defensible in project defense.

## 11) Registration Troubleshooting

If registration returns 400 with `Request payload validation failed`, check:

- `fullName`: minimum 2 characters
- `email`: valid email format
- `password`: minimum 8 chars with uppercase, lowercase, number, special symbol

If registration returns `Request body must be valid JSON`, your client sent malformed JSON.

The app now returns deterministic validation details for each invalid field. The register form surfaces these inline.
