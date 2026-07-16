# Clickable UI Prototype — Design Spec

Date: 2026-07-16
Status: Approved for planning

## Context

This is sub-project 1 of the learning-app MVP described in the initial project plan. The MVP as a whole spans a course library, an AI-driven custom course creation pipeline, a structured course activity engine, a gamified learning loop, sharing/cohorts, and full platform infrastructure (Next.js, Postgres, background workers, object storage, structured LLM outputs, analytics). That's too broad for a single spec, so it's being decomposed into sub-projects, each with its own spec → plan → build cycle.

This sub-project builds the **clickable UI prototype**: the real Next.js application foundation, frontend-only, backed by mock/localStorage data instead of a live backend. It exists to validate the product's visual and interaction language — gamified but not a Duolingo clone — before investing in real backend infrastructure (Postgres, workers, real LLM generation, auth, multi-user sharing).

Later sub-projects (not covered here) will add: real auth/accounts, Postgres-backed persistence, the background course-generation worker with real structured LLM output, object storage for uploaded source material, real multi-user cohort sync, and analytics/cost tracking.

## Goals

- Stand up the real Next.js app shell that later sub-projects build on top of — not a throwaway mockup.
- Prove out the core learning loop UX (lesson → activity → feedback → mastery update → XP/streak) with real interaction, not static images.
- Establish a visual/interaction identity that reads as game-like and motivating without borrowing Duolingo's signature mechanics (hearts/lives, mascot, winding path).
- Establish a mock-data contract (`lib/data/*.ts`) that mirrors the shape of the future real API, so swapping in the real backend later doesn't require rewriting components.

## Non-Goals

- Real authentication / multi-user accounts (a single implicit "current user" is assumed throughout).
- Postgres or any real database — all persistence is localStorage via the mock data layer.
- Real LLM-backed course generation — the custom-course wizard's "AI preview" step returns canned, hardcoded output.
- Background worker, object storage, real document upload/parsing.
- Real multi-user cohort sync or canonical-version publishing (the sharing modal's "Publish update" action is present but disabled/stubbed).
- Automated e2e test suite — manual click-through is sufficient validation for a prototype.

## Visual & Interaction Direction

Decided during brainstorming (see `.superpowers/brainstorm/549-1784237223/content/` for the mockups shown):

- **Tone**: Clean and focused base UI (SaaS/dev-tool feel) with gamified elements used as accents, not the dominant aesthetic — appropriate for adults pursuing real-world outcomes (e.g., a Docker course), not a children's app.
- **Palette**: "Neutral & Amber" — near-black/white neutral base, warm amber (`#F79009`-family) for streak/XP/progress accents, sharper corners than a typical playful app.
- **Game mechanics included**: streaks, XP, mastery meters/rings, skill-tree map navigation.
- **Game mechanics explicitly excluded**: hearts/lives (limited attempts), mascot/character-driven UI. Both are treated as Duolingo's most identifiable signature mechanics and are the highest risk of reading as a copy.
- **Skill map layout**: branching tech-tree (horizontal graph showing real prerequisite structure between skill nodes) rather than a winding vertical path or a flat grid. Reads as strategic/game-like without mimicking Duolingo's path shape.
- **Mobile navigation**: persistent bottom tab bar (Learning / Catalog / Create / Profile), applied globally via the root layout rather than as a separate screen.

## Scope: Routes & Screens

| Route | Screen | Notes |
|---|---|---|
| `/` | My Learning dashboard | Active / Completed / Archived courses; progress, mastery, streak, next review date per course; "Duplicate" action on shared/starter courses |
| `/catalog` | Starter-course catalog | Grid of prebuilt courses (title, outcome, est. time, tags); "Start course" duplicates into the user's library |
| `/create` | Custom-course wizard | Multi-step form: outcome → existing knowledge → available time → learning style → optional doc upload (accepted but not parsed) → mocked "Generating..." transition → canned course preview + skill-tree map → "Add to My Learning" |
| `/courses/[courseId]` | Course detail / skill-tree map | Branching tech-tree of skill nodes; entry point into lessons |
| `/courses/[courseId]/lessons/[lessonId]` | Interactive lesson player | Renders the lesson's activity sequence |
| (modal, not a route) | Course-sharing modal | "Copy course" (generates a shareable link; visiting it would duplicate the course — mocked) vs. "Join cohort" (same content id, separate progress record); owner sees a disabled "Publish update" action |

This covers all 8 prototype pieces from the original plan — the skill map is part of course detail rather than a standalone screen, and mobile nav is a global layout concern rather than its own screen.

## Activity Engine

Lessons are stored as structured JSON (an array of activities with a discriminated `type` field), matching the "controlled JSON, not generated webpages" principle from the platform plan. The lesson player switches on `activity.type`:

- **`explanation_check`** (fully interactive) — explanation content block + 1-3 knowledge-check questions with immediate right/wrong feedback.
- **`scenario_decision`** (fully interactive) — scenario prompt with branching choices; selecting an option shows the consequence and a brief rationale.
- **`applied_task`** (fully interactive) — task prompt with a lightweight submission (e.g., a checklist or a pasted command), "graded" via mock rule-matching against an expected-answer pattern in the seed JSON — not real evaluation.
- **`ai_tutor_conversation`** (static preview) — shown as a preview card describing what this activity will look like; not functional in this sub-project.
- **`spaced_review`** (static preview) — same treatment as AI tutor conversation.

The seed content for this engine is a full Docker Fundamentals course (chosen as the example in the original plan), covering the module/skill breakdown shown in the skill-tree mockup.

### Core loop

After each completed activity: immediate feedback → mastery update (per-skill-node percentage, written via the mock progress repository) → XP award + streak check → remediation (surface review of a missed concept) or progression to the next activity. Gamification UI components (`XPBar`, `StreakBadge`, `MasteryRing`, celebration toasts) react to state changes in the progress store rather than being hardcoded per screen.

## Architecture

```
app/
  (dashboard)/page.tsx              → My Learning
  catalog/page.tsx
  create/page.tsx                   → wizard
  courses/[courseId]/page.tsx       → skill-tree map
  courses/[courseId]/lessons/[lessonId]/page.tsx
components/
  ui/          → shadcn/ui primitives
  dashboard/, catalog/, wizard/, skill-map/, lesson/, sharing/
  gamification/ → XPBar, StreakBadge, MasteryRing, celebration toasts
lib/
  data/        → repository functions (getCourses, getCourseById, updateProgress, ...)
  mock/        → seed JSON: starter courses, the full Docker course (lessons + activities), user progress
  store/       → Zustand stores (active lesson session, toast/celebration state)
  types/       → shared TypeScript types (Course, SkillNode, Activity, Progress, ...)
```

**Stack**: Next.js 15 (App Router) + TypeScript, Tailwind CSS + shadcn/ui, Zustand for cross-component client state (active lesson session, celebration/toast state), Framer Motion for gamification micro-interactions (XP pop, progress bar fill, streak flame).

**Mock data contract**: `lib/data/*.ts` functions read/write to localStorage but expose the same async function signatures a real API client will use later (e.g., `await getCourses(userId)`). When the real Postgres-backed API exists in a later sub-project, only the implementations inside these functions change — pages and components should not need to change.

## Error Handling

This is a mocked, single-user prototype, so error handling is limited to what a real UI needs regardless of backend:

- Form validation in the wizard (required fields, file type/size limits on the doc upload input even though contents aren't parsed).
- Empty states: no active courses, empty catalog filter results, no upcoming reviews.
- Activity submission edge cases: no answer selected, applied-task submission that doesn't match any expected pattern (shown as "needs review" rather than a hard failure).

No network-error handling is needed since there's no real network layer yet.

## Testing

Component-level tests for:
- Each activity type (renders correctly, scores/feedback logic behaves correctly for right/wrong/partial answers).
- Mock data repository functions (`lib/data/*.ts`), since these are the pieces most likely to carry over into the real backend integration.

No e2e suite for this sub-project; manual click-through across the 5 routes + sharing modal is the acceptance check.

## Open Items For Future Sub-Projects

- Real auth/accounts and multi-user sessions.
- Postgres schema and API layer replacing the mock data repository.
- Background worker + real structured LLM output for course generation (replacing the canned wizard preview).
- Object storage for uploaded source documents.
- Real cohort sync and canonical-version publishing.
- Analytics and generation-cost tracking.
