# CB Hub — Coldwell Banker Associated Brokers Realty

An internal employee dashboard for **Coldwell Banker Associated Brokers Realty**, a single-brokerage
real-estate office in Sioux City, IA. It gives agents and staff one place to launch tools, complete
required trainings, and (for managers and leadership) manage offices, people, and access.

Built with **Next.js 16** (App Router + Turbopack), **React 19**, **TypeScript**, **Tailwind CSS v4**,
and **shadcn/ui** (Radix). Persistence and auth are env-gated: with no credentials it runs entirely on
an in-memory dev store; set the env vars and it switches to **Neon Postgres + Drizzle** and **Neon Auth
(Better Auth)** with zero call-site changes.

> Designed to be pushed to a public GitHub repo and **imported into [Vercel v0](https://v0.dev)** for
> iteration — v0 can wire the real database and let the team keep building. See `AGENTS.md` for the
> agent/v0 project guide.

---

## Roles

CB Hub has a 4-tier role hierarchy (most → least privileged):

| Role | Label | Can do |
| --- | --- | --- |
| `master_admin` | Master Admin | Full control of the platform — all offices, users, tools, trainings, settings. |
| `high_level_user` | Leadership | Org-wide visibility; manages tools and trainings across offices. |
| `office_manager` | Office Manager | Manages agents, trainings, and access within their own office. |
| `agent` | Agent | Uses granted tools and completes assigned trainings. |

Higher roles include everything lower roles can do. Access is enforced server-side (see "RBAC" in
`AGENTS.md`); the sidebar only filters items for visibility.

---

## Dev mode (no credentials)

The app is fully clickable locally with **zero setup** — no database, no auth provider.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Then:

1. On the sign-in screen, **pick a role to sign in** — this sets a dev session cookie.
2. Use the **Dev Role Switcher** in the UI to view the app as any of the 4 roles.
3. Admin CRUD actually mutates an **in-memory store** (`src/lib/data/seed-data.ts`), so you can
   iterate on flows. State resets when the dev server restarts.

This works because both **auth** and **data** are environment-gated (next section).

---

## Architecture

The whole app talks to two thin abstractions and never imports a database or auth provider directly:

- **Auth** — `@/lib/auth` exposes `requireUser()`, `requireRole(min)`, `getCurrentUser()`,
  `isAuthConfigured()`. With `NEON_AUTH_BASE_URL` unset it uses a **dev stub** (cookie session + role
  switcher). With it set, it uses **Neon Auth (Better Auth)**.
- **Data** — `const data = await getData()` (from `@/lib/data`) returns a `DataApi` whose methods are
  all async. With `DATABASE_URL` unset it is backed by the **in-memory store**; with it set it
  lazy-loads the **Drizzle/Neon** implementation (`src/lib/data/queries-db.ts`). Both implementations
  satisfy the exact same interface, so wiring Neon never changes a call site.

```
No env vars  ─▶  dev stub auth  +  in-memory data store   (local, clickable)
Env vars set ─▶  Neon Auth      +  Drizzle/Neon Postgres   (production)
```

Next 16 specifics this repo relies on: routing/auth middleware lives in **`src/proxy.ts`** (not
`middleware.ts`), and `cookies()`, `headers()`, `params`, and `searchParams` are **async** (always
`await` them).

---

## File map

```
src/
  app/
    (auth)/sign-in/         Sign-in (dev: pick a role)
    (dashboard)/            App shell (sidebar + topbar); layout calls requireUser()
      page.tsx              Home dashboard
      tools/                Tools area (catalog + internal tool hosts)
      trainings/            Assigned trainings + progress
      team/                 Office/people management (office_manager+)
      admin/                Org-wide admin (high_level_user+)
    api/                    Route handlers (incl. Neon Auth handler in prod)
    globals.css             Tailwind v4 tokens + design helpers
    layout.tsx              Root layout, fonts, theme provider
  components/
    ui/                     shadcn/ui primitives (Radix)
    *.tsx                   Shared presentational components (PageHeader, StatCard, DataTable, …)
    app-sidebar.tsx         Role-filtered nav
  lib/
    auth/                   Env-gated auth (index, dev-stub, neon)
    data/                   Env-gated data layer (index = in-memory, queries-db = Drizzle, db, seed-data)
    rbac.ts                 Role hierarchy + access helpers (single source of truth)
    tools-registry.ts       Canonical tool catalog (seed source for the tools table)
    types.ts                Shared domain types
  db/
    schema/                 Drizzle schema (offices, profiles, tools, trainings, audit, enums)
    migrations/             Generated SQL migrations (db:generate)
    seed.ts                 Production seed script (db:seed)
  proxy.ts                  Next 16 proxy (auth/routing edge logic)
drizzle.config.ts           Drizzle Kit config (uses DATABASE_URL_UNPOOLED for migrations)
```

---

## Deploy / wire Neon

To run against a real database and real auth:

1. **Create a Neon project** at <https://neon.tech>. Copy both connection strings — the **pooled**
   URL (for the app) and the **unpooled/direct** URL (for migrations).
2. **Enable Neon Auth (Better Auth)** on the project's default branch and copy the **Auth URL**.
3. **Set environment variables** (copy `.env.example` → `.env.local` locally, and add the same in your
   Vercel project settings):
   - `DATABASE_URL` — pooled connection
   - `DATABASE_URL_UNPOOLED` — direct/unpooled connection (used by migrations)
   - `NEON_AUTH_BASE_URL` — the Neon Auth URL
   - `NEON_AUTH_COOKIE_SECRET` — ≥ 32 chars, e.g. `openssl rand -base64 32`
   - `BOOTSTRAP_ADMIN_USER_ID` — set after step 5
4. **Generate + apply the schema:**
   ```bash
   npm run db:generate   # create SQL migrations from src/db/schema
   npm run db:migrate    # apply them to Neon
   ```
5. **Create the first admin.** Deploy (or run `npm run dev` with the env vars set), **sign in once** as
   the person who should be the first `master_admin`. This creates their Neon Auth user. Copy that
   user's **auth user id** into `BOOTSTRAP_ADMIN_USER_ID`.
6. **Seed reference data + the bootstrap admin:**
   ```bash
   npm run db:seed       # offices, tools, trainings, and the master_admin profile
   ```
   The seed is idempotent — safe to re-run. If `BOOTSTRAP_ADMIN_USER_ID` is unset it seeds everything
   except the admin profile and logs a note.
7. **Deploy to Vercel.** Import the repo (or push), confirm the env vars are set for the right
   environments, and ship. `npm run build` runs `next build` with Turbopack.

Handy scripts: `npm run db:push` (push schema without a migration, for quick prototyping) and
`npm run db:studio` (open Drizzle Studio).
