# Page-Based Lessons & Real Course Generation — Design Spec

Date: 2026-07-17
Status: Approved for planning

## Context

Sub-project 3 of the learning-app MVP (this is slice 2 of the backend roadmap in
`2026-07-16-backend-foundation-design.md`, expanded in scope). Slice 1 delivered
auth, Postgres, and the server data layer; the course wizard still shows a canned
preview, and lesson content is limited to the prototype's activity model:
`explanation_check` (text + multiple choice), `scenario_decision`,
`applied_task`, plus two preview-only stubs.

Problems this sub-project solves:

- **Not enough content variety or depth.** Lessons are "some text and multiple
  choice" — not enough to actually learn from.
- **No real generation.** The wizard's output is canned; the controlled-JSON
  schema exists (`lib/validation/course-content.ts`) but nothing fills it.
- **Weak pedagogy with no enforcement.** Questions can test material that was
  never taught; multiple-choice distractors are low-effort (obviously-wrong
  options next to one detailed correct answer).

## Goals

- Replace the activity model with a **page-based lesson model**: a lesson is an
  ordered sequence of content pages (text, diagram, video) and question pages
  (multiple choice, matching, typing, open-ended).
- Build the **real LLM generation pipeline** that fills this schema — the model
  fills out structured JSON; it never invents structure.
- Make the pedagogy rules **mechanically enforceable**: no question may test a
  concept that hasn't been taught earlier; every distractor must encode a
  plausible misconception; every lesson teaches before it tests.
- Render every new page type in the lesson player, including AI-graded
  open-ended questions at answer time.
- Regenerate the starter courses through the new pipeline (dogfood + fixes their
  thin content).

## Non-Goals

- **Video sourcing/rendering.** The `video` page type is in the schema
  (forward-compatible) but is neither generated nor rendered this slice.
- Sharing/cohorts (slice 3).
- Processing uploaded wizard documents (files still accepted and discarded).
- Spaced review, AI tutor conversations, and applied tasks — removed from the
  schema; may return as future page types.
- Migrating existing per-user progress on old-format courses (reset instead;
  accounts are fresh from slice 1).
- Author-facing course editing UI.

## Decisions Made During Brainstorm

| Decision | Choice |
|---|---|
| Lesson model | Page-based (flat ordered page sequence), replacing activities |
| Video pages | Schema now, implementation deferred |
| Open-ended grading | Small model (Claude Haiku 4.5) + rubric, via server action |
| Scope | Schema + renderers + full generation pipeline (slice 2) |
| Pipeline shape | Multi-stage: outline → per-lesson → validate → repair |

## 1. Content Schema v2

`CourseContent` keeps its outer shape (contentId, title, description, outcome,
tags, estimatedHours, skillNodes) and adds:

- `schemaVersion: 2`
- `concepts: { id: string; name: string }[]` — the flat list of concepts the
  course teaches. Concepts are the spine that makes ordering enforceable.

A **lesson** becomes:

```ts
interface Lesson {
  id: string;
  title: string;
  description: string;
  skillNodeId: string;
  estimatedMinutes: number;
  pages: Page[];        // replaces activities
}
```

`Page` is a discriminated union on `type`.

### Content pages (teach)

Every content page carries `teaches: conceptId[]` (may be empty for pure
narrative/transition pages).

| Type | Fields |
|---|---|
| `text` | `title`, `body` (markdown subset: paragraphs, bold, inline code, headings, lists), `teaches` |
| `diagram` | `title`, `intro?` (short text), `mermaid` (Mermaid source), `caption`, `teaches` |
| `video` (deferred) | `title`, `searchQuery`, `shouldCover` (what the video must explain), `videoId: string \| null` (always null this slice), `teaches` |

Mermaid was chosen for diagrams because LLMs produce it reliably, it validates
client-side, and it renders without asset storage.

### Question pages (test)

Every question page carries `id`, `prompt`, `tests: conceptId[]` (min 1),
`explanation` (shown after answering), and `xp`.

| Type | Fields beyond the common set |
|---|---|
| `multiple_choice` | `context?` (scenario framing — absorbs the old `scenario_decision`), `options: { id, text, misconception?: string }[]` (2–5), `correctOptionId`. **Every incorrect option MUST have `misconception`** — the plausible confusion that would lead a learner to pick it. The correct option must not have one. |
| `matching` | `pairs: { id, left, right }[]` (3–6). UI shuffles the right column. |
| `typing` | `acceptableAnswers: string[]` (min 1; matched case- and whitespace-insensitively), `hint?` |
| `open_ended` | `rubric: { keyPoints: string[]; commonMisconceptions: string[]; sampleAnswer: string }` |

### Validation (Zod, extends `lib/validation/course-content.ts`)

Existing checks retained: prereq ids resolve, prereq graph is a DAG, lessons and
pages point at real skill nodes, `correctOptionId` resolves.

New referential/pedagogy checks:

1. **Concept resolution** — every id in `teaches` / `tests` exists in
   `concepts`.
2. **Teach-before-test** — for every question page, each tested concept must be
   taught by a content page that appears earlier: earlier in the same lesson, in
   an earlier lesson of the same skill node, or in any lesson of a prerequisite
   (transitively) skill node. Hard failure.
3. **Coverage** — every concept in `concepts` is taught by at least one content
   page.
4. **Teaching minimums** — each lesson contains at least one content page before
   its first question page; each lesson has ≥ 2 content pages total.
5. **Distractor shape** — every incorrect MCQ option has a non-empty
   `misconception`; the correct option has none.

### Progress & XP

- `LessonProgress.completedActivityIds` → `completedPageIds` (also enables
  resume-at-page).
- XP is awarded per question page on first completion (as activities are
  today, via the existing idempotent server-side award path). Content pages
  award no XP but count toward lesson completion.
- Mastery per skill node continues to be driven by question outcomes
  (`correct` / `incorrect`; open-ended `pass` maps to correct, `partial` and
  `retry` to incorrect for mastery purposes).

## 2. Lesson Player

`components/lesson/activity-player.tsx` becomes a **page player**:

- Progress indicator across the page sequence; state machine per page
  (content → advance on "Continue"; question → answer → feedback → advance).
- New components: `TextPage`, `DiagramPage` (client-side Mermaid render),
  `MultipleChoicePage`, `MatchingPage` (tap-to-pair selection),
  `TypingPage` (input + normalization), `OpenEndedPage` (textarea → grade →
  feedback + rubric reveal).
- Completion celebration flow, XP toasts, and the Zustand `dataVersion`
  refresh pattern are unchanged.

### Open-ended grading (runtime AI call)

A server action `gradeOpenEndedAnswer(courseId, lessonId, pageId, answer)`:

- Loads the page's rubric server-side (never trusts client-supplied rubric).
- Calls **Claude Haiku 4.5** (`claude-haiku-4-5`) with the rubric + answer,
  using structured output: `{ verdict: "pass" | "partial" | "retry",
  feedback: string, missedKeyPoints: string[] }`.
- Returns the grade; the client shows feedback and the sample answer/key
  points. `pass`/`partial` complete the page (with full/no mastery credit as
  above); `retry` lets the learner try again without penalty.
- On API failure: graceful fallback to self-assessment (show rubric + sample
  answer, learner marks "got it / missed some"), so a provider outage never
  blocks lesson progress.

Haiku is the deliberate choice here (user decision): grading happens on every
answer, latency must be low, and the rubric does the heavy lifting.

## 3. Generation Pipeline

All LLM calls use the Anthropic TypeScript SDK with **structured outputs**
(`client.messages.parse` + `zodOutputFormat`) so every response is
schema-valid JSON by construction — the model fills out the schema; it cannot
invent structure. Generation model: **Claude Opus 4.8** (`claude-opus-4-8`),
adaptive thinking, streaming for long outputs.

### Stages

1. **Outline call** (one): wizard answers → course metadata, skill tree
   (nodes + prereq DAG + layout positions), lesson list (title, description,
   skill node, minutes), and the ordered **concept map** — the full `concepts`
   list plus which lesson introduces each concept.
2. **Per-lesson calls** (one per lesson, limited parallelism ~3): input is the
   outline, the lesson brief, the concepts this lesson must teach, and the set
   of concepts already taught by earlier lessons. Output is the lesson's full
   page sequence. The prompt carries the pedagogy rules: teach every assigned
   concept with substantive content before testing it; only test taught
   concepts; distractor style rules (each encodes a real misconception; match
   the correct answer's length and specificity; no joke options).
3. **Validation**: Zod schema + all checks from §1 run on each lesson as it
   lands, then on the assembled course.
4. **Repair**: a failing lesson is regenerated up to 2 more times with the
   concrete validation errors appended to the prompt. If the course still
   fails, the job fails cleanly with a user-visible message (no partial
   courses are saved).

### Job orchestration

- New table `generation_jobs`: id, user id, wizard answers (jsonb), status
  (`queued` / `outlining` / `generating` / `validating` / `failed` / `done`),
  error text, resulting `content_id`, timestamps.
- The wizard submits → job row created → generation runs server-side → wizard
  polls job status and shows real stage progress (replacing the fake
  `GENERATION_STAGES` strings), then the real course preview from the stored
  content.
- The exact background-execution mechanism on Vercel (route handler
  `maxDuration` vs. `waitUntil` vs. an external queue) is decided in the
  implementation plan; the design only requires that generation survives
  beyond a normal request lifetime and reports status via the job row.
- `ANTHROPIC_API_KEY` is a new server-side environment variable.

### Starter courses

The seed script's hand-written mock courses are replaced: starter courses are
**regenerated through the pipeline** (run at seed/build time, output checked
into the repo as JSON or seeded to the DB). This is the pipeline's dogfood
test and fixes the starter courses' thin content in the same stroke.

## 4. Quality Rules — Enforcement Map

| Goal | Enforced by |
|---|---|
| No questions on untaught material | Validator (hard failure → repair), via `teaches`/`tests` concept tags |
| Enough teaching depth | Prompt rules + validator minimums (§1 checks 3–4) |
| Plausible distractors | Schema (`misconception` required per distractor) + prompt style rules |
| Consistent open-ended grading | Rubric fixed at generation time, applied by Haiku at answer time |
| Structural integrity | Zod + DAG/referential checks (existing + new) |

## 5. Migration

- `lib/types/index.ts` and `lib/validation/course-content.ts` move to schema
  v2; old activity types and their components/tests are deleted.
- `course_content` rows are versioned by `schemaVersion`; all shipped content
  is regenerated, so no in-place JSON migration is needed — old rows are
  replaced at seed time.
- User progress referencing old activity ids is reset (drop/clear progress
  rows for replaced courses). Acceptable: accounts started fresh in slice 1.

## 6. Error Handling

- **Generation**: per-stage try/catch writes `failed` + message to the job
  row; wizard shows the failure with a retry button. Repair loop bounded
  (≤ 2 retries per lesson). No partial course is ever persisted.
- **Grading**: API errors fall back to self-assessment (§2); the action never
  throws to the client.
- **Rendering**: invalid Mermaid renders a fallback card with the caption text
  (content remains usable); unknown page `type` (future versions) renders a
  skip-able placeholder.

## 7. Testing

- **Validator**: unit tests for every new check — teach-before-test orderings
  (same lesson, cross-lesson, via prereqs, and violations), coverage,
  minimums, distractor shape.
- **Pipeline**: stage functions tested with a mocked Anthropic client —
  happy path, lesson repair loop, unrecoverable failure.
- **Grading action**: mocked client; verdict mapping; fallback on API error.
- **Player components**: per-page-type render/interact tests mirroring the
  existing `activities.test.tsx` patterns (matching pairing, typing
  normalization, open-ended flows).
- **Seed**: regenerated starter content passes full validation in CI.
