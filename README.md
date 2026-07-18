# Coursible

Describe what you want to be able to do — Coursible generates a full interactive course for it: a skill tree of concepts, multi-page lessons (text, diagrams, quizzes), XP and streaks, and open-ended questions graded by an LLM.

## Stack

- **Next.js 16** (App Router, Server Actions, proxy) + React 19 + Tailwind 4
- **Neon Postgres** via Drizzle ORM (serverless driver, WebSocket pool)
- **Better Auth** — Google OAuth + email magic links (Resend)
- **Kimi K2.6 (Moonshot AI)** for course generation and open-ended grading; Anthropic Opus/Haiku as fallback provider
- **Vitest** + Testing Library

## Prerequisites

- Node.js 22+ (see `.nvmrc`; required for the global `WebSocket` the Neon pool uses)
- A [Neon](https://neon.tech) database (free tier works; create a `dev` branch for local work)
- Google OAuth credentials ([console.cloud.google.com](https://console.cloud.google.com) → Credentials → OAuth client; authorized redirect URI `<origin>/api/auth/callback/google`)
- A [Resend](https://resend.com) API key (magic-link sign-in email)
- A Kimi (Moonshot AI) API key ([platform.kimi.ai](https://platform.kimi.ai)) — or an Anthropic key if you set `GENERATION_PROVIDER=anthropic`

## Setup

```bash
npm install
cp .env.example .env   # fill in the values (see .env.example for comments)
npm run db:migrate     # apply Drizzle migrations
npm run db:seed        # load the starter-course catalog (idempotent)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm test` | Vitest (unit + component tests) |
| `npm run db:generate` | Generate a Drizzle migration from schema changes |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed the starter-course catalog |
| `npx tsx scripts/generate-starters.ts` | Regenerate starter-course JSON (uses the LLM; slow, costs tokens) |

## Architecture

- `app/` — routes. `/` dashboard, `/catalog` starter catalog, `/create` course-generation wizard, `/courses/[id]` player, `/profile`, `/signin`. API: `api/auth` (Better Auth), `api/generation` (kicks off course generation).
- `lib/generation/` — the LLM pipeline: outline → per-lesson generation → validation → repair loop → persist. Provider abstraction (`GENERATION_PROVIDER`) switches between Kimi and Anthropic. Grading of open-ended answers lives here too.
- `lib/validation/` — Zod schema (`course-content.ts`) for the controlled-JSON course format plus pure pedagogy rules (`pedagogy.ts`): teach-before-test, concept coverage, distractor quality. Every `course_content` write is validated.
- `lib/db/schema.ts` — Drizzle schema. Course content (skill graph, lessons) is stored as validated jsonb; user progress, XP, and streaks are relational.
- `lib/data/` — Server Actions and queries (`actions.ts`, `core.ts`, `seed-content.ts`). Server Actions are the authoritative auth boundary (`requireUser`).
- `proxy.ts` — optimistic signed-out gate (redirects pages to `/signin`, returns 401 JSON for API calls).
- `lib/data/starter-courses/` — pre-generated starter catalog JSON, seeded into `course_content` with `is_starter = true`.

## Environment

See `.env.example` for the full list with comments. In production everything in that file is required except the optional overrides.
