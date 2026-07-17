# Backend Foundation — Design Spec

Date: 2026-07-16
Status: Approved for planning

## Context

Sub-project 2 of the learning-app MVP. Sub-project 1 (the clickable UI prototype, see `2026-07-16-clickable-ui-prototype-design.md`) delivered the full product UI on a mock data layer: every read/write goes through API-client-shaped async functions in `lib/data/repository.ts` backed by localStorage, with a single implicit user.

This sub-project replaces that mock layer with a real backend — accounts, Postgres persistence, and a server-side data layer — turning the prototype into a deployable multi-user product with **no mock data at runtime**.

The backend as a whole was decomposed into slices; this spec covers slice 1 only:

- **Slice 1 (this spec):** auth + Postgres + server data layer + catalog seeding + deployment.
- **Slice 2 (later):** real LLM course generation (structured output + validation + background work).
- **Slice 3 (later):** sharing and cohorts (copy links, join links, publish-updates).

## Goals

- Real user accounts; all course, progress, and gamification data server-persisted per user.
- Preserve the prototype's architectural seam: components keep calling the same function signatures; only the implementation moves server-side.
- Database-level integrity for the core loop (no double XP awards, no cross-user data access).
- Deployed and usable in production (Vercel + Neon) at the end of the slice.

## Non-Goals

- LLM course generation — the wizard keeps its canned preview; "Add to My Learning" now persists the resulting course server-side.
- Sharing/cohort functionality beyond schema pre-provisioning (share modal stays mocked).
- Object storage / document upload processing (wizard still accepts files but discards them).
- Migrating prototype localStorage data into accounts (decided: discard; accounts start fresh).
- Mobile/API clients — no public REST/tRPC surface this slice; Server Actions only.
- Per-user timezone handling for streaks (UTC day boundaries for MVP; noted refinement).
- RSC/data-fetching rewrites of existing pages — client components and hooks stay as they are, only their data source changes.

## Stack Decisions (Option A, approved)

| Concern | Choice | Rationale |
|---|---|---|
| Hosting | Vercel | Natural home for Next.js; zero-ops; free tier to start |
| Database | Neon Postgres | Managed, serverless driver suits Vercel; free tier; dev branches |
| ORM | Drizzle | Lightweight, SQL-first, works with Neon serverless driver; drizzle-kit migrations |
| Auth | Better Auth | Sessions/users live in our Postgres (no vendor lock or per-user pricing); Google OAuth + magic-link plugins |
| Sign-in methods | Google OAuth + email magic links | No passwords to store/reset; Resend free tier for magic-link email |
| API style | Next.js Server Actions | Repository functions keep their exact signatures; no REST layer to build/version; can be wrapped in route handlers later if a mobile client materializes |
| Validation | Zod | Action-boundary input validation + the CourseContent content schema (reused by slice 2 generation) |

Rejected alternatives: tRPC/REST + Prisma + Auth.js (pre-builds an API surface no client needs yet; heavier serverless cold starts); Supabase all-in (idiomatic client-SDK + RLS path would bypass the repository seam and scatter data access across components).

## Architecture

```
components / hooks (unchanged)
        │  same function names & signatures
        ▼
Server Actions — lib/data/actions.ts   ("use server")
        │  requireUser() → session → user id (never from client)
        │  Zod input validation, ownership checks
        ▼
Drizzle ORM — lib/db/ (schema, client)
        ▼
Neon Postgres  ←also← Better Auth (user/session/account/verification)
```

- `lib/mock/courses/*` stop being runtime data; they become the input to the seed script.
- `lib/data/storage.ts` (localStorage wrapper) and `lib/data/repository.ts` are deleted at the end of the slice.
- The Zustand store, celebration flow, and `dataVersion` refresh pattern are unchanged.

## Database Schema

Better Auth manages its own tables (`user`, `session`, `account`, `verification`) via its Drizzle adapter.

App tables (Drizzle schema in `lib/db/schema.ts`):

**course_content** — immutable controlled-JSON course content
- `content_id` text PK
- `title`, `description`, `outcome` text
- `tags` jsonb (string[])
- `estimated_hours` integer
- `skill_nodes` jsonb (SkillNode[])
- `lessons` jsonb (Lesson[])
- `is_starter` boolean (true = appears in catalog)
- `created_by` text FK → user, nullable (null for starter content)
- `version` integer default 1 (pre-provisioned for slice-3 publish-updates)
- `created_at`, `updated_at` timestamptz

Rationale: the skill graph and lessons are consumed whole by the player and validated at write time; jsonb avoids exploding a course into many relational tables with no query benefit.

**courses** — a user's library instance
- `id` text PK (generated)
- `user_id` text FK → user
- `content_id` text FK → course_content
- `source` text enum: starter | custom | shared
- `status` text enum: active | completed | archived
- `cohort_id` text FK → cohorts, nullable
- `created_at` timestamptz
- Index on (`user_id`, `status`)

**activity_completions** — one row per completed activity (normalized)
- `course_id` text FK → courses
- `activity_id` text
- `lesson_id` text
- `outcome` text enum: correct | incorrect | needs_review
- `xp_awarded` integer
- `completed_at` timestamptz
- **Unique (`course_id`, `activity_id`)** — double-XP is impossible at the DB level: the completion insert uses `ON CONFLICT DO NOTHING`, and no inserted row means no XP/streak/mastery side effects.

**course_progress** — 1:1 with courses
- `course_id` text PK/FK → courses
- `mastery_by_node` jsonb (Record<nodeId, 0-100>)
- `xp_earned` integer
- `started_at`, `last_activity_at`, `next_review_at` timestamptz (last two nullable)

Lesson completion is **derived** from activity_completions (count per lesson vs. the lesson's activity count), not stored.

**user_stats** — 1:1 with users
- `user_id` text PK/FK → user
- `total_xp`, `xp_today` integer
- `current_streak`, `longest_streak` integer
- `last_study_date` date, nullable

**cohorts** — minimal pre-provision for slice 3
- `id` text PK, `name` text, `content_id` FK → course_content, `owner_id` FK → user, `created_at`

### The core-loop transaction

`completeActivity(courseId, lessonId, activityId, outcome)` runs in one DB transaction:
1. Load course (verify ownership) + content; locate the activity; reject unknown ids.
2. Insert into `activity_completions` with `ON CONFLICT DO NOTHING`. If nothing inserted → already completed → return result with `xpAwarded: 0`, no stat changes.
3. XP: full `activity.xp` for `correct`, half (rounded) otherwise.
4. Recompute the activity's node mastery from completions ÷ node activity count; update `course_progress.mastery_by_node`, `xp_earned`, `last_activity_at`, `next_review_at` (+2 days).
5. Streak on `user_stats` (UTC dates): first completion of a new day → `current_streak + 1` if `last_study_date` was yesterday, else reset to 1; update `longest_streak`, reset `xp_today`. Add XP to `xp_today`/`total_xp`.
6. If every activity in the content is now complete → set course `status = completed`.
7. Return the existing `ActivityCompletionResult` shape (celebration UI unchanged).

## Auth

- Better Auth config in `lib/auth.ts`; handler mounted at `app/api/auth/[...all]/route.ts`; client helper in `lib/auth-client.ts`.
- Providers: Google OAuth; magic-link plugin with Resend as the email sender.
- `/signin` page: Google button + email field, styled with the existing design system. Auth pages are the only routes that don't require a session.
- `middleware.ts` does an optimistic session-cookie check and redirects signed-out visitors to `/signin`; the authoritative check is `requireUser()` inside every Server Action (reads the session via Better Auth's server API, throws a redirect if absent).
- No client-supplied user ids anywhere. Every mutation verifies row ownership (`courses.user_id = session user`).
- First sign-in: create the `user_stats` row (Better Auth database hook on user creation).
- Profile page: real name/avatar/email, working sign-out; the "reset demo data" control is removed.

## Data Layer

`lib/data/actions.ts` (`"use server"`) re-implements, with identical names and signatures:

- `getCourses()`, `getCourseById(id)`, `getCourseProgress(courseId)`, `getAllProgress()`, `getUserStats()`
- `getStarterCatalog()` (from `course_content where is_starter`), `getCustomCoursePreview()` (still canned this slice)
- `addCourseToLibrary(content, source)`, `duplicateCourse(courseId)`, `setCourseStatus(courseId, status)`
- `completeActivity(courseId, lessonId, activityId, outcome)`

Plus:
- Zod validation of every action input.
- `lib/validation/course-content.ts`: Zod schema mirroring `CourseContent` with referential checks — every `prereqIds` entry exists, every `correctOptionId` matches an option, every lesson's `skillNodeId` exists, the prereq graph is acyclic. Applied to all `course_content` writes; reused by slice-2 generation.
- Derived helpers `computeCourseCompletion` / `computeAverageMastery` stay client-safe utilities (moved to `lib/data/derive.ts` since `actions.ts` may only export async functions).
- Hooks (`use-library.ts`, etc.) change only their import path. `repository.ts` and `storage.ts` are deleted once all callers are switched.

## Seeding

`scripts/seed.ts` (run with tsx): upserts the five starter courses from `lib/mock/courses/` into `course_content` (`is_starter = true`), validating each through the content Zod schema. Idempotent — safe to re-run. Run once against dev and once against prod.

## Error Handling

- Server Actions throw typed errors for: unauthenticated (redirect to `/signin`), not-found/not-owned (generic not-found to avoid leaking existence), validation failures (Zod message).
- Client hooks surface failures as a simple error state; pages show an inline "something went wrong — retry" affordance instead of crashing.
- The Neon serverless driver's transient failures: actions are written idempotently (notably `completeActivity` via the unique constraint) so client retries are safe.
- Magic-link email failures surface on the `/signin` page ("couldn't send — try Google or retry").

## Testing

- **Core-loop tests** (port of `repository.test.ts`): run the real Server Action logic against **PGlite** (in-memory Postgres) with the actual Drizzle schema and migrations — streak rollover, XP idempotency via the unique constraint, mastery recomputation, course auto-completion, ownership rejection.
- **Content schema tests**: valid seed courses pass; broken references (dangling prereq, bad correctOptionId, cyclic graph) fail.
- Existing activity-component tests unchanged.
- Auth flows verified manually in the browser (Google + magic link, signed-out redirect).

## Deployment

- Vercel project linked to the repo; Neon integration provides `DATABASE_URL`.
- Env vars: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`.
- Google OAuth consent screen + redirect URIs for localhost and the production domain.
- Local dev uses a Neon `dev` branch (no local Postgres required).
- Ship checklist: migrations applied, seed run, sign-in (both methods) verified in prod, full click-through of catalog → course → lesson → XP/streak on a fresh account.

## Acceptance Criteria

1. A brand-new user can sign in with Google or a magic link, start a starter course, complete a lesson, and see XP/streak/mastery persist across devices and sessions.
2. Two users' libraries and progress are fully isolated; no action can read or mutate another user's rows.
3. Replaying a completed activity never awards XP twice (enforced by the DB constraint, covered by a test).
4. `lib/data/storage.ts` and `lib/data/repository.ts` no longer exist; no runtime code path reads localStorage or `lib/mock/` (except the wizard's canned preview and the seed script).
5. The app runs deployed on Vercel against Neon with all tests green.
