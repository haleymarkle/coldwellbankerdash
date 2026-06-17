<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CB Hub — project guide for agents (incl. Vercel v0)

## Purpose

CB Hub is the internal employee dashboard for **Coldwell Banker Associated Brokers Realty**, a
single-brokerage real-estate office in Sioux City, IA. Agents/staff launch tools and complete required
trainings; managers and leadership manage offices, people, and access.

## RBAC model (4 tiers)

Most → least privileged. Higher roles include all lower capabilities.

- **`master_admin`** — full control: all offices, users, tools, trainings, settings.
- **`high_level_user`** (Leadership) — org-wide visibility; manages tools and trainings across offices.
- **`office_manager`** — manages agents, trainings, and access within their own office.
- **`agent`** — uses granted tools and completes assigned trainings.

Source of truth: `src/lib/rbac.ts` (`ROLE_RANK`, `hasAtLeast`, `canAccessAdmin`, `canManageOffice`,
`canAccessTool`, `assignableRoles`).

## Stack + conventions

- **Next.js 16** App Router (Turbopack), **React 19**, **TypeScript**, **Tailwind CSS v4** (CSS-first
  tokens), **shadcn/ui** (Radix base). Path alias `@/*` → `src/*`.
- **Server Components by default.** Mutations are **Server Actions** in a co-located `actions.ts` with
  `'use server'` at the top. Validate input with **zod** server-side. There is no `form` component —
  use plain inputs + server actions + `useActionState`. Client Components cannot be async.
- **Next 16 specifics:** edge/auth logic is in **`src/proxy.ts`** (NOT `middleware.ts`). `cookies()`,
  `headers()`, `params`, and `searchParams` are **async** — always `await` them. In pages, type
  `params`/`searchParams` as `Promise<{…}>` and await.
- **Data layer:** Drizzle ORM + Neon Postgres in prod. Schema in `src/db/schema/**`.
- **Auth:** Neon Auth (Better Auth) in prod; a cookie-based dev stub locally.
- Icons: `lucide-react`. Toasts: `import { toast } from "sonner"`.

## THE key abstraction: env-gated auth + data

Both auth and data select their backend at runtime by environment. **Always go through `getData()`
(`@/lib/data`) and `@/lib/auth` — never import a database client or auth provider directly.**

- **No env vars** → dev stub auth (`src/lib/auth/dev-stub.ts`) + in-memory store
  (`src/lib/data/index.ts`, seeded from `src/lib/data/seed-data.ts`). The app is fully clickable with
  zero credentials; admin CRUD mutates the in-memory store.
- **`DATABASE_URL` + `NEON_AUTH_*` set** → Neon Auth + Drizzle/Neon (`src/lib/data/queries-db.ts`).

`DataApi` has **two implementations** that must stay in lockstep:

- in-memory: `src/lib/data/index.ts`
- production (Drizzle): `src/lib/data/queries-db.ts`

> **When you add or change a query, implement it in BOTH `DataApi` implementations** with identical
> signatures/return types. If they drift, the app behaves differently in dev vs prod.

Auth contract (`@/lib/auth`): `requireUser()` (redirects to `/sign-in`), `requireRole(min)` →
`{ user, allowed }`, `getCurrentUser()`, `isAuthConfigured()`.

## Design system

- **Headings/display + brand wordmark:** Cormorant Garamond serif via the `font-heading` utility class
  (renders in deep navy `#1A2B4A` on light, light on dark). Use for page/section titles only.
- **Body/UI:** default sans (Inter). Never below 15px for body copy.
- **Brand color:** CB navy `#14213D` (primary), gold `#C8A24B` (accents/active states only — never body
  text), cream `#F7F4EC` (app background) — but **use semantic Tailwind tokens, never hardcode hex**:
  `bg-background`, `text-foreground`, `bg-card`, `bg-primary`/`text-primary-foreground` (navy),
  `text-muted-foreground`, `border-border`, `bg-secondary`, `bg-accent`, `bg-muted`, the `sidebar-*`
  tokens, and brand raw tokens `text-cb-gold` / `bg-cb-navy` / `text-cb-blue` / `text-cb-taupe`. **Dark
  mode is automatic via tokens** — never hardcode light/dark colors.
- **Helpers (defined in `globals.css`):** `eyebrow` (sentence-case label), `cb-hero` (flat navy hero
  band), `cb-reveal` (staggered load reveal — add inline `style={{ animationDelay: '…' }}`).
- **Cards:** `rounded-lg border bg-card shadow-sm` with subtle `hover:shadow-md transition`. Generous
  spacing (`p-4 md:p-6`, `gap-4/gap-6`). Refined editorial / luxury feel, not flashy.
- **Accessibility:** semantic landmarks, labeled controls, keyboard-friendly, visible focus rings.
  Every list needs a designed empty state — never a blank panel.
- **Shared presentational components** (in `src/components/*`): `PageHeader`, `EmptyState`, `StatCard`,
  `RoleBadge`, `TrainingStatusBadge`, `DataTable`. Reuse these for visual consistency.

## RBAC rules (enforcement)

- **Gate pages in layouts** — `(dashboard)/layout.tsx` calls `requireUser()`; protected sections call
  `requireRole(min)` and render a Forbidden view when `!allowed`.
- **RE-CHECK `requireRole` in every server action.** Never trust the client. The sidebar/nav filtering
  by role is for **visibility only** and is not a security boundary.
- Use `assignableRoles(actorRole)` so a user can never grant a role above their own.

## How to wire the database (v0 / deploy)

1. Create a **Neon project**; copy the **pooled** (app) and **unpooled/direct** (migrations) URLs.
2. **Enable Neon Auth (Better Auth)** on the default branch; copy the **Auth URL**.
3. Set env vars (see `.env.example`): `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`,
   `NEON_AUTH_COOKIE_SECRET` (≥ 32 chars), and later `BOOTSTRAP_ADMIN_USER_ID`.
4. `npm run db:generate` → `npm run db:migrate`.
5. **Sign in once** as the first admin to create their Neon Auth user; put that user's id in
   `BOOTSTRAP_ADMIN_USER_ID`.
6. `npm run db:seed` (offices, tools, trainings, bootstrap master_admin — idempotent).
7. Deploy to Vercel with the env vars set.

(`npm run db:push` = push schema without a migration for quick prototyping; `npm run db:studio` =
Drizzle Studio.)

## Adding a feature (recipe)

1. **Route:** add it under `src/app/(dashboard)/…` (Server Component page; co-locate `actions.ts` with
   `'use server'` for mutations). Await `params`/`searchParams`.
2. **Nav:** add the item to `src/components/app-sidebar.tsx` (set its minimum role so it filters by RBAC
   for visibility).
3. **Data:** add the method(s) to **both** `DataApi` implementations — `src/lib/data/index.ts` (in-memory)
   **and** `src/lib/data/queries-db.ts` (Drizzle) — with identical signatures. Export any new input/return
   types from `@/lib/data`.
4. **RBAC:** gate the page (`requireRole`) and re-check in every action; use `assignableRoles` where
   relevant.
5. **A tool:** add it to `src/lib/tools-registry.ts` (`SEED_TOOLS`). `internal_route` tools live at
   `/tools/<slug>` (add a renderer); `external_link` tools open an external URL. `src/db/seed.ts` seeds
   these into the `tools` table for prod.
6. **Schema change:** edit `src/db/schema/**`, then `npm run db:generate` + `npm run db:migrate`.
7. **UI:** use the shared presentational components + semantic tokens; include an empty state.
