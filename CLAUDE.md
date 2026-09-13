# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Working With Requests

- If a prompt is ambiguous or missing details needed to implement it correctly, ask clarifying questions before writing code — don't guess and proceed on an assumption.
- Once all the needed answers are in, before finalizing, sanity-check the planned implementation against industry standards (per the Code Quality Bar below) rather than just making it work.
- Along with the implementation, proactively surface ideas for improving the product where relevant (better UX, edge cases not asked about, technical debt worth flagging) — as suggestions, not unrequested extra work.

## Code Quality Bar

Treat this as production code, not a prototype:

- Match industry-standard practice for the language/framework in use — don't invent ad-hoc patterns when a well-established one applies.
- When fixing a bug, fix the root cause. No workarounds, no papering over symptoms, no suppressing the error just to make it stop surfacing.
- Do what is correct, not what is easiest or fastest to type. If the right fix is more involved than a quick patch, do the right fix.
- Don't leave a bug partially fixed because the rest is inconvenient — either fix it properly or flag explicitly what's still broken and why.
- Before writing new logic, check whether an existing utility/component/pattern already does it, and reuse or extend it instead of duplicating (e.g. `lib/coach.ts`, `lib/validations.ts`, `components/ui/*`). This keeps the codebase lighter and bugs from needing to be fixed in more than one place. This is about reusing what already exists, not preemptively building shared abstractions for things that don't exist yet — don't force two call sites into one shared function just because they look similar today if they're likely to diverge (see the no-premature-abstraction rule already in effect).

## Keeping This File Current

CLAUDE.md is a living document, not a one-time snapshot. Update it in the same session whenever:

- A notable architectural, security, or data-model decision gets made or discovered (e.g. choosing a scoping strategy, finding a schema mismatch, deciding to defer a fix) — add a one-line entry to **Key Decisions** below.
- A real limitation or unresolved issue is found that a future session shouldn't waste time rediscovering (or worse, "fix" incorrectly) — add it to **Known Gaps / Tech Debt** below.
- A convention documented here turns out to be wrong, outdated, or superseded — correct it in place rather than leaving stale guidance for the next session.

Keep additions terse (one or two lines). This file should stay a fast orientation doc, not a running log — if something is fully resolved and no longer load-bearing, remove it instead of letting it accumulate.

## Security & Data Handling

- The service-role client (`lib/supabase/admin.ts`, backed by `SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS entirely. Never import it into client-side code, never log its query results verbatim, and don't reach for it when the scoped server/browser client (with RLS intact) would do the job.
- Aadhar numbers (Indian national ID — sensitive PII) must always be stored and displayed masked, last-4-digits-only, in the existing `XXXX-XXXX-1234` format (see `app/(admin)/players/actions.ts`). Never log, return, or render a full Aadhar number anywhere, including in error messages.
- Don't leak PII (full names, phone numbers, Aadhar numbers, emails) into logs, console output, or error messages beyond what the UI already deliberately displays.
- RLS (via the `is_admin` / `get_coach_branch_id` / `get_coach_batch_ids` DB functions) is the actual security boundary, not a formality — the admin client is a deliberate, narrow bypass for specific admin-only cross-entity operations.
- Auto-generated coach passwords (`generateSecurePassword()` in `app/(admin)/coaches/actions.ts`) are returned once at creation/reset time for out-of-band relay — never persist a generated plaintext password.
- Rate-limit sensitive mutations (password reset, coach create/delete/deactivate, batch transfer) the same way existing actions do via `lib/rate-limit.ts`.

## Frontend & UI/UX Standards

Any UI work (new components, pages, or edits to existing ones) must:

- **Be fully responsive** — verify the layout at mobile, tablet, and desktop widths, not just desktop. Reuse the existing breakpoint conventions already in the Tailwind classes rather than introducing new ad-hoc ones.
- **Look clean, modern, and simple** — generous whitespace, clear visual hierarchy, no visual clutter. Prefer removing an element over decorating it if it doesn't earn its place.
- **Match the existing design system, not a new one** — reuse `components/ui/` primitives (`Button`, `Card`, `Input`, `Table`, `Modal`, `Badge`, `StatCard`, etc.) instead of hand-rolling one-off styles. If a new primitive is genuinely needed, follow the same conventions as the existing ones (variant/size maps, Tailwind utility classes, dark-mode pairs).
- **Support dark mode** — this app runs in dark mode by default (`app/layout.tsx` hardcodes the `dark` class). Every new class that sets color/background must have a sensible `dark:` counterpart, consistent with `context/ThemeContext.tsx`.
- **Follow standard UX conventions** — obvious affordances for clickable elements, loading/empty/error states for anything async (see `EmptyState`, `Spinner`, `loading.tsx` per route), accessible focus states (see the `focus-visible:ring` pattern in `Button.tsx`), and confirmation before destructive actions (matches the existing modal patterns for delete/deactivate flows).
- **Keep interactions purposeful, not flashy** — subtle transitions (`transition-all duration-200`-style, as already used) are fine; avoid gratuitous animation, layout shift, or novelty patterns that don't serve usability.

## Project Overview

HLS Dashboard is an internal management app for **Hyderabad Little Stars (HLS) Soccer Academy**, a youth soccer academy with multiple branch locations in Hyderabad, India. It gives Admins and Coaches a role-scoped interface to manage players, attendance, fees, coaches, and branches/batches.

Backend/auth/db is entirely **Supabase** (Postgres + Auth), accessed via `@supabase/ssr` and `@supabase/supabase-js`. There is no separate API server — all data access happens through Server Actions and Supabase client calls directly from Next.js.

## Commands

```bash
npm run dev          # start dev server (localhost:3000)
npm run build        # production build
npm run start         # run production build
npm run lint          # eslint
npm run test           # vitest in watch mode
npm run test:run       # vitest single run (CI)
```

Run a single test file or case with vitest directly:

```bash
npx vitest run lib/__tests__/validations.test.ts
npx vitest run -t "test name substring"
```

On Windows PowerShell, prefer `cmd.exe /c npm run dev` if you hit shell issues with the dev server (per README).

Required env vars (`.env.local`, see `.env.local` for the local file): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose to the client).

## Architecture

### Next.js version caveat

This repo pins `next@16.2.9`, which has real breaking changes vs. older Next.js conventions baked into training data (see `AGENTS.md`). The most load-bearing example already in this codebase: **route middleware lives in `proxy.ts` at the project root, not `middleware.ts`**, and exports a `proxy()` function (not `middleware()`). Before assuming any other Next.js API/convention, check `node_modules/next/dist/docs/` for this version rather than relying on prior knowledge.

### Route groups = role boundaries

`app/` uses three route groups, each mapping directly to an access level:

- `app/(auth)/` — `/login`, `/change-password`. Public.
- `app/(admin)/` — `/dashboard`, `/players`, `/coaches`, `/branches`, `/attendance`, `/fees`. Wrapped by `app/(admin)/layout.tsx`, which renders `<ProtectedRoute allowedRole="ADMIN">`.
- `app/(coach)/` — `/coach-dashboard`, `/my-players`, `/my-attendance`, `/my-fees`. Wrapped by `app/(coach)/layout.tsx` with `<ProtectedRoute allowedRole="COACH">`.

Each protected route directory typically has `page.tsx` (mostly client-driven), `loading.tsx`, and an `actions.ts` with the `'use server'` mutations for that section (e.g. `app/(admin)/players/actions.ts`, `app/(admin)/coaches/actions.ts`, `app/(admin)/fees/actions.ts`).

### Auth is enforced twice, on purpose

1. **`proxy.ts` → `lib/supabase/middleware.ts` (`updateSession`)**: runs on every request, refreshes the Supabase session cookie, and does coarse redirect-level routing (`PUBLIC_ROUTES` / `ADMIN_ROUTES` / `COACH_ROUTES` arrays) based on the `profiles.role` fetched fresh each request. This is the first line of defense and prevents an unauthenticated or wrong-role user from ever getting HTML for a page they shouldn't see.
2. **`components/layout/ProtectedRoute.tsx` + `context/AuthContext.tsx`**: a client-side belt-and-suspenders check. `AuthContext` subscribes to `supabase.auth.onAuthStateChange` and loads the `profiles` row into `profile`. `ProtectedRoute` redirects on role mismatch and also enforces the forced `must_change_password` flow for coaches (see below).

When touching auth/routing, keep both in sync — `middleware.ts`'s route arrays and `ProtectedRoute`'s `allowedRole` prop are two independent sources of truth for the same boundary.

### Three Supabase client variants — pick the right one

- `lib/supabase/client.ts` — browser client (singleton), used in Client Components and `context/AuthContext.tsx`.
- `lib/supabase/server.ts` — server client bound to Next's `cookies()`, used for reading the current user's session in Server Components/Actions (e.g. `login`/`logout` in `app/(auth)/login/actions.ts`).
- `lib/supabase/admin.ts` — **service-role client**, bypasses RLS entirely. Used only inside `'use server'` action files for admin-privileged operations (creating/deleting coach auth accounts, banning users, cross-branch writes). Never import this into client code.

Row Level Security is enforced at the Postgres level using SQL functions declared in `types/database.types.ts`'s `Functions` (`is_admin`, `get_coach_branch_id`, `get_coach_batch_ids`) — these are referenced by DB policies, not called from TypeScript. Data-scoping logic that *is* in TypeScript (for building UI queries) lives in `lib/coach.ts` (see below).

### Coach data scoping (`lib/coach.ts`)

Coaches are scoped by **batch** first, falling back to **branch** only if they have no batch assignments (`isBranchFallback`). `getCoachBatchInfo(userId)` returns `{ batchIds, branchIds, isBranchFallback }` and is the function coach-side pages/queries use to filter players/attendance/fees. Results are memoized in an in-memory `Map` for the session (`clearCoachBatchInfoCache` busts it) — batch/branch assignments rarely change mid-session, so don't add another cache layer on top.

### Server Actions pattern

Mutations are plain `'use server'` functions in each section's `actions.ts`, not API routes. The consistent shape:

1. Optional `rateLimit(key, opts)` check first (`lib/rate-limit.ts` — in-memory, per-process, resets on deploy; fine for this scale, don't treat it as durable).
2. Parse/validate input with a Zod schema from `lib/validations.ts` via `parseFormData(schema, formData)`, which returns either the parsed data or `{ error }`.
3. Use `createAdminClient()` for privileged writes (most admin mutations do, since they need to bypass RLS for cross-entity writes like creating an auth user + profile + coach row in sequence).
4. Return `{ success: true, ... }` or `{ error: string }` — callers in Client Components branch on this shape rather than throwing/catching.
5. `revalidatePath(...)` the relevant list route on success.

Multi-step admin mutations (e.g. `createCoachAccount` in `app/(admin)/coaches/actions.ts`) manually roll back on partial failure (e.g. `deleteUser` if the profile insert fails after the auth user was created) since there's no DB transaction spanning `auth.users` and `public` tables.

### Password flow for coaches

Admin-created coach accounts get a random generated password and `user_metadata.must_change_password: true`. `ProtectedRoute` force-redirects such coaches to `/change-password` until `app/(auth)/change-password/page.tsx` clears the flag (`must_change_password: false`) via `supabase.auth.updateUser`.

### Types

`types/database.types.ts` mirrors the Supabase schema (tables: `branches`, `batches`, `profiles`, `coaches`, `coach_batches`, `players`, `attendance`, `fees`) and is hand-aligned with the DB, not auto-generated in a build step — update it manually alongside migrations. `types/app.types.ts` holds app-level domain interfaces (`UserProfile`, `Player`, `Fee`, etc.) used across components, which sometimes normalize/simplify the raw DB row shape (check both when a field seems missing).

### UI conventions

`components/ui/` are hand-rolled primitives (no shadcn/radix-styled generator) using string-keyed `variants`/`sizes` maps rather than `class-variance-authority` (cva is a dependency but isn't the pattern used in the existing components — check before introducing it inconsistently). `components/layout/` holds the two parallel shells (`AdminLayout`/`Sidebar`/`TopBar` vs. `CoachLayout`/`CoachSidebar`/`BottomNav`). Dark mode is driven by `context/ThemeContext.tsx` plus the `dark` class hardcoded on `<html>` in `app/layout.tsx`.

## Known Gaps / Tech Debt

- **Typed Supabase client resolves to `never` once `as any` is removed.** Nearly every Server Action query in this codebase casts its client as `(supabase as any)` / `(adminClient as any)`. Removing those casts (verified via `npx tsc --noEmit`) causes widespread `TS2345`/`TS2339` errors — `.single()` results typed as `never`, `.insert()`/`.update()` payloads rejected — across `coaches`, `players`, `coach_batches`, and `fees`, including columns that are already correctly typed. This means the casts aren't just papering over missing columns; there's a deeper, undiagnosed generic-inference mismatch between `@supabase/supabase-js`'s typed query builder and this `Database` type shape (possibly tied to the pinned Next.js 16 / React 19 / TS `^5` combination). **Do not bulk-remove these casts without first running `npx tsc --noEmit` and root-causing the inference failure** — a partial removal will break the build.
- `types/database.types.ts` is hand-maintained, not generated from the live schema. It has drifted from the actual Supabase schema before (see Key Decisions) and can drift again after any migration that isn't mirrored here.

## Key Decisions

Append-only. One line per entry, dated, newest last. Only durable architectural/security/data-model decisions — not routine code changes (git history already covers those).

- 2026-09-14 — `types/database.types.ts` was missing `coaches.status`, `players.gender`, and `players.aadhar_number`, which exist in the live Supabase schema (confirmed via schema diagram). Added the missing columns to the type file. Did not attempt to remove the resulting `as any` casts in the same pass — see Known Gaps above for why that's a separate, larger fix.
- 2026-09-14 — Fixed `lib/supabase/middleware.ts`'s `ADMIN_ROUTES`/`COACH_ROUTES` arrays: `ADMIN_ROUTES` was missing `/attendance`, and `COACH_ROUTES` referenced non-existent paths (`/coach-attendance`, `/coach-fees`) while missing the real `/my-players`, `/my-attendance`, `/my-fees`. Not a security hole (client-side `ProtectedRoute` still enforced role checks), but the middleware's first-line redirect was silently not firing for those routes. Verified with `npx tsc --noEmit` and a repo-wide grep for the old path strings.
