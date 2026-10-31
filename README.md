# HAKORA — Your Academic Partner.

A production-ready, full-stack academic assistance and printing-service platform for students,
with a simple public website and a powerful private admin dashboard.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma · PostgreSQL · Recharts · Lucide

---

## Features

### Public website (mobile-first)
- Homepage with configurable hero, trust message and database-driven service cards
- `Submit Requirement` form — no account needed, with file uploads (PDF/DOC/DOCX/JPG/PNG),
  validation on both client and server, duplicate-submit protection, honeypot spam guard,
  consent checkbox and unique reference numbers (`CS-2026-0001`)
- About, Contact (with contact form), Services, per-service pages, Privacy Policy, Terms, Thank You
- WhatsApp click-to-chat everywhere with context-aware prefilled messages
- Anonymous first-party analytics with a consent banner (page views, service clicks,
  form funnel, WhatsApp clicks, device/browser/traffic source)
- SEO: per-page metadata, sitemap.xml, robots.txt, LocalBusiness JSON-LD

### Admin dashboard (`/admin`)
- Secure email+password login — bcrypt hashing, HMAC-signed httpOnly session cookies,
  rate limiting, account lockout after 5 failed attempts, audit logging
- **Dashboard** — 11 live KPI cards + 7 charts (visitors, enquiries, revenue, order status,
  top services, conversion funnel, traffic sources) with date-range filters
- **Enquiries** — search/filter/paginate, bulk status & archive, CSV export, full detail page
  with notes, status history, quotation, attachments, WhatsApp contact, convert-to-order
- **Customers** — auto-created and deduplicated by mobile number, profiles with full
  enquiry/order/spend history, "regular customer" flag
- **Orders** — pricing breakdown (unit/extra/delivery/discount), statuses, manual payments
  (Cash/UPI/Bank/Other), printable invoice
- **Printing Management** — quotation calculator driven by admin-configurable pricing rules
- **File Manager** — private storage, admin-only downloads (signed URLs on S3/R2)
- **Deliveries** — address/fee/date/status tracking with WhatsApp contact
- **Services** — add/edit/deactivate homepage services without code changes
- **Analytics, Reviews (approval workflow), Notifications, Settings** — every public-facing
  business detail is editable in Settings

---

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env        # fill in DATABASE_URL, AUTH_SECRET, ADMIN_EMAIL, ADMIN_INITIAL_PASSWORD

# 3. Create the schema & first admin + default services/pricing
npx prisma migrate dev
npx prisma db seed

# 4. Run
npm run dev                 # http://localhost:3000  ·  admin at /admin
```

The first administrator is created **only** from `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD`
environment variables during seeding — there is no public registration. Change the password
from **Admin → Settings** after first login.

### Tests

```bash
npm test     # validation, refs, session signing, password hashing, DB counters
```

---

## File storage

| Mode | When | Behaviour |
|---|---|---|
| **S3 / R2** | all `STORAGE_*` env vars set | Private bucket uploads, 5-minute signed download URLs |
| **Local** | otherwise | `./uploads` directory — development only |

> On Render the filesystem is **ephemeral** — always configure `STORAGE_*`
> (Cloudflare R2 has a free tier and is S3-compatible) in production.

---

## Deploying to Render

The repo ships with a **`render.yaml` Blueprint** — create a new Blueprint in Render pointing
at the repo and it provisions the web service plus a managed PostgreSQL database.

Manual setup equivalents:

| Setting | Value |
|---|---|
| Build command | `npm ci && npx prisma generate && npm run build` |
| Pre-deploy command | `npx prisma migrate deploy && npx prisma db seed` |
| Start command | `npm run start` |
| Health check path | `/api/health` |

- The server binds `0.0.0.0` and honours Render's `PORT` automatically.
- Migrations run in the controlled **pre-deploy** step, never from app instances.
- Use the **internal** database connection string (same region) for `DATABASE_URL`.
- Set `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD`, `NEXT_PUBLIC_SITE_URL` and `STORAGE_*`
  in the Render dashboard. Never commit real credentials.

### Environment variables

See [`.env.example`](./.env.example) for the full annotated list.

---

## Security notes

- All admin pages/actions/APIs re-verify the session server-side (`requireAdmin`);
  middleware is only a fast first gate.
- Sessions are HMAC-SHA256-signed httpOnly `SameSite=Lax` cookies with 12 h expiry.
- Server actions use Next.js origin-checked POSTs (CSRF protection); file type, size and
  count are validated on the server regardless of client checks.
- Prisma parameterises all queries (SQL-injection safe); React escapes output (XSS safe).
- Rate limits: login 10/15 min/IP, enquiries 8/10 min/IP, tracking 120/min/IP.
  (In-memory — swap `src/lib/auth/rate-limit.ts` for Redis when scaling to multiple instances.)
- Audit log records logins and every important admin mutation.
- Analytics are anonymous and consent-gated; no fingerprinting, no precise location.
- Data subject requests (correction/deletion) can be fulfilled through the admin
  (customer edit, enquiry delete removes attachments from storage).

## Project structure

```
prisma/            schema, migrations, seed (admin + services + pricing)
src/app/(public)/  public pages
src/app/admin/     login + protected dashboard pages
src/app/api/       health, analytics tracking, secure file downloads, CSV export
src/components/    public / admin / forms / shared components
src/lib/           db, auth (sessions, passwords, rate limit, guards), storage,
                   settings, validation, whatsapp, constants, utils
src/server/        server actions (public + admin) and services (stats)
tests/             automated test suite
```
