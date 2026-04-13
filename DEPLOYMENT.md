# SkyBook Deployment Guide

This guide is for deploying SkyBook to production (Vercel + Neon + Stripe).

## 1) Local Predeployment Checks

From project root:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/predeploy-check.ps1
```

This validates:

- required `.env` keys are present
- lint passes
- typecheck passes
- production build passes

## 2) Security Preparation (Required)

Before first public deployment:

1. Rotate any local/development secrets you do not want reused in production.
2. Use production credentials for Neon and Stripe in production environment variables.
3. Keep `.env` out of git (already protected by `.gitignore`).

## 3) Push Code To GitHub

If this repository is not initialized yet:

```powershell
git init
git branch -M main
git remote add origin https://github.com/Spectre-Techie/SkyBook.git
git add .
git commit -m "chore: prepare project for deployment"
git push -u origin main
```

If remote already exists, only commit and push.

## 4) Configure Vercel Project

1. Import repository: `Spectre-Techie/SkyBook`
2. Framework preset: Next.js
3. Root directory: repository root (this project)
4. Install command: `pnpm install --frozen-lockfile`
5. Build command: `pnpm build`
6. Output directory: `.next` (default)

## 5) Set Environment Variables (Vercel)

Set these in Vercel for Production (and Preview if needed):

- `NEXT_PUBLIC_APP_URL`: your public site URL (for example `https://skybook.vercel.app`)
- `FRONTEND_URL`: same value as `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL`: Neon pooled connection string
- `DIRECT_URL`: Neon direct connection string
- `BETTER_AUTH_SECRET`: 32+ character secret
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret
- `AVIATIONSTACK_API_KEY`: optional but recommended
- `AVIATIONSTACK_BASE_URL`: optional (`https://api.aviationstack.com/v1`)

Optional seed/bootstrap variables:

- `ADMIN_FULL_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## 6) Run Database Migrations In Production

Use a trusted CI/CD step or one-time secure terminal:

```powershell
pnpm prisma generate
pnpm prisma migrate deploy
```

Optional one-time seed (only if required for initial data):

```powershell
pnpm db:seed
```

## 7) Configure Stripe Webhook

In Stripe Dashboard:

1. Create endpoint: `https://<your-domain>/api/webhooks/stripe`
2. Subscribe to events:
   - `checkout.session.completed`
   - `checkout.session.expired`
3. Copy signing secret and set `STRIPE_WEBHOOK_SECRET` in Vercel.
4. Redeploy after updating secrets.

## 8) Post-Deploy Smoke Test

1. Open `/search` and verify flight results render.
2. Register/login a passenger account.
3. Create a booking and open payment link.
4. Complete payment and verify booking status changes to `CONFIRMED`.
5. Open `/ticket/<bookingReference>` and verify ticket renders.
6. Verify webhook events are successful in Stripe dashboard.

## 9) Rollback Strategy

If deployment fails:

1. Roll back to last healthy Vercel deployment.
2. Keep database schema compatible (avoid destructive migrations without backups).
3. Inspect Vercel function logs and Stripe webhook logs.
4. Fix issue in branch, rerun predeploy checks, then redeploy.
