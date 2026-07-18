# Page-Based Lessons & Real Course Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the activity-based lesson model with a page-based model (content pages + question pages with enforceable pedagogy rules), build the real Anthropic-powered generation pipeline behind the course wizard, add AI grading for open-ended questions, and regenerate the starter courses through the pipeline.

**Architecture:** Schema v2 adds a flat `concepts` list and turns lessons into ordered `Page[]` sequences; a shared pedagogy module enforces teach-before-test/coverage/minimums/distractor rules both inside the Zod validator and inside the pipeline's per-lesson repair loop. Generation runs server-side via a Route Handler (`after()` + `maxDuration`) writing status to a new `generation_jobs` table that the wizard polls. All LLM calls go through a small `ModelClient` wrapper over `client.messages.parse` + `zodOutputFormat` so tests can stub the model.

**Tech Stack:** Next.js 16 (App Router, Server Actions, Route Handlers, `after()`), Drizzle + Neon Postgres (PGlite in tests), Zod v4, `@anthropic-ai/sdk` (structured outputs; Opus 4.8 for generation, Haiku 4.5 for grading), `mermaid` for client-side diagram rendering, Vitest + Testing Library.

---

## Ground rules for the executor

- **Branch:** do not implement on `master`. Create a branch (e.g. `feature/page-based-lessons`) or worktree first (superpowers:using-git-worktrees).
- **Intermediate states:** tasks 1–7 intentionally leave *unmodified* UI files referencing old types (the repo won't fully typecheck until Task 5 and won't build until Task 8). Per-task verification is `npx vitest run <specific files>`; `npm run lint` / `npm run build` are checked at Task 10. Vitest only compiles each test file's import graph, so this works.
- **Env vars:** `DATABASE_URL` is already in `.env`. `ANTHROPIC_API_KEY` is **not** — Tasks 9–10 (starter regeneration, live smoke test) need it. When you reach Task 9, if `ANTHROPIC_API_KEY` is still missing from `.env`, STOP and ask your human partner for a key; do not fake the output.
- **Commands:** run from the repo root `C:\Users\zachb\workspaces\learnapp`. `npx vitest run <file>` runs one test file.
- **Windows note:** paths in test code use `path.join`; keep it that way.

## File structure (end state)

```
lib/types/index.ts                     REWRITE  schema-v2 domain types (pages, concepts, jobs, grading)
lib/test-fixtures/course.ts            NEW      valid v2 course fixture used by all test suites
lib/validation/pedagogy.ts             NEW      pure pedagogy checks shared by validator + pipeline
lib/validation/course-content.ts       REWRITE  Zod schema v2 + structural checks + pedagogy checks
lib/validation/course-content.test.ts  REWRITE  tests for every check
lib/validation/wizard-answers.ts       NEW      Zod schema for wizard answers (route handler input)
lib/db/schema.ts                       MODIFY   page_completions, generation_jobs, course_content v2 cols
drizzle/000N_*.sql                     NEW      two generated migrations (+ hand-added data resets)
lib/data/core.ts                       MODIFY   completePage, question-outcome mastery, v2 mapping
lib/data/core.test.ts                  REWRITE  ported scenarios against the fixture course
lib/data/actions.ts                    MODIFY   completePage, gradeOpenEnded, getGenerationJob; drop canned preview
lib/data/derive.ts                     MODIFY   pages instead of activities
lib/data/seed-content.ts               REWRITE  load starter JSON from lib/data/starter-courses/
lib/data/starter-courses/*.json        NEW      pipeline-generated starter content (checked in)
lib/data/starter-content.test.ts       NEW      CI: every starter JSON passes full validation
lib/generation/model.ts                NEW      ModelClient interface + Anthropic adapter (parse + zodOutputFormat)
lib/generation/client.ts               NEW      singleton client + model id constants
lib/generation/grading.ts              NEW      open-ended grading (Haiku + rubric) + fallback wrapper
lib/generation/grading.test.ts         NEW
lib/generation/schemas.ts              NEW      model-facing Zod schemas (outline, lesson pages)
lib/generation/prompts.ts              NEW      system/user prompt builders incl. repair suffix
lib/generation/pipeline.ts             NEW      outline → per-lesson (limit 3) → validate → repair → assemble
lib/generation/pipeline.test.ts        NEW      happy path, repair loop, unrecoverable failure
lib/generation/generation-fixtures.ts  NEW      canned outline/pages + stub ModelClient (test-only import)
lib/generation/jobs.ts                 NEW      generation_jobs CRUD + runGenerationJob
lib/generation/jobs.test.ts            NEW      PGlite job lifecycle (done / failed)
app/api/generation/route.ts            NEW      POST: create job, after() → run; maxDuration = 800
components/lesson/rich-text.tsx        MODIFY   headings + bullet lists added to the markdown subset
components/lesson/pages/text-page.tsx  NEW
components/lesson/pages/diagram-page.tsx NEW    client-side Mermaid render + fallback card
components/lesson/pages/multiple-choice-page.tsx NEW
components/lesson/pages/matching-page.tsx NEW
components/lesson/pages/typing-page.tsx NEW
components/lesson/pages/open-ended-page.tsx NEW
components/lesson/page-player.tsx      NEW      replaces activity-player.tsx
components/lesson/pages.test.tsx       NEW      per-page-type render/interaction tests
components/lesson/{activity-player,explanation-check,scenario-decision,applied-task,activity-previews}.tsx DELETE
components/lesson/activities.test.tsx  DELETE
components/wizard/course-wizard.tsx    REWRITE  real job submission + status polling
components/wizard/course-preview.tsx   MODIFY   page counts, no "mocked" note
components/skill-map/skill-tree.tsx    MODIFY   pages + completedPageIds
app/courses/[courseId]/page.tsx        MODIFY   completedPageIds
app/courses/[courseId]/lessons/[lessonId]/page.tsx MODIFY  PagePlayer + pages
lib/store/app-store.ts                 MODIFY   PageCompletionResult type rename
lib/mock/**                            DELETE   all mock courses + canned preview
scripts/generate-starters.ts           NEW      runs pipeline per starter brief → JSON files
.env.example                           MODIFY   add ANTHROPIC_API_KEY
```

---

### Task 1: Schema-v2 domain types + test fixture

**Files:**
- Rewrite: `lib/types/index.ts`
- Create: `lib/test-fixtures/course.ts`

- [ ] **Step 1: Rewrite `lib/types/index.ts`** with exactly this content:

```ts
// Shared domain types for the learning app — schema v2.
// A lesson is an ordered sequence of pages: content pages (teach) and
// question pages (test). Concepts are the spine that makes the
// teach-before-test pedagogy rules mechanically enforceable.

// ---------- Concepts ----------

export interface Concept {
  id: string;
  name: string;
}

// ---------- Content pages (teach) ----------

interface ContentPageBase {
  id: string;
  title: string;
  /** Concept ids this page substantively teaches (may be empty for narrative pages). */
  teaches: string[];
}

export interface TextPage extends ContentPageBase {
  type: "text";
  /** Markdown subset: paragraphs, **bold**, `code`, #/##/### headings, "- " lists. */
  body: string;
}

export interface DiagramPage extends ContentPageBase {
  type: "diagram";
  intro?: string;
  /** Mermaid source, rendered client-side. */
  mermaid: string;
  caption: string;
}

/** In the schema for forward-compatibility; neither generated nor rendered this slice. */
export interface VideoPage extends ContentPageBase {
  type: "video";
  searchQuery: string;
  /** What the video must explain. */
  shouldCover: string;
  /** Always null this slice. */
  videoId: string | null;
}

// ---------- Question pages (test) ----------

interface QuestionPageBase {
  id: string;
  prompt: string;
  /** Concept ids this question tests (min 1, enforced by the validator). */
  tests: string[];
  /** Shown after answering, right or wrong. */
  explanation: string;
  xp: number;
}

export interface MultipleChoiceOption {
  id: string;
  text: string;
  /**
   * For incorrect options only: the plausible confusion that would lead a
   * learner to pick it. Required on every distractor; forbidden on the
   * correct option (validator-enforced).
   */
  misconception?: string;
}

export interface MultipleChoicePage extends QuestionPageBase {
  type: "multiple_choice";
  /** Optional scenario framing (absorbs the old scenario_decision activity). */
  context?: string;
  options: MultipleChoiceOption[];
  correctOptionId: string;
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface MatchingPage extends QuestionPageBase {
  type: "matching";
  /** 3-6 pairs; the UI shuffles the right column. */
  pairs: MatchingPair[];
}

export interface TypingPage extends QuestionPageBase {
  type: "typing";
  /** Matched case- and whitespace-insensitively. */
  acceptableAnswers: string[];
  hint?: string;
}

export interface OpenEndedRubric {
  keyPoints: string[];
  commonMisconceptions: string[];
  sampleAnswer: string;
}

export interface OpenEndedPage extends QuestionPageBase {
  type: "open_ended";
  /** Fixed at generation time; applied by the grading model at answer time. */
  rubric: OpenEndedRubric;
}

export type ContentPage = TextPage | DiagramPage | VideoPage;
export type QuestionPage = MultipleChoicePage | MatchingPage | TypingPage | OpenEndedPage;
export type Page = ContentPage | QuestionPage;
export type PageType = Page["type"];

const CONTENT_PAGE_TYPES: ReadonlySet<string> = new Set(["text", "diagram", "video"]);

export function isContentPage(page: Page): page is ContentPage {
  return CONTENT_PAGE_TYPES.has(page.type);
}

export function isQuestionPage(page: Page): page is QuestionPage {
  return !CONTENT_PAGE_TYPES.has(page.type);
}

// ---------- Course structure ----------

export interface Lesson {
  id: string;
  title: string;
  description: string;
  skillNodeId: string;
  estimatedMinutes: number;
  pages: Page[];
}

export interface SkillNode {
  id: string;
  title: string;
  description: string;
  /** Skill nodes that must be completed before this one unlocks. */
  prereqIds: string[];
  lessonIds: string[];
  /** Layout hint for the branching tech-tree (column = depth, row = lane). */
  position: { col: number; row: number };
}

export type CourseSource = "starter" | "custom" | "shared";
export type CourseStatus = "active" | "completed" | "archived";

export interface Cohort {
  id: string;
  name: string;
  memberCount: number;
}

/** Immutable course content — what the generation pipeline produces. */
export interface CourseContent {
  /** Stable content identity; shared across copies and cohort members. */
  contentId: string;
  schemaVersion: 2;
  title: string;
  description: string;
  /** The real-world outcome this course targets. */
  outcome: string;
  tags: string[];
  estimatedHours: number;
  /** Flat list of concepts the course teaches — referenced by teaches/tests. */
  concepts: Concept[];
  skillNodes: SkillNode[];
  lessons: Lesson[];
}

/** A course instance in a user's library. */
export interface Course extends CourseContent {
  /** Unique per library copy — duplicating a course mints a new id. */
  id: string;
  source: CourseSource;
  status: CourseStatus;
  /** Present when the user joined this course as part of a cohort. */
  cohort?: Cohort;
}

// ---------- Progress & gamification ----------

export type PageOutcome = "correct" | "incorrect";

export interface LessonProgress {
  lessonId: string;
  completedPageIds: string[];
  completed: boolean;
}

export interface CourseProgress {
  courseId: string;
  /** 0-100 mastery per skill node id, driven by question-page outcomes. */
  masteryByNode: Record<string, number>;
  lessonProgress: Record<string, LessonProgress>;
  xpEarned: number;
  startedAt: string; // ISO datetime
  lastActivityAt: string | null;
  nextReviewAt: string | null;
}

export interface UserStats {
  totalXp: number;
  xpToday: number;
  currentStreak: number;
  longestStreak: number;
  /** ISO date (YYYY-MM-DD) of the most recent study day. */
  lastStudyDate: string | null;
}

/** Result of completing one page — what the UI celebrates. */
export interface PageCompletionResult {
  outcome: PageOutcome;
  xpAwarded: number;
  /** New mastery value (0-100) for the lesson's skill node. */
  nodeMastery: number;
  /** True if this completion extended the streak (first page today). */
  streakExtended: boolean;
  currentStreak: number;
  lessonCompleted: boolean;
  courseCompleted: boolean;
}

// ---------- Open-ended grading ----------

export type GradeVerdict = "pass" | "partial" | "retry";

export interface OpenEndedGrade {
  verdict: GradeVerdict;
  feedback: string;
  missedKeyPoints: string[];
}

/** Server response for a grading request; fallback means self-assessment UI. */
export type GradeResponse =
  | { ok: true; grade: OpenEndedGrade }
  | { ok: false; fallback: true };

// ---------- Course generation ----------

export interface WizardAnswers {
  outcome: string;
  knowledge: string;
  time: string;
  style: string;
  /** File names only — uploads are accepted and discarded this slice. */
  sources: string[];
}

export type GenerationJobStatus =
  | "queued"
  | "outlining"
  | "generating"
  | "validating"
  | "failed"
  | "done";

/** What the wizard polls. `content` is populated once status is "done". */
export interface GenerationJobView {
  id: string;
  status: GenerationJobStatus;
  error: string | null;
  content: CourseContent | null;
}
```

- [ ] **Step 2: Create `lib/test-fixtures/course.ts`** — a compact valid v2 course used by validation, data-layer, and component tests:

```ts
// A compact, valid schema-v2 course exercising every rendered page type and
// the cross-node teach-before-test path (l2 tests concepts taught in n1,
// which is a prereq of n2). Tests deep-clone and mutate it to produce
// invalid variants.

import type { CourseContent } from "@/lib/types";

export const fixtureCourse: CourseContent = {
  contentId: "content-fixture",
  schemaVersion: 2,
  title: "Fixture Course",
  description: "A tiny course used by tests.",
  outcome: "Exercise every page type and pedagogy rule.",
  tags: ["testing"],
  estimatedHours: 1,
  concepts: [
    { id: "c-image", name: "Container images" },
    { id: "c-layer", name: "Image layers" },
    { id: "c-registry", name: "Registries" },
  ],
  skillNodes: [
    {
      id: "n1",
      title: "Images",
      description: "Image basics",
      prereqIds: [],
      lessonIds: ["l1"],
      position: { col: 0, row: 0 },
    },
    {
      id: "n2",
      title: "Registries",
      description: "Sharing images",
      prereqIds: ["n1"],
      lessonIds: ["l2"],
      position: { col: 1, row: 0 },
    },
  ],
  lessons: [
    {
      id: "l1",
      title: "Image basics",
      description: "What images are",
      skillNodeId: "n1",
      estimatedMinutes: 10,
      pages: [
        {
          type: "text",
          id: "l1-p1",
          title: "What is an image?",
          body: "An **image** is a template.\n\nIt is built from a `Dockerfile`.",
          teaches: ["c-image"],
        },
        {
          type: "diagram",
          id: "l1-p2",
          title: "Layers",
          intro: "Images stack layers.",
          mermaid: "flowchart TD\n  A[Base layer] --> B[App layer]",
          caption: "Each build instruction adds a layer.",
          teaches: ["c-layer"],
        },
        {
          type: "multiple_choice",
          id: "l1-p3",
          prompt: "What is a container image?",
          tests: ["c-image"],
          explanation: "An image is an immutable template.",
          xp: 10,
          options: [
            { id: "o1", text: "An immutable template for containers" },
            { id: "o2", text: "A running process", misconception: "Confuses images with containers" },
            { id: "o3", text: "A virtual machine snapshot", misconception: "Confuses containers with VMs" },
          ],
          correctOptionId: "o1",
        },
        {
          type: "typing",
          id: "l1-p4",
          prompt: "What is each step of an image build called?",
          tests: ["c-layer"],
          explanation: "Each build step adds a layer.",
          xp: 10,
          acceptableAnswers: ["layer", "a layer"],
          hint: "Images are stacked from these.",
        },
      ],
    },
    {
      id: "l2",
      title: "Registries",
      description: "Sharing images",
      skillNodeId: "n2",
      estimatedMinutes: 10,
      pages: [
        {
          type: "text",
          id: "l2-p1",
          title: "Registries",
          body: "A **registry** stores and distributes images.",
          teaches: ["c-registry"],
        },
        {
          type: "text",
          id: "l2-p2",
          title: "Recap",
          body: "Push images up, pull them down.",
          teaches: [],
        },
        {
          type: "matching",
          id: "l2-p3",
          prompt: "Match each term to its role.",
          tests: ["c-image", "c-layer", "c-registry"],
          explanation: "Images are stacked from layers and live in registries.",
          xp: 15,
          pairs: [
            { id: "m1", left: "Image", right: "Immutable template" },
            { id: "m2", left: "Registry", right: "Stores images" },
            { id: "m3", left: "Layer", right: "One build step" },
          ],
        },
        {
          type: "open_ended",
          id: "l2-p4",
          prompt: "Explain how a teammate gets your image onto their machine.",
          tests: ["c-registry"],
          explanation: "See the sample answer.",
          xp: 20,
          rubric: {
            keyPoints: [
              "Push the image to a registry",
              "The teammate pulls it from the registry by name and tag",
            ],
            commonMisconceptions: [
              "Emailing the Dockerfile is the same as sharing the built image",
            ],
            sampleAnswer:
              "Push the image to a shared registry; the teammate pulls it by name and tag.",
          },
        },
      ],
    },
  ],
};
```

- [ ] **Step 3: Sanity-check it compiles**

Run: `npx tsc --noEmit lib/types/index.ts lib/test-fixtures/course.ts 2>&1 | head -20`
Expected: errors ONLY from *other* files if any are pulled in (there shouldn't be — the fixture imports only types). If these two files themselves error, fix before continuing.

- [ ] **Step 4: Commit**

```bash
git add lib/types/index.ts lib/test-fixtures/course.ts
git commit -m "feat: schema-v2 domain types (pages, concepts, jobs) + test fixture course"
```

---

### Task 2: Pedagogy checks + validation schema v2 (TDD)

**Files:**
- Create: `lib/validation/pedagogy.ts`
- Rewrite: `lib/validation/course-content.ts`
- Rewrite: `lib/validation/course-content.test.ts`

- [ ] **Step 1: Write the failing tests** — replace `lib/validation/course-content.test.ts` with:

```ts
// Validation tests for schema v2: structural checks retained from v1
// (prereq resolution, DAG, correctOptionId) plus the new referential and
// pedagogy checks. Each test deep-clones the fixture and breaks one rule.

import { describe, expect, it } from "vitest";
import type { CourseContent, Lesson, MultipleChoicePage } from "@/lib/types";
import { fixtureCourse } from "@/lib/test-fixtures/course";
import { validateCourseContent } from "./course-content";

function clone(): CourseContent {
  return structuredClone(fixtureCourse);
}

function expectInvalid(content: CourseContent, messagePart: string) {
  expect(() => validateCourseContent(content)).toThrowError(
    expect.objectContaining({
      issues: expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining(messagePart) }),
      ]),
    }),
  );
}

describe("structural checks (retained from v1)", () => {
  it("accepts the fixture course", () => {
    expect(validateCourseContent(fixtureCourse)).toEqual(fixtureCourse);
  });

  it("accepts a video page (schema-only this slice)", () => {
    const c = clone();
    c.lessons[0].pages.splice(2, 0, {
      type: "video",
      id: "l1-v1",
      title: "Watch: layers",
      searchQuery: "docker image layers explained",
      shouldCover: "How instructions map to layers",
      videoId: null,
      teaches: [],
    });
    expect(() => validateCourseContent(c)).not.toThrow();
  });

  it("rejects an unresolved prereq id", () => {
    const c = clone();
    c.skillNodes[1].prereqIds = ["ghost"];
    expectInvalid(c, 'prereq "ghost" matches no skill node');
  });

  it("rejects a prereq cycle", () => {
    const c = clone();
    c.skillNodes[0].prereqIds = ["n2"];
    expectInvalid(c, "cycle");
  });

  it("rejects a lesson pointing at an unknown skill node", () => {
    const c = clone();
    c.lessons[0].skillNodeId = "ghost";
    expectInvalid(c, 'unknown skill node "ghost"');
  });

  it("rejects a correctOptionId that matches no option", () => {
    const c = clone();
    (c.lessons[0].pages[2] as MultipleChoicePage).correctOptionId = "ghost";
    expectInvalid(c, 'correctOptionId "ghost" matches no option');
  });

  it("rejects a wrong schemaVersion", () => {
    const c = clone() as unknown as { schemaVersion: number };
    c.schemaVersion = 1;
    expect(() => validateCourseContent(c as unknown as CourseContent)).toThrow();
  });
});

describe("concept resolution", () => {
  it("rejects a question testing an unknown concept", () => {
    const c = clone();
    (c.lessons[0].pages[2] as MultipleChoicePage).tests = ["c-ghost"];
    expectInvalid(c, 'unknown concept "c-ghost"');
  });

  it("rejects a content page teaching an unknown concept", () => {
    const c = clone();
    const page = c.lessons[0].pages[0];
    if (page.type === "text") page.teaches = ["c-ghost"];
    expectInvalid(c, 'unknown concept "c-ghost"');
  });
});

describe("teach-before-test", () => {
  it("rejects a question that tests a concept taught later in the same lesson", () => {
    const c = clone();
    // Move the diagram (teaches c-layer) after the typing question (tests c-layer).
    const l1 = c.lessons[0];
    const [diagram] = l1.pages.splice(1, 1);
    l1.pages.push(diagram);
    expectInvalid(c, 'tests concept "c-layer" before it is taught');
  });

  it("accepts cross-lesson testing within the same node", () => {
    const c = clone();
    // Add a second n1 lesson that tests c-image (taught in l1) without re-teaching it.
    const extra: Lesson = {
      id: "l1b",
      title: "Images, applied",
      description: "Practice",
      skillNodeId: "n1",
      estimatedMinutes: 5,
      pages: [
        { type: "text", id: "l1b-p1", title: "Recap", body: "Quick recap.", teaches: [] },
        { type: "text", id: "l1b-p2", title: "More", body: "More recap.", teaches: [] },
        {
          type: "multiple_choice",
          id: "l1b-p3",
          prompt: "Images are…",
          tests: ["c-image"],
          explanation: "Immutable templates.",
          xp: 10,
          options: [
            { id: "a", text: "Immutable templates" },
            { id: "b", text: "Mutable processes", misconception: "Confuses images with containers" },
          ],
          correctOptionId: "a",
        },
      ],
    };
    c.lessons.splice(1, 0, extra);
    c.skillNodes[0].lessonIds.push("l1b");
    expect(() => validateCourseContent(c)).not.toThrow();
  });

  it("accepts testing concepts taught in a (transitive) prereq node", () => {
    // The fixture itself does this: l2-p3 tests c-image and c-layer from n1.
    expect(() => validateCourseContent(fixtureCourse)).not.toThrow();
  });

  it("rejects testing a concept from a non-prereq node", () => {
    const c = clone();
    // Break the prereq edge: n2 no longer requires n1, so l2 may not test n1 concepts.
    c.skillNodes[1].prereqIds = [];
    expectInvalid(c, 'tests concept "c-image" before it is taught');
  });
});

describe("coverage and teaching minimums", () => {
  it("rejects a concept that no content page teaches", () => {
    const c = clone();
    c.concepts.push({ id: "c-orphan", name: "Never taught" });
    expectInvalid(c, 'concept "c-orphan" is never taught');
  });

  it("rejects a lesson whose first page is a question", () => {
    const c = clone();
    const l1 = c.lessons[0];
    const [question] = l1.pages.splice(2, 1);
    l1.pages.unshift(question);
    expectInvalid(c, "question page before any content page");
  });

  it("rejects a lesson with fewer than 2 content pages", () => {
    const c = clone();
    // Remove l2's second text page → only 1 content page remains.
    c.lessons[1].pages.splice(1, 1);
    expectInvalid(c, "minimum is 2");
  });
});

describe("distractor shape", () => {
  it("rejects an incorrect option without a misconception", () => {
    const c = clone();
    const mc = c.lessons[0].pages[2] as MultipleChoicePage;
    delete mc.options[1].misconception;
    expectInvalid(c, 'incorrect option "o2" is missing a misconception');
  });

  it("rejects a correct option carrying a misconception", () => {
    const c = clone();
    const mc = c.lessons[0].pages[2] as MultipleChoicePage;
    mc.options[0].misconception = "should not be here";
    expectInvalid(c, 'correct option "o1" must not have a misconception');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/validation/course-content.test.ts`
Expected: FAIL (schema still validates v1 shapes / `pedagogy.ts` doesn't exist).

- [ ] **Step 3: Create `lib/validation/pedagogy.ts`**:

```ts
// Pure pedagogy checks shared by the Zod validator (course-level) and the
// generation pipeline (per-lesson, during the repair loop). Kept free of Zod
// so the pipeline can turn issues straight into repair-prompt text.

import {
  isContentPage,
  isQuestionPage,
  type Lesson,
  type SkillNode,
} from "@/lib/types";

export interface PedagogyIssue {
  /** Path relative to the object checked (lesson for lesson checks). */
  path: (string | number)[];
  message: string;
}

/** Concept ids taught by a lesson's content pages. */
export function conceptsTaughtIn(lesson: Lesson): Set<string> {
  const taught = new Set<string>();
  for (const page of lesson.pages) {
    if (isContentPage(page)) for (const id of page.teaches) taught.add(id);
  }
  return taught;
}

/**
 * Checks local to one lesson, given the concepts available before it starts:
 * unknown concept refs, teach-before-test within the lesson, question-first,
 * content-page minimum, MCQ option resolution and distractor shape.
 */
export function lessonPedagogyIssues(
  lesson: Lesson,
  availableBefore: ReadonlySet<string>,
  allConceptIds: ReadonlySet<string>,
): PedagogyIssue[] {
  const issues: PedagogyIssue[] = [];
  const taughtSoFar = new Set(availableBefore);
  let contentPages = 0;
  let flaggedQuestionFirst = false;

  lesson.pages.forEach((page, i) => {
    const refField = isContentPage(page) ? "teaches" : "tests";
    const refs = isContentPage(page) ? page.teaches : page.tests;
    refs.forEach((conceptId, j) => {
      if (!allConceptIds.has(conceptId)) {
        issues.push({
          path: ["pages", i, refField, j],
          message: `unknown concept "${conceptId}"`,
        });
      }
    });

    if (isContentPage(page)) {
      contentPages++;
      for (const id of page.teaches) taughtSoFar.add(id);
      return;
    }

    if (contentPages === 0 && !flaggedQuestionFirst) {
      flaggedQuestionFirst = true;
      issues.push({
        path: ["pages", i],
        message: `lesson "${lesson.id}" has a question page before any content page`,
      });
    }
    page.tests.forEach((conceptId, j) => {
      if (allConceptIds.has(conceptId) && !taughtSoFar.has(conceptId)) {
        issues.push({
          path: ["pages", i, "tests", j],
          message: `question "${page.id}" tests concept "${conceptId}" before it is taught`,
        });
      }
    });

    if (page.type === "multiple_choice") {
      if (!page.options.some((o) => o.id === page.correctOptionId)) {
        issues.push({
          path: ["pages", i, "correctOptionId"],
          message: `correctOptionId "${page.correctOptionId}" matches no option`,
        });
      }
      page.options.forEach((option, j) => {
        const isCorrect = option.id === page.correctOptionId;
        if (!isCorrect && !option.misconception?.trim()) {
          issues.push({
            path: ["pages", i, "options", j],
            message: `incorrect option "${option.id}" is missing a misconception`,
          });
        }
        if (isCorrect && option.misconception !== undefined) {
          issues.push({
            path: ["pages", i, "options", j],
            message: `correct option "${option.id}" must not have a misconception`,
          });
        }
      });
    }
  });

  if (contentPages < 2) {
    issues.push({
      path: ["pages"],
      message: `lesson "${lesson.id}" has ${contentPages} content page(s); minimum is 2`,
    });
  }
  return issues;
}

/**
 * For each lesson (in course order), the concept ids available before it
 * starts: concepts from earlier lessons of the same skill node plus concepts
 * from ALL lessons of (transitively) prerequisite nodes.
 */
export function availableConceptsByLesson(
  skillNodes: Pick<SkillNode, "id" | "prereqIds">[],
  lessons: { skillNodeId: string; concepts: ReadonlySet<string> }[],
): Set<string>[] {
  const prereqsOf = new Map(skillNodes.map((n) => [n.id, n.prereqIds]));

  const transitiveCache = new Map<string, Set<string>>();
  function transitivePrereqs(nodeId: string): Set<string> {
    const cached = transitiveCache.get(nodeId);
    if (cached) return cached;
    const result = new Set<string>();
    const stack = [...(prereqsOf.get(nodeId) ?? [])];
    while (stack.length > 0) {
      const next = stack.pop()!;
      if (result.has(next)) continue; // also guards against cycles
      result.add(next);
      stack.push(...(prereqsOf.get(next) ?? []));
    }
    transitiveCache.set(nodeId, result);
    return result;
  }

  const conceptsByNode = new Map<string, Set<string>>();
  for (const lesson of lessons) {
    const set = conceptsByNode.get(lesson.skillNodeId) ?? new Set<string>();
    for (const id of lesson.concepts) set.add(id);
    conceptsByNode.set(lesson.skillNodeId, set);
  }

  const earlierInNode = new Map<string, Set<string>>();
  return lessons.map((lesson) => {
    const available = new Set<string>();
    for (const nodeId of transitivePrereqs(lesson.skillNodeId)) {
      for (const id of conceptsByNode.get(nodeId) ?? []) available.add(id);
    }
    for (const id of earlierInNode.get(lesson.skillNodeId) ?? []) available.add(id);

    const seen = earlierInNode.get(lesson.skillNodeId) ?? new Set<string>();
    for (const id of lesson.concepts) seen.add(id);
    earlierInNode.set(lesson.skillNodeId, seen);
    return available;
  });
}

/**
 * Course-level pedagogy checks: per-lesson checks with cross-lesson/prereq
 * availability, plus coverage (every concept taught somewhere).
 * Assumes the prereq graph is already known to be a DAG.
 */
export function coursePedagogyIssues(content: {
  concepts: { id: string }[];
  skillNodes: Pick<SkillNode, "id" | "prereqIds">[];
  lessons: Lesson[];
}): PedagogyIssue[] {
  const issues: PedagogyIssue[] = [];
  const allConceptIds = new Set(content.concepts.map((c) => c.id));

  const available = availableConceptsByLesson(
    content.skillNodes,
    content.lessons.map((l) => ({ skillNodeId: l.skillNodeId, concepts: conceptsTaughtIn(l) })),
  );
  content.lessons.forEach((lesson, li) => {
    for (const issue of lessonPedagogyIssues(lesson, available[li], allConceptIds)) {
      issues.push({ path: ["lessons", li, ...issue.path], message: issue.message });
    }
  });

  const taughtAnywhere = new Set<string>();
  for (const lesson of content.lessons) {
    for (const id of conceptsTaughtIn(lesson)) taughtAnywhere.add(id);
  }
  content.concepts.forEach((concept, i) => {
    if (!taughtAnywhere.has(concept.id)) {
      issues.push({
        path: ["concepts", i],
        message: `concept "${concept.id}" is never taught by any content page`,
      });
    }
  });
  return issues;
}
```

- [ ] **Step 4: Rewrite `lib/validation/course-content.ts`**:

```ts
// Zod schema for the controlled-JSON course content, schema v2. Applied to
// every course_content write (seed script, addCourseToLibrary, generation
// pipeline). Beyond shape it enforces referential integrity (prereq ids
// resolve and form a DAG, lessons point at real skill nodes, concept refs
// resolve) and the pedagogy rules (teach-before-test, coverage, teaching
// minimums, distractor shape) via lib/validation/pedagogy.ts.

import { z } from "zod";
import type { CourseContent } from "@/lib/types";
import { coursePedagogyIssues } from "./pedagogy";

const conceptSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

const contentPageBase = {
  id: z.string().min(1),
  title: z.string().min(1),
  teaches: z.array(z.string().min(1)),
};

const textPage = z.object({
  type: z.literal("text"),
  ...contentPageBase,
  body: z.string().min(1),
});

const diagramPage = z.object({
  type: z.literal("diagram"),
  ...contentPageBase,
  intro: z.string().optional(),
  mermaid: z.string().min(1),
  caption: z.string().min(1),
});

const videoPage = z.object({
  type: z.literal("video"),
  ...contentPageBase,
  searchQuery: z.string().min(1),
  shouldCover: z.string().min(1),
  videoId: z.string().nullable(),
});

const questionPageBase = {
  id: z.string().min(1),
  prompt: z.string().min(1),
  tests: z.array(z.string().min(1)).min(1),
  explanation: z.string(),
  xp: z.number().int().positive(),
};

const multipleChoiceOption = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  misconception: z.string().min(1).optional(),
});

const multipleChoicePage = z.object({
  type: z.literal("multiple_choice"),
  ...questionPageBase,
  context: z.string().optional(),
  options: z.array(multipleChoiceOption).min(2).max(5),
  correctOptionId: z.string().min(1),
});

const matchingPage = z.object({
  type: z.literal("matching"),
  ...questionPageBase,
  pairs: z
    .array(z.object({ id: z.string().min(1), left: z.string().min(1), right: z.string().min(1) }))
    .min(3)
    .max(6),
});

const typingPage = z.object({
  type: z.literal("typing"),
  ...questionPageBase,
  acceptableAnswers: z.array(z.string().min(1)).min(1),
  hint: z.string().optional(),
});

const openEndedPage = z.object({
  type: z.literal("open_ended"),
  ...questionPageBase,
  rubric: z.object({
    keyPoints: z.array(z.string().min(1)).min(1),
    commonMisconceptions: z.array(z.string().min(1)),
    sampleAnswer: z.string().min(1),
  }),
});

const page = z.discriminatedUnion("type", [
  textPage,
  diagramPage,
  videoPage,
  multipleChoicePage,
  matchingPage,
  typingPage,
  openEndedPage,
]);

const lesson = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  skillNodeId: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
  pages: z.array(page).min(1),
});

const skillNode = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  prereqIds: z.array(z.string().min(1)),
  lessonIds: z.array(z.string().min(1)),
  position: z.object({ col: z.number().int(), row: z.number().int() }),
});

/** True if the prereq graph has a cycle (DFS three-color). */
function hasCycle(nodes: { id: string; prereqIds: string[] }[]): boolean {
  const edges = new Map(nodes.map((n) => [n.id, n.prereqIds]));
  const state = new Map<string, "visiting" | "done">();
  const visit = (id: string): boolean => {
    const s = state.get(id);
    if (s === "visiting") return true;
    if (s === "done") return false;
    state.set(id, "visiting");
    for (const prereq of edges.get(id) ?? []) {
      if (visit(prereq)) return true;
    }
    state.set(id, "done");
    return false;
  };
  return nodes.some((n) => visit(n.id));
}

export const courseContentSchema: z.ZodType<CourseContent> = z
  .object({
    contentId: z.string().min(1),
    schemaVersion: z.literal(2),
    title: z.string().min(1),
    description: z.string(),
    outcome: z.string(),
    tags: z.array(z.string().min(1)),
    estimatedHours: z.number().int().positive(),
    concepts: z.array(conceptSchema).min(1),
    skillNodes: z.array(skillNode).min(1),
    lessons: z.array(lesson).min(1),
  })
  .superRefine((content, ctx) => {
    const nodeIds = new Set(content.skillNodes.map((n) => n.id));

    content.skillNodes.forEach((node, i) => {
      node.prereqIds.forEach((prereqId, j) => {
        if (!nodeIds.has(prereqId)) {
          ctx.addIssue({
            code: "custom",
            path: ["skillNodes", i, "prereqIds", j],
            message: `prereq "${prereqId}" matches no skill node`,
          });
        }
      });
    });

    if (hasCycle(content.skillNodes)) {
      ctx.addIssue({
        code: "custom",
        path: ["skillNodes"],
        message: "prereq graph contains a cycle",
      });
      return; // pedagogy checks assume a DAG
    }

    let badNodeRef = false;
    content.lessons.forEach((l, i) => {
      if (!nodeIds.has(l.skillNodeId)) {
        badNodeRef = true;
        ctx.addIssue({
          code: "custom",
          path: ["lessons", i, "skillNodeId"],
          message: `lesson "${l.id}" points at unknown skill node "${l.skillNodeId}"`,
        });
      }
    });
    if (badNodeRef) return;

    for (const issue of coursePedagogyIssues(content)) {
      ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
    }
  });

/** Parse unknown input into CourseContent; throws ZodError on failure. */
export function validateCourseContent(input: unknown): CourseContent {
  return courseContentSchema.parse(input);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/validation/course-content.test.ts`
Expected: PASS (all ~17 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/validation/pedagogy.ts lib/validation/course-content.ts lib/validation/course-content.test.ts
git commit -m "feat: schema-v2 validation — concept resolution, teach-before-test, coverage, minimums, distractor shape"
```

---

### Task 3: Database schema, migrations, data layer, and server actions

**Files:**
- Modify: `lib/db/schema.ts`
- Create: two migrations under `drizzle/` (via `drizzle-kit generate`, run twice — see below)
- Modify: `lib/data/core.ts`
- Rewrite: `lib/data/core.test.ts`
- Modify: `lib/data/actions.ts`, `lib/data/derive.ts`, `lib/store/app-store.ts`
- Modify (temporarily): `lib/data/seed-content.ts`

> **Why two `drizzle-kit generate` runs:** dropping `activity_completions` and adding `page_completions` in one run makes drizzle-kit ask interactively "created or renamed?", which can't be answered from a non-interactive shell. Splitting into a pure-delete run then a pure-add run avoids all prompts.

- [ ] **Step 1: Migration A — drop the old completions table.** In `lib/db/schema.ts`, delete the entire `activityCompletions` table definition and the `ActivityOutcome` import. Then run:

```bash
npx drizzle-kit generate --name drop-activity-completions
```

Expected: a new file `drizzle/0001_drop-activity-completions.sql` containing only `DROP TABLE "activity_completions" CASCADE;` (or similar). No interactive prompt.

- [ ] **Step 2: Hand-append the data reset to Migration A.** Old-format content is replaced wholesale and accounts are fresh from slice 1, so progress reset is by design (spec §5). Append to the generated SQL file (order matters — `courses` references both `cohorts` and `course_content`):

```sql
--> statement-breakpoint
DELETE FROM "courses";--> statement-breakpoint
DELETE FROM "cohorts";--> statement-breakpoint
DELETE FROM "course_content";
```

- [ ] **Step 3: Migration B — new tables and columns.** Update `lib/db/schema.ts`:

Change the imports from `@/lib/types` to:

```ts
import type {
  Concept,
  CourseSource,
  CourseStatus,
  GenerationJobStatus,
  Lesson,
  PageOutcome,
  SkillNode,
  WizardAnswers,
} from "@/lib/types";
```

In the `courseContent` table, add two columns after `lessons`:

```ts
  schemaVersion: integer("schema_version").default(2).notNull(),
  concepts: jsonb("concepts").$type<Concept[]>().notNull(),
```

Where `activityCompletions` used to be, add:

```ts
/**
 * One row per completed page. The composite primary key makes double
 * completion — and therefore double XP — impossible at the DB level: the
 * insert uses ON CONFLICT DO NOTHING and side effects only run when a row
 * was actually inserted.
 */
export const pageCompletions = pgTable(
  "page_completions",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    pageId: text("page_id").notNull(),
    lessonId: text("lesson_id").notNull(),
    outcome: text("outcome").$type<PageOutcome>().notNull(),
    xpAwarded: integer("xp_awarded").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.courseId, table.pageId] })],
);

/** One row per wizard submission; the wizard polls status until done/failed. */
export const generationJobs = pgTable(
  "generation_jobs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    answers: jsonb("answers").$type<WizardAnswers>().notNull(),
    status: text("status").$type<GenerationJobStatus>().default("queued").notNull(),
    error: text("error"),
    contentId: text("content_id").references(() => courseContent.contentId),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("generation_jobs_user_id_idx").on(table.userId)],
);
```

Then run:

```bash
npx drizzle-kit generate --name page-based-lessons
```

Expected: `drizzle/0002_page-based-lessons.sql` with `CREATE TABLE page_completions`, `CREATE TABLE generation_jobs`, and two `ALTER TABLE course_content ADD COLUMN` statements. No prompt. (`concepts` is NOT NULL without default — fine, the table is empty after Migration A.)

- [ ] **Step 4: Apply migrations to the dev database**

Run: `npm run db:migrate`
Expected: exits 0. (PGlite tests apply the same folder automatically.)

- [ ] **Step 5: Update `lib/data/core.ts`.** Changes, keeping everything else exactly as-is:

1. Imports: replace `ActivityCompletionResult, ActivityOutcome` with `PageCompletionResult, PageOutcome`, and add `isQuestionPage` (a value import from `@/lib/types`).
2. `type CompletionRow = typeof schema.pageCompletions.$inferSelect;`
3. `toCourseContent` — add the two new fields:

```ts
function toCourseContent(row: ContentRow): CourseContent {
  return {
    contentId: row.contentId,
    schemaVersion: 2,
    title: row.title,
    description: row.description,
    outcome: row.outcome,
    tags: row.tags,
    estimatedHours: row.estimatedHours,
    concepts: row.concepts,
    skillNodes: row.skillNodes,
    lessons: row.lessons,
  };
}
```

Also add `export` to `toCourseContent` (the jobs module reuses it in Task 8).

4. `toProgress` — pages instead of activities:

```ts
  const byLesson = new Map<string, string[]>();
  for (const c of completions) {
    const ids = byLesson.get(c.lessonId) ?? [];
    ids.push(c.pageId);
    byLesson.set(c.lessonId, ids);
  }
  const lessonProgress: Record<string, LessonProgress> = {};
  for (const lesson of contentRow.lessons) {
    const completedPageIds = byLesson.get(lesson.id) ?? [];
    lessonProgress[lesson.id] = {
      lessonId: lesson.id,
      completedPageIds,
      completed:
        lesson.pages.length > 0 && completedPageIds.length >= lesson.pages.length,
    };
  }
```

5. All reads of `schema.activityCompletions` become `schema.pageCompletions` (in `getCourseProgress` and `getAllProgress`).
6. `addCourseToLibrary` — the insert gains `schemaVersion: 2, concepts: validated.concepts` alongside the existing fields.
7. Replace `completeActivity` with `completePage` (full function):

```ts
/**
 * Record a page completion and run the core-loop bookkeeping in one
 * transaction: completion insert (ON CONFLICT DO NOTHING) → XP → mastery →
 * streak → course auto-completion. A conflicting insert means the page was
 * already completed: no XP, no stat changes, at the database level.
 * Content pages award no XP but count toward lesson completion and streaks.
 */
export async function completePage(
  db: Db,
  userId: string,
  courseId: string,
  lessonId: string,
  pageId: string,
  outcome: PageOutcome,
): Promise<PageCompletionResult | null> {
  return db.transaction(async (tx) => {
    const found = await loadOwnedCourse(tx, userId, courseId);
    if (!found) return null;
    const { courseRow, contentRow } = found;
    const lesson = contentRow.lessons.find((l) => l.id === lessonId);
    const page = lesson?.pages.find((p) => p.id === pageId);
    if (!lesson || !page) return null;

    const xp = isQuestionPage(page)
      ? outcome === "correct"
        ? page.xp
        : Math.round(page.xp / 2)
      : 0;
    const inserted = await tx
      .insert(schema.pageCompletions)
      .values({ courseId, pageId, lessonId, outcome, xpAwarded: xp })
      .onConflictDoNothing()
      .returning();
    const isNew = inserted.length > 0;
    const xpAwarded = isNew ? xp : 0;

    const completions = await tx
      .select()
      .from(schema.pageCompletions)
      .where(eq(schema.pageCompletions.courseId, courseId));
    const completedIds = new Set(completions.map((c) => c.pageId));
    const correctIds = new Set(
      completions.filter((c) => c.outcome === "correct").map((c) => c.pageId),
    );

    // Mastery: fraction of the node's question pages answered correctly.
    // (Open-ended "pass" arrives here as "correct"; "partial" as "incorrect".)
    const nodeQuestionPages = contentRow.lessons
      .filter((l) => l.skillNodeId === lesson.skillNodeId)
      .flatMap((l) => l.pages)
      .filter(isQuestionPage);
    const nodeMastery =
      nodeQuestionPages.length === 0
        ? 0
        : Math.round(
            (100 * nodeQuestionPages.filter((p) => correctIds.has(p.id)).length) /
              nodeQuestionPages.length,
          );

    const [progressRow] = await tx
      .select()
      .from(schema.courseProgress)
      .where(eq(schema.courseProgress.courseId, courseId))
      .for("update");

    let streakExtended = false;
    let currentStreak = 0;

    if (isNew) {
      const masteryByNode = { ...(progressRow?.masteryByNode ?? {}) };
      masteryByNode[lesson.skillNodeId] = nodeMastery;
      await tx
        .update(schema.courseProgress)
        .set({
          masteryByNode,
          xpEarned: (progressRow?.xpEarned ?? 0) + xpAwarded,
          lastActivityAt: new Date(),
          // Next spaced review: 2 days out whenever something was studied.
          nextReviewAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        })
        .where(eq(schema.courseProgress.courseId, courseId));

      const [stats] = await tx
        .select()
        .from(schema.userStats)
        .where(eq(schema.userStats.userId, userId))
        .for("update");
      const today = utcDay();
      let { currentStreak: streak, longestStreak, xpToday } = stats;
      if (stats.lastStudyDate !== today) {
        // First completion of a new UTC day.
        streak = stats.lastStudyDate === utcDay(-1) ? streak + 1 : 1;
        longestStreak = Math.max(longestStreak, streak);
        xpToday = 0;
        streakExtended = true;
      }
      await tx
        .update(schema.userStats)
        .set({
          totalXp: stats.totalXp + xpAwarded,
          xpToday: xpToday + xpAwarded,
          currentStreak: streak,
          longestStreak,
          lastStudyDate: today,
        })
        .where(eq(schema.userStats.userId, userId));
      currentStreak = streak;
    } else {
      const [stats] = await tx
        .select()
        .from(schema.userStats)
        .where(eq(schema.userStats.userId, userId));
      currentStreak = stats?.currentStreak ?? 0;
    }

    const lessonCompleted = lesson.pages.every((p) => completedIds.has(p.id));
    const allPages = contentRow.lessons.flatMap((l) => l.pages);
    const courseCompleted = allPages.every((p) => completedIds.has(p.id));
    if (courseCompleted && courseRow.status === "active") {
      await tx
        .update(schema.courses)
        .set({ status: "completed" })
        .where(eq(schema.courses.id, courseId));
    }

    return {
      outcome,
      xpAwarded,
      nodeMastery,
      streakExtended,
      currentStreak,
      lessonCompleted,
      courseCompleted,
    };
  });
}
```

- [ ] **Step 6: Update `lib/data/derive.ts`** (pages instead of activities):

```ts
/** Overall course completion: fraction of all pages completed, 0-100. */
export function computeCourseCompletion(course: Course, progress: CourseProgress | null): number {
  const total = course.lessons.reduce((n, l) => n + l.pages.length, 0);
  if (total === 0 || !progress) return 0;
  const done = Object.values(progress.lessonProgress).reduce(
    (n, lp) => n + lp.completedPageIds.length,
    0,
  );
  return Math.round((100 * done) / total);
}
```
(`computeAverageMastery` is unchanged.)

- [ ] **Step 7: Update `lib/store/app-store.ts`** — rename the type import and field type: `ActivityCompletionResult` → `PageCompletionResult` (both the import and the `celebration`/`celebrate` signatures). No other changes.

- [ ] **Step 8: Temporarily neuter `lib/data/seed-content.ts`** so the test suite compiles before Task 9 replaces it properly. Replace the whole file with:

```ts
// Starter catalog seeding. Slice-2 interim state: the old hand-written mock
// courses are gone; Task 9 replaces this with pipeline-generated JSON loaded
// from lib/data/starter-courses/. Until then the catalog seeds empty.

import { sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Db } from "./core";
import type { CourseContent } from "@/lib/types";

export function loadStarterCourses(): CourseContent[] {
  return [];
}

export async function seedStarterCourses(db: Db): Promise<void> {
  for (const content of loadStarterCourses()) {
    await db
      .insert(schema.courseContent)
      .values({
        contentId: content.contentId,
        title: content.title,
        description: content.description,
        outcome: content.outcome,
        tags: content.tags,
        estimatedHours: content.estimatedHours,
        schemaVersion: 2,
        concepts: content.concepts,
        skillNodes: content.skillNodes,
        lessons: content.lessons,
        isStarter: true,
        createdBy: null,
      })
      .onConflictDoUpdate({
        target: schema.courseContent.contentId,
        set: {
          title: content.title,
          description: content.description,
          outcome: content.outcome,
          tags: content.tags,
          estimatedHours: content.estimatedHours,
          schemaVersion: 2,
          concepts: content.concepts,
          skillNodes: content.skillNodes,
          lessons: content.lessons,
          isStarter: true,
          updatedAt: sql`now()`,
        },
      });
  }
}
```

- [ ] **Step 9: Rewrite `lib/data/core.test.ts`** with the fixture course (ports every v1 scenario; new mastery semantics):

```ts
// @vitest-environment node
// Core-loop tests against real Postgres semantics: PGlite (in-memory) with
// the actual Drizzle schema and generated migrations. Ports the v1 scenarios
// to the page model and adds the new mastery rule (correct answers only).

import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { fixtureCourse } from "@/lib/test-fixtures/course";
import {
  addCourseToLibrary,
  completePage,
  duplicateCourse,
  getAllProgress,
  getCourseById,
  getCourseProgress,
  getCourses,
  getStarterCatalog,
  getUserStats,
  setCourseStatus,
  type Db,
} from "./core";
import { loadStarterCourses, seedStarterCourses } from "./seed-content";
import { computeAverageMastery, computeCourseCompletion } from "./derive";

let db: Db;

const ALICE = "user-alice";
const BOB = "user-bob";

const utcDate = (offsetDays = 0) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

beforeAll(async () => {
  const client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite as unknown as Db;
  await seedStarterCourses(db);
});

beforeEach(async () => {
  await db.delete(schema.user).where(eq(schema.user.id, ALICE));
  await db.delete(schema.user).where(eq(schema.user.id, BOB));
  for (const id of [ALICE, BOB]) {
    await db.insert(schema.user).values({
      id,
      name: id,
      email: `${id}@example.com`,
    });
    await db.insert(schema.userStats).values({ userId: id });
  }
});

describe("starter catalog", () => {
  it("exposes exactly the seeded starter courses", async () => {
    const catalog = await getStarterCatalog(db);
    const starters = loadStarterCourses();
    expect(catalog.map((c) => c.contentId).sort()).toEqual(
      starters.map((c) => c.contentId).sort(),
    );
  });

  it("is idempotent to re-seed", async () => {
    await seedStarterCourses(db);
    expect((await getStarterCatalog(db)).length).toBe(loadStarterCourses().length);
  });
});

describe("library management", () => {
  it("adds a course as a fresh copy with empty progress", async () => {
    const course = await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    expect(course.contentId).toBe("content-fixture");
    expect(course.status).toBe("active");
    expect(course.schemaVersion).toBe(2);
    expect(course.concepts.length).toBe(3);
    expect(course.lessons.length).toBe(2);
    const progress = await getCourseProgress(db, ALICE, course.id);
    expect(progress?.xpEarned).toBe(0);
    expect(progress?.masteryByNode["n1"]).toBe(0);
  });

  it("duplicates an existing course with independent progress", async () => {
    const original = await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    await completePage(db, ALICE, original.id, "l1", "l1-p3", "correct");
    const copy = await duplicateCourse(db, ALICE, original.id);
    expect(copy).not.toBeNull();
    expect(copy!.source).toBe("shared");
    expect(copy!.id).not.toBe(original.id);
    const originalProgress = await getCourseProgress(db, ALICE, original.id);
    const copyProgress = await getCourseProgress(db, ALICE, copy!.id);
    expect(originalProgress?.xpEarned).toBeGreaterThan(0);
    expect(copyProgress?.xpEarned).toBe(0);
  });

  it("archives and restores a course", async () => {
    const course = await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    await setCourseStatus(db, ALICE, course.id, "archived");
    expect((await getCourseById(db, ALICE, course.id))?.status).toBe("archived");
    await setCourseStatus(db, ALICE, course.id, "active");
    expect((await getCourseById(db, ALICE, course.id))?.status).toBe("active");
  });
});

describe("completePage — the core loop", () => {
  let courseId: string;

  beforeEach(async () => {
    const course = await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    courseId = course.id;
  });

  it("awards full XP for a correct question-page completion", async () => {
    const result = await completePage(db, ALICE, courseId, "l1", "l1-p3", "correct");
    expect(result?.xpAwarded).toBe(10);
    const progress = await getCourseProgress(db, ALICE, courseId);
    expect(progress?.lessonProgress["l1"].completedPageIds).toContain("l1-p3");
    expect(progress?.xpEarned).toBe(10);
  });

  it("awards half XP for an incorrect completion", async () => {
    const result = await completePage(db, ALICE, courseId, "l1", "l1-p3", "incorrect");
    expect(result?.xpAwarded).toBe(5);
  });

  it("awards no XP for content pages but still counts them and the streak", async () => {
    const result = await completePage(db, ALICE, courseId, "l1", "l1-p1", "correct");
    expect(result?.xpAwarded).toBe(0);
    expect(result?.streakExtended).toBe(true);
    const progress = await getCourseProgress(db, ALICE, courseId);
    expect(progress?.lessonProgress["l1"].completedPageIds).toContain("l1-p1");
    expect(progress?.xpEarned).toBe(0);
  });

  it("never double-awards XP for the same page", async () => {
    await completePage(db, ALICE, courseId, "l1", "l1-p3", "correct");
    const statsAfterFirst = await getUserStats(db, ALICE);
    const second = await completePage(db, ALICE, courseId, "l1", "l1-p3", "correct");
    expect(second?.xpAwarded).toBe(0);
    const statsAfterSecond = await getUserStats(db, ALICE);
    expect(statsAfterSecond.totalXp).toBe(statsAfterFirst.totalXp);
    expect(statsAfterSecond.xpToday).toBe(statsAfterFirst.xpToday);
  });

  it("enforces completion uniqueness at the DB level", async () => {
    await db.insert(schema.pageCompletions).values({
      courseId,
      pageId: "l1-p1",
      lessonId: "l1",
      outcome: "correct",
      xpAwarded: 0,
    });
    await expect(
      db.insert(schema.pageCompletions).values({
        courseId,
        pageId: "l1-p1",
        lessonId: "l1",
        outcome: "correct",
        xpAwarded: 0,
      }),
    ).rejects.toThrow();
  });

  it("drives mastery from correct question outcomes only", async () => {
    // n1 has 2 question pages (l1-p3, l1-p4).
    const first = await completePage(db, ALICE, courseId, "l1", "l1-p3", "correct");
    expect(first?.nodeMastery).toBe(50);
    // Incorrect completion counts the page done but gives no mastery credit.
    const second = await completePage(db, ALICE, courseId, "l1", "l1-p4", "incorrect");
    expect(second?.nodeMastery).toBe(50);
    const progress = await getCourseProgress(db, ALICE, courseId);
    expect(progress?.masteryByNode["n1"]).toBe(50);
  });

  it("content pages do not change mastery", async () => {
    const result = await completePage(db, ALICE, courseId, "l1", "l1-p1", "correct");
    expect(result?.nodeMastery).toBe(0);
  });

  it("starts a streak of 1 on a fresh account and does not extend twice same day", async () => {
    const first = await completePage(db, ALICE, courseId, "l1", "l1-p1", "correct");
    expect(first?.streakExtended).toBe(true);
    expect(first?.currentStreak).toBe(1);
    const second = await completePage(db, ALICE, courseId, "l1", "l1-p2", "correct");
    expect(second?.streakExtended).toBe(false);
    expect(second?.currentStreak).toBe(1);
  });

  it("extends the streak when the last study day was yesterday (UTC)", async () => {
    await db
      .update(schema.userStats)
      .set({ currentStreak: 12, longestStreak: 12, lastStudyDate: utcDate(-1), xpToday: 55 })
      .where(eq(schema.userStats.userId, ALICE));
    const result = await completePage(db, ALICE, courseId, "l1", "l1-p3", "correct");
    expect(result?.streakExtended).toBe(true);
    expect(result?.currentStreak).toBe(13);
    const stats = await getUserStats(db, ALICE);
    expect(stats.longestStreak).toBe(13);
    expect(stats.lastStudyDate).toBe(utcDate(0));
    // xp_today was reset for the new day before adding this completion's XP.
    expect(stats.xpToday).toBe(result?.xpAwarded);
  });

  it("resets the streak to 1 after a gap", async () => {
    await db
      .update(schema.userStats)
      .set({ currentStreak: 7, longestStreak: 9, lastStudyDate: utcDate(-3) })
      .where(eq(schema.userStats.userId, ALICE));
    const result = await completePage(db, ALICE, courseId, "l1", "l1-p3", "correct");
    expect(result?.currentStreak).toBe(1);
    expect((await getUserStats(db, ALICE)).longestStreak).toBe(9);
  });

  it("marks the lesson complete when its last page completes", async () => {
    await completePage(db, ALICE, courseId, "l1", "l1-p1", "correct");
    await completePage(db, ALICE, courseId, "l1", "l1-p2", "correct");
    await completePage(db, ALICE, courseId, "l1", "l1-p3", "correct");
    const result = await completePage(db, ALICE, courseId, "l1", "l1-p4", "correct");
    expect(result?.lessonCompleted).toBe(true);
  });

  it("marks the course completed when every page is done", async () => {
    const course = (await getCourseById(db, ALICE, courseId))!;
    let last: Awaited<ReturnType<typeof completePage>> = null;
    for (const lesson of course.lessons) {
      for (const page of lesson.pages) {
        last = await completePage(db, ALICE, courseId, lesson.id, page.id, "correct");
      }
    }
    expect(last?.courseCompleted).toBe(true);
    expect((await getCourseById(db, ALICE, courseId))?.status).toBe("completed");
  });

  it("returns null for unknown ids", async () => {
    expect(await completePage(db, ALICE, "nope", "l1", "l1-p1", "correct")).toBeNull();
    expect(await completePage(db, ALICE, courseId, "nope", "x", "correct")).toBeNull();
    expect(await completePage(db, ALICE, courseId, "l1", "nope", "correct")).toBeNull();
  });
});

describe("multi-user isolation", () => {
  it("keeps libraries separate", async () => {
    await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    expect((await getCourses(db, ALICE)).length).toBe(1);
    expect((await getCourses(db, BOB)).length).toBe(0);
    expect((await getAllProgress(db, BOB)).length).toBe(0);
  });

  it("hides other users' courses from reads", async () => {
    const course = await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    expect(await getCourseById(db, BOB, course.id)).toBeNull();
    expect(await getCourseProgress(db, BOB, course.id)).toBeNull();
  });

  it("rejects mutations against courses the user does not own", async () => {
    const course = await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    const result = await completePage(db, BOB, course.id, "l1", "l1-p3", "correct");
    expect(result).toBeNull();
    await setCourseStatus(db, BOB, course.id, "archived");
    expect((await getCourseById(db, ALICE, course.id))?.status).toBe("active");
    expect(await duplicateCourse(db, BOB, course.id)).toBeNull();
    const bobStats = await getUserStats(db, BOB);
    expect(bobStats.totalXp).toBe(0);
  });
});

describe("derived metrics", () => {
  it("computes completion percentage across all pages", async () => {
    const course = await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    await completePage(db, ALICE, course.id, "l1", "l1-p1", "correct");
    await completePage(db, ALICE, course.id, "l1", "l1-p2", "correct");
    const full = (await getCourseById(db, ALICE, course.id))!;
    const progress = await getCourseProgress(db, ALICE, course.id);
    // 2 of 8 pages complete.
    expect(computeCourseCompletion(full, progress)).toBe(25);
  });

  it("computes average mastery across nodes", async () => {
    const course = await addCourseToLibrary(db, ALICE, fixtureCourse, "starter");
    // Both n1 questions correct → n1 = 100, n2 = 0 → average 50.
    await completePage(db, ALICE, course.id, "l1", "l1-p3", "correct");
    await completePage(db, ALICE, course.id, "l1", "l1-p4", "correct");
    const progress = await getCourseProgress(db, ALICE, course.id);
    expect(computeAverageMastery(progress)).toBe(50);
  });
});
```

- [ ] **Step 10: Run the data-layer + validation tests**

Run: `npx vitest run lib/data/core.test.ts lib/validation/course-content.test.ts`
Expected: PASS.

- [ ] **Step 11: Update `lib/data/actions.ts`.** Replace the whole file with:

```ts
"use server";

// Server Actions: the app's entire data API. Each action resolves the user
// from the session (never from the client), validates inputs with Zod, and
// delegates to lib/data/core (and lib/generation for AI-backed actions).

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type {
  Course,
  CourseContent,
  CourseProgress,
  CourseSource,
  CourseStatus,
  GenerationJobView,
  GradeResponse,
  PageCompletionResult,
  PageOutcome,
  UserStats,
} from "@/lib/types";
import { courseContentSchema } from "@/lib/validation/course-content";
import { getModelClient } from "@/lib/generation/client";
import { gradeWithFallback } from "@/lib/generation/grading";
import { getGenerationJobView } from "@/lib/generation/jobs";
import * as core from "./core";

/** Authoritative auth check: session → user id. Redirects when signed out. */
async function requireUser(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/signin");
  return session.user.id;
}

const idSchema = z.string().min(1).max(200);
const sourceSchema = z.enum(["starter", "custom", "shared"]);
const statusSchema = z.enum(["active", "completed", "archived"]);
const outcomeSchema = z.enum(["correct", "incorrect"]);
const answerSchema = z.string().min(1).max(5000);

// ---------- reads ----------

export async function getCourses(): Promise<Course[]> {
  const userId = await requireUser();
  return core.getCourses(db, userId);
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const userId = await requireUser();
  return core.getCourseById(db, userId, idSchema.parse(courseId));
}

export async function getCourseProgress(courseId: string): Promise<CourseProgress | null> {
  const userId = await requireUser();
  return core.getCourseProgress(db, userId, idSchema.parse(courseId));
}

export async function getAllProgress(): Promise<CourseProgress[]> {
  const userId = await requireUser();
  return core.getAllProgress(db, userId);
}

export async function getUserStats(): Promise<UserStats> {
  const userId = await requireUser();
  return core.getUserStats(db, userId);
}

export async function getStarterCatalog(): Promise<CourseContent[]> {
  await requireUser();
  return core.getStarterCatalog(db);
}

export async function getGenerationJob(jobId: string): Promise<GenerationJobView | null> {
  const userId = await requireUser();
  return getGenerationJobView(db, userId, idSchema.parse(jobId));
}

// ---------- writes ----------

export async function addCourseToLibrary(
  content: CourseContent,
  source: CourseSource,
): Promise<Course> {
  const userId = await requireUser();
  return core.addCourseToLibrary(db, userId, courseContentSchema.parse(content), sourceSchema.parse(source));
}

export async function duplicateCourse(courseId: string): Promise<Course | null> {
  const userId = await requireUser();
  return core.duplicateCourse(db, userId, idSchema.parse(courseId));
}

export async function setCourseStatus(courseId: string, status: CourseStatus): Promise<void> {
  const userId = await requireUser();
  await core.setCourseStatus(db, userId, idSchema.parse(courseId), statusSchema.parse(status));
}

export async function completePage(
  courseId: string,
  lessonId: string,
  pageId: string,
  outcome: PageOutcome,
): Promise<PageCompletionResult | null> {
  const userId = await requireUser();
  return core.completePage(
    db,
    userId,
    idSchema.parse(courseId),
    idSchema.parse(lessonId),
    idSchema.parse(pageId),
    outcomeSchema.parse(outcome),
  );
}

/**
 * Grade an open-ended answer with the small grading model. The rubric is
 * loaded server-side from the owned course's content — never trusted from
 * the client. Never throws to the client: API failures return a fallback
 * marker and the UI degrades to self-assessment.
 */
export async function gradeOpenEnded(
  courseId: string,
  lessonId: string,
  pageId: string,
  answer: string,
): Promise<GradeResponse> {
  const userId = await requireUser();
  const course = await core.getCourseById(db, userId, idSchema.parse(courseId));
  const page = course?.lessons
    .find((l) => l.id === idSchema.parse(lessonId))
    ?.pages.find((p) => p.id === idSchema.parse(pageId));
  if (!page || page.type !== "open_ended") return { ok: false, fallback: true };
  return gradeWithFallback(getModelClient(), page, answerSchema.parse(answer.trim()));
}
```

Note: this file now imports `lib/generation/{client,grading,jobs}` which don't exist until Tasks 4 and 8. That's fine for vitest (nothing imports `actions.ts` in node tests), but if you prefer a compiling checkpoint, add the three imports in Tasks 4/8 instead — the plan assumes you add the file as-is now and create the modules next.

- [ ] **Step 12: Commit**

```bash
git add lib/db/schema.ts drizzle lib/data lib/store/app-store.ts
git commit -m "feat: page-based data layer — page_completions, generation_jobs, question-outcome mastery"
```

---

### Task 4: Anthropic model client + open-ended grading (TDD)

**Files:**
- Create: `lib/generation/model.ts`, `lib/generation/client.ts`, `lib/generation/grading.ts`
- Test: `lib/generation/grading.test.ts`

- [ ] **Step 1: Install the SDK**

```bash
npm install @anthropic-ai/sdk
```

Then verify the zod helper exists and accepts zod v4 (this project uses `zod@^4`):

```bash
node -e "const m = require('@anthropic-ai/sdk/helpers/zod'); console.log(typeof m.zodOutputFormat)"
```

Expected: `function`. If this fails or the SDK's peer range excludes zod 4, STOP and report — do not downgrade zod.

- [ ] **Step 2: Write the failing tests** — `lib/generation/grading.test.ts`:

```ts
// @vitest-environment node
// Grading unit tests with a stubbed ModelClient: prompt assembly, verdict
// passthrough, and the graceful fallback on API failure.

import { describe, expect, it, vi } from "vitest";
import type { OpenEndedPage } from "@/lib/types";
import type { GenerateParams, ModelClient } from "./model";
import { GRADING_MODEL } from "./client";
import { gradeOpenEndedAnswer, gradeWithFallback } from "./grading";

const page: OpenEndedPage = {
  type: "open_ended",
  id: "p1",
  prompt: "Explain how a teammate gets your image.",
  tests: ["c-registry"],
  explanation: "",
  xp: 20,
  rubric: {
    keyPoints: ["Push to a registry", "Teammate pulls from the registry"],
    commonMisconceptions: ["Emailing the Dockerfile shares the image"],
    sampleAnswer: "Push it to a registry; they pull it by name.",
  },
};

function stubModel(result: unknown): ModelClient & { calls: GenerateParams<unknown>[] } {
  const calls: GenerateParams<unknown>[] = [];
  return {
    calls,
    async generate<T>(params: GenerateParams<T>): Promise<T> {
      calls.push(params as GenerateParams<unknown>);
      return result as T;
    },
  };
}

describe("gradeOpenEndedAnswer", () => {
  it("sends the rubric and answer to the grading model and returns its verdict", async () => {
    const grade = { verdict: "pass", feedback: "Nice.", missedKeyPoints: [] };
    const model = stubModel(grade);
    const result = await gradeOpenEndedAnswer(model, page, "Push it to a registry, they pull it.");
    expect(result).toEqual(grade);
    expect(model.calls).toHaveLength(1);
    const call = model.calls[0];
    expect(call.model).toBe(GRADING_MODEL);
    expect(call.user).toContain("Push to a registry");
    expect(call.user).toContain("Emailing the Dockerfile");
    expect(call.user).toContain("Push it to a registry, they pull it.");
  });
});

describe("gradeWithFallback", () => {
  it("wraps a successful grade", async () => {
    const model = stubModel({ verdict: "partial", feedback: "Some gaps.", missedKeyPoints: ["Push to a registry"] });
    const result = await gradeWithFallback(model, page, "They download it.");
    expect(result).toEqual({
      ok: true,
      grade: { verdict: "partial", feedback: "Some gaps.", missedKeyPoints: ["Push to a registry"] },
    });
  });

  it("returns the fallback marker when the model call fails", async () => {
    const model: ModelClient = {
      generate: vi.fn().mockRejectedValue(new Error("529 overloaded")),
    };
    const result = await gradeWithFallback(model, page, "Answer.");
    expect(result).toEqual({ ok: false, fallback: true });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run lib/generation/grading.test.ts`
Expected: FAIL (modules don't exist).

- [ ] **Step 4: Create `lib/generation/model.ts`**:

```ts
// Thin abstraction over the Anthropic SDK's structured-output call so the
// pipeline and grading code can be tested with a stub. Every LLM call in the
// app goes through ModelClient.generate: the model fills out a Zod schema
// via structured outputs (client.messages.parse + zodOutputFormat) — it
// never invents structure.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

export interface GenerateParams<T> {
  model: string;
  maxTokens: number;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  /** Enable adaptive thinking (used for Opus generation calls, not grading). */
  thinking?: boolean;
}

export interface ModelClient {
  generate<T>(params: GenerateParams<T>): Promise<T>;
}

export function anthropicModelClient(client: Anthropic): ModelClient {
  return {
    async generate({ model, maxTokens, system, user, schema, thinking }) {
      const response = await client.messages.parse({
        model,
        max_tokens: maxTokens,
        system,
        ...(thinking ? { thinking: { type: "adaptive" as const } } : {}),
        messages: [{ role: "user", content: user }],
        output_config: { format: zodOutputFormat(schema) },
      });
      if (response.parsed_output == null) {
        throw new Error(
          `Model returned no parseable output (stop_reason: ${response.stop_reason})`,
        );
      }
      return response.parsed_output;
    },
  };
}
```

> If `zodOutputFormat(schema)` fails to typecheck with a single argument (some SDK versions require a name: `zodOutputFormat(schema, "output")`), add the second argument — check the installed SDK's signature under `node_modules/@anthropic-ai/sdk/helpers/zod.d.ts` and match it.

- [ ] **Step 5: Create `lib/generation/client.ts`**:

```ts
// Singleton Anthropic-backed ModelClient plus the model choices for this
// app. Opus for generation quality; Haiku for grading (deliberate: grading
// runs on every answer, latency must be low, and the rubric does the heavy
// lifting). Reads ANTHROPIC_API_KEY from the environment.

import Anthropic from "@anthropic-ai/sdk";
import { anthropicModelClient, type ModelClient } from "./model";

export const GENERATION_MODEL = "claude-opus-4-8";
export const GRADING_MODEL = "claude-haiku-4-5";

let cached: ModelClient | null = null;

export function getModelClient(): ModelClient {
  if (!cached) cached = anthropicModelClient(new Anthropic());
  return cached;
}
```

- [ ] **Step 6: Create `lib/generation/grading.ts`**:

```ts
// Open-ended answer grading: Claude Haiku 4.5 + the page's rubric, via
// structured outputs. The rubric was fixed at generation time; the model
// only applies it. gradeWithFallback never throws — a provider outage must
// never block lesson progress (the UI degrades to self-assessment).

import { z } from "zod";
import type { GradeResponse, OpenEndedGrade, OpenEndedPage } from "@/lib/types";
import { GRADING_MODEL } from "./client";
import type { ModelClient } from "./model";

const gradeOutputSchema = z.object({
  verdict: z.enum(["pass", "partial", "retry"]),
  feedback: z.string(),
  missedKeyPoints: z.array(z.string()),
});

const GRADER_SYSTEM = `You grade a learner's short free-text answer against a rubric. Be encouraging but honest — never award "pass" for an answer that misses key points.

Verdicts:
- "pass": the answer covers all or nearly all key points with no major misconception.
- "partial": a genuine attempt that covers some key points but has meaningful gaps or repeats a common misconception.
- "retry": empty, off-topic, or too thin to grade — invite the learner to try again.

feedback: 1-3 sentences addressed directly to the learner ("you"), naming what was right and what was missing.
missedKeyPoints: the rubric key points the answer did not cover, copied verbatim (empty if none).`;

function gradeUserPrompt(page: OpenEndedPage, answer: string): string {
  return [
    `Question: ${page.prompt}`,
    "",
    "Rubric key points (a good answer makes these points):",
    ...page.rubric.keyPoints.map((p) => `- ${p}`),
    "",
    "Common misconceptions to watch for:",
    ...page.rubric.commonMisconceptions.map((m) => `- ${m}`),
    "",
    `Sample answer: ${page.rubric.sampleAnswer}`,
    "",
    `Learner's answer: ${answer}`,
  ].join("\n");
}

export async function gradeOpenEndedAnswer(
  model: ModelClient,
  page: OpenEndedPage,
  answer: string,
): Promise<OpenEndedGrade> {
  return model.generate({
    model: GRADING_MODEL,
    maxTokens: 1024,
    system: GRADER_SYSTEM,
    user: gradeUserPrompt(page, answer),
    schema: gradeOutputSchema,
  });
}

/** Grade, or signal the self-assessment fallback on any failure. */
export async function gradeWithFallback(
  model: ModelClient,
  page: OpenEndedPage,
  answer: string,
): Promise<GradeResponse> {
  try {
    return { ok: true, grade: await gradeOpenEndedAnswer(model, page, answer) };
  } catch {
    return { ok: false, fallback: true };
  }
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run lib/generation/grading.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add lib/generation package.json package-lock.json
git commit -m "feat: ModelClient wrapper + Haiku rubric grading with self-assessment fallback"
```

---

### Task 5: Lesson player — page components + page player (TDD)

**Files:**
- Modify: `components/lesson/rich-text.tsx`
- Create: `components/lesson/pages/{text-page,diagram-page,multiple-choice-page,matching-page,typing-page,open-ended-page}.tsx`
- Create: `components/lesson/page-player.tsx`
- Test: `components/lesson/pages.test.tsx`
- Modify: `app/courses/[courseId]/lessons/[lessonId]/page.tsx`, `app/courses/[courseId]/page.tsx`, `components/skill-map/skill-tree.tsx`, `components/wizard/course-preview.tsx`
- Delete: `components/lesson/{activity-player,explanation-check,scenario-decision,applied-task,activity-previews}.tsx`, `components/lesson/activities.test.tsx`

- [ ] **Step 1: Install mermaid**

```bash
npm install mermaid
```

- [ ] **Step 2: Write the failing component tests** — `components/lesson/pages.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { GradeResponse } from "@/lib/types";
import { fixtureCourse } from "@/lib/test-fixtures/course";
import { TextPageView } from "./pages/text-page";
import { DiagramPageView } from "./pages/diagram-page";
import { MultipleChoicePageView } from "./pages/multiple-choice-page";
import { MatchingPageView } from "./pages/matching-page";
import { TypingPageView, normalizeTypedAnswer } from "./pages/typing-page";
import { OpenEndedPageView } from "./pages/open-ended-page";

// Mermaid is mocked: jsdom can't lay out SVG, and the render path is what we
// exercise (success → svg injected; failure → caption fallback).
const renderMock = vi.hoisted(() => vi.fn());
vi.mock("mermaid", () => ({
  default: { initialize: vi.fn(), render: renderMock },
}));

beforeEach(() => {
  cleanup();
  renderMock.mockReset();
});

const l1 = fixtureCourse.lessons[0];
const l2 = fixtureCourse.lessons[1];
const textPage = l1.pages[0];
const diagramPage = l1.pages[1];
const mcPage = l1.pages[2];
const typingPage = l1.pages[3];
const matchingPage = l2.pages[2];
const openEndedPage = l2.pages[3];
if (
  textPage.type !== "text" ||
  diagramPage.type !== "diagram" ||
  mcPage.type !== "multiple_choice" ||
  typingPage.type !== "typing" ||
  matchingPage.type !== "matching" ||
  openEndedPage.type !== "open_ended"
) {
  throw new Error("fixture shape changed — update pages.test.tsx");
}

describe("TextPageView", () => {
  it("renders the body and continues", () => {
    const onContinue = vi.fn();
    render(<TextPageView page={textPage} onContinue={onContinue} />);
    expect(screen.getByText("image")).toBeInTheDocument(); // the **bold** span
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onContinue).toHaveBeenCalled();
  });
});

describe("DiagramPageView", () => {
  it("renders the mermaid SVG and the caption", async () => {
    renderMock.mockResolvedValue({ svg: '<svg data-testid="mmd"></svg>' });
    const onContinue = vi.fn();
    render(<DiagramPageView page={diagramPage} onContinue={onContinue} />);
    await waitFor(() => expect(screen.getByTestId("mmd")).toBeInTheDocument());
    expect(screen.getByText(diagramPage.caption)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onContinue).toHaveBeenCalled();
  });

  it("falls back to a caption card when mermaid fails to render", async () => {
    renderMock.mockRejectedValue(new Error("parse error"));
    render(<DiagramPageView page={diagramPage} onContinue={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText(/diagram could not be displayed/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(diagramPage.caption)).toBeInTheDocument();
  });
});

describe("MultipleChoicePageView", () => {
  it("completes correct on a right first pick and shows the explanation", () => {
    const onComplete = vi.fn();
    render(<MultipleChoicePageView page={mcPage} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("radio", { name: /immutable template/i }));
    expect(screen.getByText("Correct!")).toBeInTheDocument();
    expect(screen.getByText(mcPage.explanation)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("correct");
  });

  it("completes incorrect on a wrong pick and surfaces the misconception", () => {
    const onComplete = vi.fn();
    render(<MultipleChoicePageView page={mcPage} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("radio", { name: /running process/i }));
    expect(screen.getByText(/not quite/i)).toBeInTheDocument();
    expect(screen.getByText(/confuses images with containers/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("incorrect");
  });
});

describe("MatchingPageView", () => {
  it("completes correct when every pair is matched without a miss", () => {
    const onComplete = vi.fn();
    render(<MatchingPageView page={matchingPage} onComplete={onComplete} />);
    for (const pair of matchingPage.pairs) {
      fireEvent.click(screen.getByRole("button", { name: pair.left }));
      fireEvent.click(screen.getByRole("button", { name: pair.right }));
    }
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("correct");
  });

  it("completes incorrect after a mismatched attempt", () => {
    const onComplete = vi.fn();
    render(<MatchingPageView page={matchingPage} onComplete={onComplete} />);
    const [first, second] = matchingPage.pairs;
    // One deliberate miss: first.left with second.right.
    fireEvent.click(screen.getByRole("button", { name: first.left }));
    fireEvent.click(screen.getByRole("button", { name: second.right }));
    for (const pair of matchingPage.pairs) {
      fireEvent.click(screen.getByRole("button", { name: pair.left }));
      fireEvent.click(screen.getByRole("button", { name: pair.right }));
    }
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("incorrect");
  });
});

describe("TypingPageView", () => {
  it("normalizes answers case- and whitespace-insensitively", () => {
    expect(normalizeTypedAnswer("  A   Layer ")).toBe("a layer");
  });

  it("completes correct on a right first submission", () => {
    const onComplete = vi.fn();
    render(<TypingPageView page={typingPage} onComplete={onComplete} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: " LAYER " } });
    fireEvent.click(screen.getByRole("button", { name: /^check$/i }));
    expect(screen.getByText("Correct!")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("correct");
  });

  it("shows the hint after a miss and completes incorrect after reveal", () => {
    const onComplete = vi.fn();
    render(<TypingPageView page={typingPage} onComplete={onComplete} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "container" } });
    fireEvent.click(screen.getByRole("button", { name: /^check$/i }));
    expect(screen.getByText(typingPage.hint!)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
    expect(screen.getByText(typingPage.acceptableAnswers[0])).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("incorrect");
  });

  it("completes incorrect when the right answer came after a retry", () => {
    const onComplete = vi.fn();
    render(<TypingPageView page={typingPage} onComplete={onComplete} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "container" } });
    fireEvent.click(screen.getByRole("button", { name: /^check$/i }));
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "layer" } });
    fireEvent.click(screen.getByRole("button", { name: /^check$/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("incorrect");
  });
});

describe("OpenEndedPageView", () => {
  function renderWithGrade(result: GradeResponse, onComplete = vi.fn()) {
    const onGrade = vi.fn().mockResolvedValue(result);
    render(<OpenEndedPageView page={openEndedPage} onGrade={onGrade} onComplete={onComplete} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Push then pull." } });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    return { onGrade, onComplete };
  }

  it("completes correct on a pass verdict", async () => {
    const { onGrade, onComplete } = renderWithGrade({
      ok: true,
      grade: { verdict: "pass", feedback: "Covers it.", missedKeyPoints: [] },
    });
    await waitFor(() => expect(screen.getByText("Covers it.")).toBeInTheDocument());
    expect(onGrade).toHaveBeenCalledWith("Push then pull.");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("correct");
  });

  it("completes incorrect on a partial verdict and reveals rubric details", async () => {
    const { onComplete } = renderWithGrade({
      ok: true,
      grade: { verdict: "partial", feedback: "Gaps.", missedKeyPoints: ["Push the image to a registry"] },
    });
    await waitFor(() => expect(screen.getByText("Gaps.")).toBeInTheDocument());
    expect(screen.getByText("Push the image to a registry")).toBeInTheDocument();
    expect(screen.getByText(openEndedPage.rubric.sampleAnswer)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onComplete).toHaveBeenCalledWith("incorrect");
  });

  it("lets the learner try again on a retry verdict without completing", async () => {
    const { onComplete } = renderWithGrade({
      ok: true,
      grade: { verdict: "retry", feedback: "Say more.", missedKeyPoints: [] },
    });
    await waitFor(() => expect(screen.getByText("Say more.")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /revise my answer/i }));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("falls back to self-assessment when grading is unavailable", async () => {
    const { onComplete } = renderWithGrade({ ok: false, fallback: true });
    await waitFor(() =>
      expect(screen.getByText(/grading is unavailable/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(openEndedPage.rubric.sampleAnswer)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /i covered these/i }));
    expect(onComplete).toHaveBeenCalledWith("correct");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run components/lesson/pages.test.tsx`
Expected: FAIL (components don't exist).

- [ ] **Step 4: Extend `components/lesson/rich-text.tsx`** — replace the file with:

```tsx
import { Fragment } from "react";

/**
 * Minimal renderer for lesson content's markdown subset: paragraphs
 * (blank-line separated), **bold**, `inline code`, #/##/### headings, and
 * "- " bullet lists. Course JSON is controlled, so this stays tiny on
 * purpose — no markdown dependency.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/\n\s*\n/);
  return (
    <div className={className}>
      {blocks.map((block, i) => (
        <Block key={i} block={block.trim()} />
      ))}
    </div>
  );
}

function Block({ block }: { block: string }) {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  if (lines.every((l) => l.startsWith("- "))) {
    return (
      <ul className="mb-3 list-disc space-y-1 pl-5 leading-relaxed last:mb-0">
        {lines.map((l, i) => (
          <li key={i}>{renderInline(l.slice(2))}</li>
        ))}
      </ul>
    );
  }

  const heading = /^(#{1,3})\s+(.*)$/.exec(lines[0]);
  if (heading && lines.length === 1) {
    const level = heading[1].length;
    if (level === 1) {
      return <h2 className="mb-2 mt-4 text-lg font-bold first:mt-0">{renderInline(heading[2])}</h2>;
    }
    if (level === 2) {
      return <h3 className="mb-2 mt-4 font-bold first:mt-0">{renderInline(heading[2])}</h3>;
    }
    return <h4 className="mb-2 mt-3 text-sm font-bold first:mt-0">{renderInline(heading[2])}</h4>;
  }

  return <p className="mb-3 leading-relaxed last:mb-0">{renderInline(lines.join(" "))}</p>;
}

function renderInline(text: string): React.ReactNode {
  // Split on **bold** and `code` spans, keeping delimiters.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
```

- [ ] **Step 5: Create `components/lesson/pages/text-page.tsx`**:

```tsx
"use client";

import type { TextPage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { RichText } from "../rich-text";

export function TextPageView({
  page,
  onContinue,
}: {
  page: TextPage;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-5">
      <RichText text={page.body} className="text-[15px]" />
      <Button onClick={onContinue} className="w-full sm:w-auto">
        Continue
      </Button>
    </div>
  );
}
```

- [ ] **Step 6: Create `components/lesson/pages/diagram-page.tsx`**:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { DiagramPage } from "@/lib/types";
import { Button } from "@/components/ui/button";

/**
 * Client-side Mermaid render. Invalid Mermaid must never block a lesson:
 * on any render failure we fall back to a card carrying the caption text.
 */
export function DiagramPageView({
  page,
  onContinue,
}: {
  page: DiagramPage;
  onContinue: () => void;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
        const { svg: rendered } = await mermaid.render(
          `mmd-${page.id.replace(/[^a-zA-Z0-9-]/g, "")}`,
          page.mermaid,
        );
        if (!cancelled) setSvg(rendered);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page.id, page.mermaid]);

  return (
    <div className="space-y-4">
      {page.intro && <p className="text-[15px] leading-relaxed">{page.intro}</p>}
      {failed ? (
        <div className="rounded-lg border bg-secondary/50 p-4 text-sm text-muted-foreground">
          The diagram could not be displayed.
        </div>
      ) : svg ? (
        <div
          className="overflow-x-auto rounded-lg border bg-card p-3 [&_svg]:mx-auto [&_svg]:max-w-full"
          // Mermaid runs with securityLevel "strict"; source is controlled course JSON.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="h-32 animate-pulse rounded-lg border bg-secondary/40" aria-hidden />
      )}
      <p className="text-sm text-muted-foreground">{page.caption}</p>
      <Button onClick={onContinue} className="w-full sm:w-auto">
        Continue
      </Button>
    </div>
  );
}
```

- [ ] **Step 7: Create `components/lesson/pages/multiple-choice-page.tsx`**:

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import type { MultipleChoicePage, PageOutcome } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function MultipleChoicePageView({
  page,
  onComplete,
}: {
  page: MultipleChoicePage;
  onComplete: (outcome: PageOutcome) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const answered = selected !== null;
  const correct = selected === page.correctOptionId;
  const selectedOption = page.options.find((o) => o.id === selected);

  return (
    <div className="space-y-4">
      {page.context && (
        <p className="rounded-lg border bg-secondary/50 p-3 text-sm">{page.context}</p>
      )}
      <p className="font-medium">{page.prompt}</p>
      <div className="space-y-2" role="radiogroup" aria-label={page.prompt}>
        {page.options.map((option) => {
          const isCorrect = option.id === page.correctOptionId;
          const isSelected = option.id === selected;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={answered}
              onClick={() => setSelected(option.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                !answered && "hover:border-brand hover:bg-brand-muted/50",
                answered && isCorrect && "border-brand bg-brand-muted",
                answered && isSelected && !isCorrect && "border-destructive bg-destructive/10",
                answered && !isSelected && !isCorrect && "opacity-60",
              )}
            >
              {answered && isCorrect && (
                <CheckCircle2 className="size-4 shrink-0 text-brand-strong" aria-hidden />
              )}
              {answered && isSelected && !isCorrect && (
                <XCircle className="size-4 shrink-0 text-destructive" aria-hidden />
              )}
              {option.text}
            </button>
          );
        })}
      </div>

      {answered && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-lg border p-3 text-sm",
            correct ? "border-brand bg-brand-muted" : "border-border bg-secondary/50",
          )}
        >
          <p className="font-semibold">{correct ? "Correct!" : "Not quite."}</p>
          {!correct && selectedOption?.misconception && (
            <p className="mt-1 text-muted-foreground">
              Common mix-up: {selectedOption.misconception}
            </p>
          )}
          <p className="mt-1 text-muted-foreground">{page.explanation}</p>
          <Button size="sm" className="mt-3" onClick={() => onComplete(correct ? "correct" : "incorrect")}>
            Continue
          </Button>
        </motion.div>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Create `components/lesson/pages/matching-page.tsx`**:

```tsx
"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import type { MatchingPage, PageOutcome } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tap-to-pair matching: pick a left item, then its right-column partner.
 * A wrong pick counts as a miss (and flashes); the outcome is "correct"
 * only when every pair was matched without a single miss.
 */
export function MatchingPageView({
  page,
  onComplete,
}: {
  page: MatchingPage;
  onComplete: (outcome: PageOutcome) => void;
}) {
  // Right column is shuffled once per mount; pair ids are shared across columns.
  const rightColumn = useMemo(
    () => shuffle(page.pairs.map((p) => ({ id: p.id, text: p.right }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page.id],
  );
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<ReadonlySet<string>>(new Set());
  const [misses, setMisses] = useState(0);
  const [missedRightId, setMissedRightId] = useState<string | null>(null);

  const allMatched = matched.size === page.pairs.length;

  function pickLeft(id: string) {
    if (matched.has(id)) return;
    setSelectedLeft(id);
    setMissedRightId(null);
  }

  function pickRight(id: string) {
    if (!selectedLeft || matched.has(id)) return;
    if (id === selectedLeft) {
      setMatched((prev) => new Set(prev).add(id));
      setSelectedLeft(null);
      setMissedRightId(null);
    } else {
      setMisses((m) => m + 1);
      setMissedRightId(id);
    }
  }

  return (
    <div className="space-y-4">
      <p className="font-medium">{page.prompt}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          {page.pairs.map((pair) => (
            <button
              key={pair.id}
              type="button"
              disabled={matched.has(pair.id) || allMatched}
              aria-pressed={selectedLeft === pair.id}
              onClick={() => pickLeft(pair.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors",
                matched.has(pair.id) && "border-brand bg-brand-muted opacity-70",
                selectedLeft === pair.id && "border-brand bg-brand-muted",
                !matched.has(pair.id) && selectedLeft !== pair.id && "hover:border-brand",
              )}
            >
              {matched.has(pair.id) && (
                <CheckCircle2 className="size-4 shrink-0 text-brand-strong" aria-hidden />
              )}
              {pair.left}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {rightColumn.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={matched.has(item.id) || allMatched}
              onClick={() => pickRight(item.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors",
                matched.has(item.id) && "border-brand bg-brand-muted opacity-70",
                missedRightId === item.id && "border-destructive bg-destructive/10",
                !matched.has(item.id) && missedRightId !== item.id && "hover:border-brand",
              )}
            >
              {matched.has(item.id) && (
                <CheckCircle2 className="size-4 shrink-0 text-brand-strong" aria-hidden />
              )}
              {item.text}
            </button>
          ))}
        </div>
      </div>

      {allMatched && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-lg border p-3 text-sm",
            misses === 0 ? "border-brand bg-brand-muted" : "border-border bg-secondary/50",
          )}
        >
          <p className="font-semibold">
            {misses === 0 ? "All matched — first try!" : `All matched, with ${misses} miss${misses === 1 ? "" : "es"}.`}
          </p>
          <p className="mt-1 text-muted-foreground">{page.explanation}</p>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => onComplete(misses === 0 ? "correct" : "incorrect")}
          >
            Continue
          </Button>
        </motion.div>
      )}
    </div>
  );
}
```

- [ ] **Step 9: Create `components/lesson/pages/typing-page.tsx`**:

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { PageOutcome, TypingPage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function normalizeTypedAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Free-recall typing. "correct" only on a clean first submission; a retry
 * that eventually matches — or revealing the answer — completes "incorrect".
 */
export function TypingPageView({
  page,
  onComplete,
}: {
  page: TypingPage;
  onComplete: (outcome: PageOutcome) => void;
}) {
  const [value, setValue] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState<"input" | "correct" | "wrong" | "revealed">("input");

  const accepted = page.acceptableAnswers.map(normalizeTypedAnswer);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    if (accepted.includes(normalizeTypedAnswer(value))) {
      setStatus("correct");
    } else {
      setAttempts((a) => a + 1);
      setStatus("wrong");
    }
  }

  return (
    <div className="space-y-4">
      <p className="font-medium">{page.prompt}</p>
      {(status === "input" || status === "wrong") && (
        <form onSubmit={submit} className="flex gap-2">
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (status === "wrong") setStatus("input");
            }}
            placeholder="Type your answer"
            aria-label="Your answer"
            autoFocus
          />
          <Button type="submit" disabled={!value.trim()}>
            Check
          </Button>
        </form>
      )}

      {status === "wrong" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border bg-secondary/50 p-3 text-sm"
        >
          <p className="font-semibold">Not quite.</p>
          {page.hint && <p className="mt-1 text-muted-foreground">{page.hint}</p>}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => setStatus("input")}>
              Try again
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStatus("revealed")}>
              Show answer
            </Button>
          </div>
        </motion.div>
      )}

      {status === "correct" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-brand bg-brand-muted p-3 text-sm"
        >
          <p className="font-semibold">Correct!</p>
          <p className="mt-1 text-muted-foreground">{page.explanation}</p>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => onComplete(attempts === 0 ? "correct" : "incorrect")}
          >
            Continue
          </Button>
        </motion.div>
      )}

      {status === "revealed" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border bg-secondary/50 p-3 text-sm"
        >
          <p className="font-semibold">
            The answer: <span className="text-brand-strong">{page.acceptableAnswers[0]}</span>
          </p>
          <p className="mt-1 text-muted-foreground">{page.explanation}</p>
          <Button size="sm" className="mt-3" onClick={() => onComplete("incorrect")}>
            Continue
          </Button>
        </motion.div>
      )}
    </div>
  );
}
```

> If `components/ui/input.tsx` does not exist, check `components/ui/` for the project's text-input primitive (the wizard uses `Textarea` from `components/ui/textarea`). If there is no `Input`, use a plain `<input>` styled like the Textarea (copy its className) — do not add a new dependency.

- [ ] **Step 10: Create `components/lesson/pages/open-ended-page.tsx`**:

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import type { GradeResponse, OpenEndedGrade, OpenEndedPage, PageOutcome } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Phase = "input" | "grading" | "graded" | "fallback";

/**
 * Open-ended question with AI grading at answer time. pass/partial complete
 * the page (full/no mastery credit); retry lets the learner revise without
 * penalty. If grading is unavailable, degrade to self-assessment against
 * the rubric so a provider outage never blocks progress.
 */
export function OpenEndedPageView({
  page,
  onGrade,
  onComplete,
}: {
  page: OpenEndedPage;
  onGrade: (answer: string) => Promise<GradeResponse>;
  onComplete: (outcome: PageOutcome) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [grade, setGrade] = useState<OpenEndedGrade | null>(null);

  async function submit() {
    if (!answer.trim()) return;
    setPhase("grading");
    const result = await onGrade(answer.trim());
    if (!result.ok) {
      setPhase("fallback");
      return;
    }
    setGrade(result.grade);
    setPhase("graded");
  }

  return (
    <div className="space-y-4">
      <p className="font-medium">{page.prompt}</p>

      {(phase === "input" || phase === "grading") && (
        <>
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={5}
            placeholder="Answer in your own words…"
            aria-label="Your answer"
            disabled={phase === "grading"}
          />
          <Button onClick={submit} disabled={phase === "grading" || !answer.trim()}>
            {phase === "grading" ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Grading…
              </>
            ) : (
              <>
                <Sparkles className="size-4" aria-hidden />
                Submit for grading
              </>
            )}
          </Button>
        </>
      )}

      {phase === "graded" && grade && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "space-y-3 rounded-lg border p-3 text-sm",
            grade.verdict === "pass" ? "border-brand bg-brand-muted" : "border-border bg-secondary/50",
          )}
        >
          <p className="font-semibold">
            {grade.verdict === "pass" && "Nice — that covers it."}
            {grade.verdict === "partial" && "Good attempt — some gaps."}
            {grade.verdict === "retry" && "Let's try that again."}
          </p>
          <p className="text-muted-foreground">{grade.feedback}</p>

          {grade.verdict !== "retry" && (
            <>
              {grade.missedKeyPoints.length > 0 && (
                <div>
                  <p className="font-medium">You missed:</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                    {grade.missedKeyPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="font-medium">Sample answer</p>
                <p className="mt-1 text-muted-foreground">{page.rubric.sampleAnswer}</p>
              </div>
              <Button
                size="sm"
                onClick={() => onComplete(grade.verdict === "pass" ? "correct" : "incorrect")}
              >
                Continue
              </Button>
            </>
          )}
          {grade.verdict === "retry" && (
            <Button size="sm" onClick={() => setPhase("input")}>
              Revise my answer
            </Button>
          )}
        </motion.div>
      )}

      {phase === "fallback" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 rounded-lg border bg-secondary/50 p-3 text-sm"
        >
          <p className="font-semibold">Grading is unavailable right now — check your own answer.</p>
          <div>
            <p className="font-medium">A good answer covers:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
              {page.rubric.keyPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Sample answer</p>
            <p className="mt-1 text-muted-foreground">{page.rubric.sampleAnswer}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onComplete("correct")}>
              I covered these
            </Button>
            <Button size="sm" variant="outline" onClick={() => onComplete("incorrect")}>
              I missed some
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
```

- [ ] **Step 11: Run the component tests**

Run: `npx vitest run components/lesson/pages.test.tsx`
Expected: PASS (15 tests).

- [ ] **Step 12: Create `components/lesson/page-player.tsx`**:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, PartyPopper, Zap } from "lucide-react";
import type { Course, Lesson, Page, PageOutcome } from "@/lib/types";
import { completePage, gradeOpenEnded } from "@/lib/data/actions";
import { useAppStore } from "@/lib/store/app-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TextPageView } from "./pages/text-page";
import { DiagramPageView } from "./pages/diagram-page";
import { MultipleChoicePageView } from "./pages/multiple-choice-page";
import { MatchingPageView } from "./pages/matching-page";
import { TypingPageView } from "./pages/typing-page";
import { OpenEndedPageView } from "./pages/open-ended-page";

const PAGE_LABELS: Record<string, string> = {
  text: "Learn",
  diagram: "Diagram",
  video: "Video",
  multiple_choice: "Quick check",
  matching: "Match",
  typing: "Recall",
  open_ended: "Explain it",
};

/**
 * Renders a lesson's page sequence and runs the core loop on each
 * completion: feedback (in-page) → mastery/XP/streak via the server action →
 * celebration toast → progression. Content pages advance on "Continue";
 * question pages answer → feedback → advance.
 */
export function PagePlayer({
  course,
  lesson,
  startIndex,
}: {
  course: Course;
  lesson: Lesson;
  startIndex: number;
}) {
  const celebrate = useAppStore((s) => s.celebrate);
  const bump = useAppStore((s) => s.bumpDataVersion);
  const [index, setIndex] = useState(Math.min(startIndex, lesson.pages.length - 1));
  const [finished, setFinished] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);

  const page = lesson.pages[index];
  const isLast = index === lesson.pages.length - 1;

  async function handleComplete(outcome: PageOutcome) {
    const result = await completePage(course.id, lesson.id, page.id, outcome);
    if (result) {
      // Content pages award no XP — only toast when there's something to celebrate.
      if (result.xpAwarded > 0 || result.lessonCompleted || result.streakExtended) {
        celebrate(result);
      }
      setSessionXp((xp) => xp + result.xpAwarded);
      bump();
    }
    if (isLast) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
    }
  }

  if (finished) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <PartyPopper className="size-12 text-brand" aria-hidden />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold">Lesson complete!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              “{lesson.title}” is in the books.
            </p>
          </div>
          {sessionXp > 0 && (
            <p className="flex items-center gap-1.5 rounded-full bg-brand-muted px-4 py-1.5 font-bold text-brand-strong">
              <Zap className="size-4" aria-hidden />+{sessionXp} XP earned
            </p>
          )}
          <Button nativeButton={false} render={<Link href={`/courses/${course.id}`} />}>
            Back to skill map
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* progress header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/courses/${course.id}`}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back to course"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-brand"
            animate={{ width: `${(100 * index) / lesson.pages.length}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {index + 1}/{lesson.pages.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={page.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
        >
          <Card>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-strong">
                  {PAGE_LABELS[page.type] ?? "Lesson"}
                </p>
                {"title" in page && <h1 className="mt-0.5 text-lg font-bold">{page.title}</h1>}
              </div>
              <PageBody
                page={page}
                onContinue={() => handleComplete("correct")}
                onComplete={handleComplete}
                onGrade={(answer) => gradeOpenEnded(course.id, lesson.id, page.id, answer)}
              />
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PageBody({
  page,
  onContinue,
  onComplete,
  onGrade,
}: {
  page: Page;
  onContinue: () => void;
  onComplete: (outcome: PageOutcome) => void;
  onGrade: (answer: string) => ReturnType<typeof gradeOpenEnded>;
}) {
  switch (page.type) {
    case "text":
      return <TextPageView page={page} onContinue={onContinue} />;
    case "diagram":
      return <DiagramPageView page={page} onContinue={onContinue} />;
    case "multiple_choice":
      return <MultipleChoicePageView page={page} onComplete={onComplete} />;
    case "matching":
      return <MatchingPageView page={page} onComplete={onComplete} />;
    case "typing":
      return <TypingPageView page={page} onComplete={onComplete} />;
    case "open_ended":
      return <OpenEndedPageView page={page} onGrade={onGrade} onComplete={onComplete} />;
    default:
      // video (deferred) and any future page types: skip-able placeholder.
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This page type isn’t supported yet — skip ahead.
          </p>
          <Button onClick={onContinue}>Skip</Button>
        </div>
      );
  }
}
```

- [ ] **Step 13: Delete the old activity components and tests**

```bash
git rm components/lesson/activity-player.tsx components/lesson/explanation-check.tsx components/lesson/scenario-decision.tsx components/lesson/applied-task.tsx components/lesson/activity-previews.tsx components/lesson/activities.test.tsx
```

- [ ] **Step 14: Update the app pages and remaining consumers.**

`app/courses/[courseId]/lessons/[lessonId]/page.tsx` — three changes:
- import: `import { PagePlayer } from "@/components/lesson/page-player";`
- resume logic:

```ts
  // Resume at the first incomplete page (fresh redo if all are done).
  const completedIds = new Set(
    progress?.lessonProgress[lessonId]?.completedPageIds ?? [],
  );
  let startIndex = lesson.pages.findIndex((p) => !completedIds.has(p.id));
  if (startIndex === -1) startIndex = 0;
```

- render: `<PagePlayer course={course} lesson={lesson} startIndex={startIndex} />`

`app/courses/[courseId]/page.tsx` — one change at the lesson list:
`const started = (lp?.completedActivityIds.length ?? 0) > 0;` → `const started = (lp?.completedPageIds.length ?? 0) > 0;`

`components/skill-map/skill-tree.tsx` — around lines 15–40, replace the activity plumbing:
- comment: `/** A node is complete when every one of its pages is done. */`
- `completedIds` set: `Object.values(progress?.lessonProgress ?? {}).flatMap((lp) => lp.completedPageIds)`
- replace `activitiesOf` with:

```ts
  const pagesOf = (n: SkillNode) =>
    course.lessons.filter((l) => l.skillNodeId === n.id).flatMap((l) => l.pages);
```

- and update its two call sites (`const acts = activitiesOf(n)` → `const pages = pagesOf(n)` with `pages.length` / `pages.every((p) => completedIds.has(p.id))`, and the `started` check → `pagesOf(node).some((p) => completedIds.has(p.id))`). Read the file first and keep its existing logic shape — only activities→pages and `a.skillNodeId` filtering moves from page-level to lesson-level.

`components/wizard/course-preview.tsx` — two changes:
- `const activityCount = ...` → `const pageCount = content.lessons.reduce((n, l) => n + l.pages.length, 0);` and the display line → `{content.lessons.length} lessons · {pageCount} pages`
- Delete the trailing "Prototype note: course generation is mocked…" `<p>` entirely.

- [ ] **Step 15: Run all tests written so far**

Run: `npx vitest run components/lesson/pages.test.tsx lib/data/core.test.ts lib/validation/course-content.test.ts lib/generation/grading.test.ts`
Expected: PASS.

- [ ] **Step 16: Commit**

```bash
git add -A components app lib package.json package-lock.json
git commit -m "feat: page player — text/diagram/MCQ/matching/typing/open-ended pages replace activities"
```

---

### Task 6: Generation schemas + prompts

**Files:**
- Create: `lib/generation/schemas.ts`, `lib/generation/prompts.ts`, `lib/validation/wizard-answers.ts`

- [ ] **Step 1: Create `lib/generation/schemas.ts`** — the model-facing shapes. They deliberately differ from the domain schema: no page `id`s and no `xp` (the pipeline injects both deterministically), no `video` pages (deferred), no `contentId`/`schemaVersion`. Constraints are kept loose — structured outputs strips unsupported keywords anyway, and the pedagogy checks + repair loop are the real gate.

```ts
// Model-facing Zod schemas for structured outputs. The model fills these
// out; it never invents structure. Page ids and XP are intentionally absent
// — the pipeline assigns both server-side (buildLesson). Video pages are
// schema-v2-legal but never generated this slice.

import { z } from "zod";

export const outlineSchema = z.object({
  title: z.string(),
  description: z.string(),
  outcome: z.string(),
  tags: z.array(z.string()),
  estimatedHours: z.number().int(),
  concepts: z.array(z.object({ id: z.string(), name: z.string() })),
  skillNodes: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      prereqIds: z.array(z.string()),
      position: z.object({ col: z.number().int(), row: z.number().int() }),
    }),
  ),
  lessons: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      skillNodeId: z.string(),
      estimatedMinutes: z.number().int(),
      /** Concepts this lesson introduces (teaches for the first time). */
      conceptIds: z.array(z.string()),
    }),
  ),
});

export type Outline = z.infer<typeof outlineSchema>;
export type OutlineLesson = Outline["lessons"][number];

const generatedContentBase = {
  title: z.string(),
  teaches: z.array(z.string()),
};

const generatedTextPage = z.object({
  type: z.literal("text"),
  ...generatedContentBase,
  body: z.string(),
});

const generatedDiagramPage = z.object({
  type: z.literal("diagram"),
  ...generatedContentBase,
  intro: z.string().optional(),
  mermaid: z.string(),
  caption: z.string(),
});

const generatedQuestionBase = {
  prompt: z.string(),
  tests: z.array(z.string()),
  explanation: z.string(),
};

const generatedMultipleChoicePage = z.object({
  type: z.literal("multiple_choice"),
  ...generatedQuestionBase,
  context: z.string().optional(),
  options: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      misconception: z.string().optional(),
    }),
  ),
  correctOptionId: z.string(),
});

const generatedMatchingPage = z.object({
  type: z.literal("matching"),
  ...generatedQuestionBase,
  pairs: z.array(z.object({ id: z.string(), left: z.string(), right: z.string() })),
});

const generatedTypingPage = z.object({
  type: z.literal("typing"),
  ...generatedQuestionBase,
  acceptableAnswers: z.array(z.string()),
  hint: z.string().optional(),
});

const generatedOpenEndedPage = z.object({
  type: z.literal("open_ended"),
  ...generatedQuestionBase,
  rubric: z.object({
    keyPoints: z.array(z.string()),
    commonMisconceptions: z.array(z.string()),
    sampleAnswer: z.string(),
  }),
});

export const lessonPagesSchema = z.object({
  pages: z.array(
    z.discriminatedUnion("type", [
      generatedTextPage,
      generatedDiagramPage,
      generatedMultipleChoicePage,
      generatedMatchingPage,
      generatedTypingPage,
      generatedOpenEndedPage,
    ]),
  ),
});

export type GeneratedPage = z.infer<typeof lessonPagesSchema>["pages"][number];
```

- [ ] **Step 2: Create `lib/generation/prompts.ts`**:

```ts
// Prompt builders for the generation pipeline. The pedagogy rules stated
// here are the same ones the validator enforces mechanically — the prompt
// makes the model likely to comply; the validator + repair loop guarantee it.

import type { WizardAnswers } from "@/lib/types";
import type { Outline, OutlineLesson } from "./schemas";

export const OUTLINE_SYSTEM = `You are an expert curriculum designer for a self-paced learning app.

You design a course outline from a learner's goal. The course is structured as:
- skillNodes: a small branching tech-tree of skills. prereqIds form a DAG. position.col is depth (0 = starting skills), position.row separates parallel branches (0, 1, 2, ...).
- lessons: each belongs to exactly one skill node (1-4 lessons per node), listed in the order they should be studied.
- concepts: the flat list of atomic ideas the whole course teaches. Concepts are the spine of the course — every lesson page will later declare which concepts it teaches or tests.

Rules:
- 3-7 skill nodes, 6-14 lessons total, 8-30 concepts.
- Every lesson lists conceptIds: the concepts that lesson INTRODUCES (1-4 per lesson). Every concept must be introduced by exactly one lesson.
- Order lessons so knowledge builds: a lesson may assume only concepts introduced in earlier lessons of the same skill node, or in (transitively) prerequisite nodes. Never assign a concept to a lesson whose node cannot see the concepts it builds on.
- estimatedMinutes per lesson must fit the learner's stated schedule; estimatedHours is the realistic whole-hour total.
- ids are short unique kebab-case slugs: nodes "node-...", lessons "lesson-...", concepts "c-...".
- tags: 2-4 short topical tags.
- Calibrate depth to the learner's starting knowledge; the description sells the outcome in one or two sentences.`;

export function outlineUserPrompt(answers: WizardAnswers): string {
  return [
    `The learner's goal (real-world outcome): ${answers.outcome}`,
    `Starting knowledge: ${answers.knowledge}`,
    `Time available: ${answers.time}`,
    `Preferred learning style: ${answers.style}`,
    answers.sources.length > 0
      ? `The learner uploaded ${answers.sources.length} reference file(s) (${answers.sources.join(", ")}) — file contents are not available, design from the goal alone.`
      : "",
    "",
    "Design the course outline.",
  ]
    .filter(Boolean)
    .join("\n");
}

export const LESSON_SYSTEM = `You write one lesson for a self-paced learning app as an ordered sequence of pages.

Content pages (teach; each carries "teaches": the concept ids it substantively teaches — may be empty for pure narrative/transition pages):
- text: title + body. Markdown subset ONLY: paragraphs separated by blank lines, **bold**, \`inline code\`, headings (#, ##, ###), and "- " bullet lists. No links, no images, no tables.
- diagram: title, optional one-sentence intro, mermaid (valid Mermaid source — prefer a simple "flowchart TD"/"flowchart LR" or "sequenceDiagram", at most ~10 nodes, no styling directives), caption explaining what to notice.

Question pages (test; each carries "tests": the concept ids it tests, and "explanation": shown after answering):
- multiple_choice: optional context (scenario framing), 2-5 options with short unique ids, correctOptionId.
- matching: 3-6 pairs (short unique pair ids); the learner matches left to right.
- typing: short free-recall answer. acceptableAnswers must list EVERY acceptable phrasing (matched case- and whitespace-insensitively); optional hint.
- open_ended: a "explain it in your own words" prompt, graded later by an AI against your rubric: keyPoints (2-5 independently checkable points a good answer makes), commonMisconceptions, sampleAnswer.

Pedagogy rules — these are mechanically validated and violations are rejected:
1. Teach before you test: a question page may only test concepts taught by a content page EARLIER in this lesson, or concepts listed as already taught.
2. Teach every assigned concept with substantive content (a real explanation with an example — not a passing mention) before any question tests it.
3. At least one content page before the first question page; at least 2 content pages total.
4. Every incorrect multiple_choice option MUST include "misconception": the specific plausible confusion that would lead a learner to pick it. The correct option must NOT have a misconception field. Distractors must match the correct answer's length and specificity. No joke options, no "all of the above".
5. Interleave: teach a concept, then test it soon after — don't stack all questions at the end.

Aim for 5-9 pages. Write in second person, concrete and example-driven. Vary question types.`;

export function lessonUserPrompt(
  outline: Outline,
  brief: OutlineLesson,
  alreadyTaught: ReadonlySet<string>,
  previousErrors: string[],
): string {
  const nameOf = new Map(outline.concepts.map((c) => [c.id, c.name]));
  const toTeach = brief.conceptIds.map((id) => `- ${id} — ${nameOf.get(id) ?? id}`);
  const taught = [...alreadyTaught].map((id) => `- ${id} — ${nameOf.get(id) ?? id}`);

  const parts = [
    `Course: ${outline.title} — ${outline.outcome}`,
    `Lesson id: ${brief.id}`,
    `Lesson: ${brief.title} — ${brief.description} (~${brief.estimatedMinutes} minutes)`,
    "",
    "Concepts THIS lesson must teach (teach every one of them):",
    ...(toTeach.length > 0 ? toTeach : ["(none — this is a practice lesson)"]),
    "",
    "Concepts already taught earlier in the course (you may test these; don't re-teach them at length):",
    ...(taught.length > 0 ? taught : ["(none — this is the first lesson)"]),
  ];

  if (previousErrors.length > 0) {
    parts.push(
      "",
      "Your previous attempt was rejected by the validator. Fix ALL of these errors:",
      ...previousErrors.map((e) => `- ${e}`),
    );
  }

  parts.push("", "Write the lesson's full page sequence.");
  return parts.join("\n");
}
```

- [ ] **Step 3: Create `lib/validation/wizard-answers.ts`**:

```ts
// Wizard answers cross the client → route-handler boundary as JSON; this is
// the server-side gate.

import { z } from "zod";
import type { WizardAnswers } from "@/lib/types";

export const wizardAnswersSchema: z.ZodType<WizardAnswers> = z.object({
  outcome: z.string().min(10).max(2000),
  knowledge: z.string().min(1).max(100),
  time: z.string().min(1).max(100),
  style: z.string().min(1).max(100),
  sources: z.array(z.string().max(300)).max(20),
});
```

- [ ] **Step 4: Commit**

```bash
git add lib/generation/schemas.ts lib/generation/prompts.ts lib/validation/wizard-answers.ts
git commit -m "feat: generation schemas and prompts (outline + per-lesson, pedagogy rules, repair suffix)"
```

---

### Task 7: Generation pipeline with repair loop (TDD)

**Files:**
- Create: `lib/generation/generation-fixtures.ts` (test-only canned data + stub model)
- Create: `lib/generation/pipeline.ts`
- Test: `lib/generation/pipeline.test.ts`

- [ ] **Step 1: Create `lib/generation/generation-fixtures.ts`**:

```ts
// Canned pipeline inputs and a stub ModelClient — imported only by tests
// (pipeline.test.ts, jobs.test.ts). Routing: outline calls are recognized by
// schema identity; lesson calls by the "Lesson id: <id>" line the prompt
// builder always emits.

import type { GenerateParams, ModelClient } from "./model";
import { outlineSchema, type Outline } from "./schemas";

export const stubOutline: Outline = {
  title: "Docker Fundamentals",
  description: "Learn Docker from scratch.",
  outcome: "Ship an app in a container.",
  tags: ["docker", "devops"],
  estimatedHours: 2,
  concepts: [
    { id: "c-one", name: "Concept one" },
    { id: "c-two", name: "Concept two" },
    { id: "c-three", name: "Concept three" },
  ],
  skillNodes: [
    { id: "node-a", title: "A", description: "First node", prereqIds: [], position: { col: 0, row: 0 } },
    { id: "node-b", title: "B", description: "Second node", prereqIds: ["node-a"], position: { col: 1, row: 0 } },
  ],
  lessons: [
    {
      id: "lesson-a",
      title: "Lesson A",
      description: "Teaches one and two",
      skillNodeId: "node-a",
      estimatedMinutes: 10,
      conceptIds: ["c-one", "c-two"],
    },
    {
      id: "lesson-b",
      title: "Lesson B",
      description: "Teaches three",
      skillNodeId: "node-b",
      estimatedMinutes: 10,
      conceptIds: ["c-three"],
    },
  ],
};

export const validLessonAPages = {
  pages: [
    { type: "text", title: "One", body: "All about **one**.", teaches: ["c-one"] },
    { type: "text", title: "Two", body: "All about **two**.", teaches: ["c-two"] },
    {
      type: "multiple_choice",
      prompt: "What is one?",
      tests: ["c-one"],
      explanation: "One is one.",
      options: [
        { id: "a", text: "The right answer" },
        { id: "b", text: "A wrong answer", misconception: "Mixes up one and two" },
      ],
      correctOptionId: "a",
    },
  ],
};

export const validLessonBPages = {
  pages: [
    { type: "text", title: "Three", body: "All about three.", teaches: ["c-three"] },
    { type: "text", title: "Recap", body: "A recap.", teaches: [] },
    {
      type: "typing",
      prompt: "What is three?",
      tests: ["c-three"],
      explanation: "Three is three.",
      acceptableAnswers: ["three"],
    },
  ],
};

/** Violates: question first, teach-before-test, and the 2-content-page minimum. */
export const invalidLessonBPages = {
  pages: [
    {
      type: "typing",
      prompt: "What is three?",
      tests: ["c-three"],
      explanation: "Three is three.",
      acceptableAnswers: ["three"],
    },
    { type: "text", title: "Three", body: "All about three.", teaches: ["c-three"] },
  ],
};

export function makeStubModel(
  outline: unknown,
  lessonResponses: Record<string, unknown[]>,
): ModelClient & { calls: GenerateParams<unknown>[] } {
  const attemptCounts = new Map<string, number>();
  const calls: GenerateParams<unknown>[] = [];
  return {
    calls,
    async generate<T>(params: GenerateParams<T>): Promise<T> {
      calls.push(params as GenerateParams<unknown>);
      if (params.schema === outlineSchema) return outline as T;
      const lessonId = Object.keys(lessonResponses).find((id) =>
        params.user.includes(`Lesson id: ${id}`),
      );
      if (!lessonId) throw new Error("stub: no lesson response matches this prompt");
      const attempt = attemptCounts.get(lessonId) ?? 0;
      attemptCounts.set(lessonId, attempt + 1);
      const responses = lessonResponses[lessonId];
      return responses[Math.min(attempt, responses.length - 1)] as T;
    },
  };
}

export function lessonCallsFor(
  calls: GenerateParams<unknown>[],
  lessonId: string,
): GenerateParams<unknown>[] {
  return calls.filter((c) => c.user.includes(`Lesson id: ${lessonId}`));
}
```

- [ ] **Step 2: Write the failing tests** — `lib/generation/pipeline.test.ts`:

```ts
// @vitest-environment node
// Pipeline stage tests with a stubbed ModelClient: happy path, the lesson
// repair loop (validation errors fed back into the prompt), and the
// unrecoverable-failure path (bounded retries, then a clean throw).

import { describe, expect, it } from "vitest";
import type { WizardAnswers } from "@/lib/types";
import { validateCourseContent } from "@/lib/validation/course-content";
import {
  invalidLessonBPages,
  lessonCallsFor,
  makeStubModel,
  stubOutline,
  validLessonAPages,
  validLessonBPages,
} from "./generation-fixtures";
import { generateCourse, XP_BY_QUESTION_TYPE } from "./pipeline";

const answers: WizardAnswers = {
  outcome: "Ship an app in a container",
  knowledge: "beginner",
  time: "25",
  style: "mix",
  sources: [],
};

describe("generateCourse — happy path", () => {
  it("assembles a fully valid course from outline + lesson calls", async () => {
    const model = makeStubModel(stubOutline, {
      "lesson-a": [validLessonAPages],
      "lesson-b": [validLessonBPages],
    });
    const statuses: string[] = [];
    const content = await generateCourse(model, answers, {
      onStatus: (s) => void statuses.push(s),
    });

    expect(() => validateCourseContent(content)).not.toThrow();
    expect(statuses).toEqual(["outlining", "generating", "validating"]);
    expect(content.contentId).toMatch(/^content-/);
    expect(content.schemaVersion).toBe(2);
    // Page ids are rewritten deterministically; XP is server-assigned.
    expect(content.lessons[0].pages.map((p) => p.id)).toEqual([
      "lesson-a-p1",
      "lesson-a-p2",
      "lesson-a-p3",
    ]);
    const mc = content.lessons[0].pages[2];
    expect(mc.type === "multiple_choice" && mc.xp).toBe(XP_BY_QUESTION_TYPE.multiple_choice);
    // lessonIds are derived from the lessons, not asked of the model.
    expect(content.skillNodes.map((n) => n.lessonIds)).toEqual([["lesson-a"], ["lesson-b"]]);
  });

  it("honors a contentId override (starter-course regeneration)", async () => {
    const model = makeStubModel(stubOutline, {
      "lesson-a": [validLessonAPages],
      "lesson-b": [validLessonBPages],
    });
    const content = await generateCourse(model, answers, { contentId: "content-fixed" });
    expect(content.contentId).toBe("content-fixed");
  });
});

describe("generateCourse — repair loop", () => {
  it("regenerates a failing lesson with the concrete errors in the prompt", async () => {
    const model = makeStubModel(stubOutline, {
      "lesson-a": [validLessonAPages],
      "lesson-b": [invalidLessonBPages, validLessonBPages],
    });
    const content = await generateCourse(model, answers);
    expect(() => validateCourseContent(content)).not.toThrow();

    const bCalls = lessonCallsFor(model.calls, "lesson-b");
    expect(bCalls).toHaveLength(2);
    expect(bCalls[0].user).not.toContain("rejected by the validator");
    expect(bCalls[1].user).toContain("rejected by the validator");
    expect(bCalls[1].user).toContain("question page before any content page");
  });

  it("fails cleanly after bounded retries when a lesson never validates", async () => {
    const model = makeStubModel(stubOutline, {
      "lesson-a": [validLessonAPages],
      "lesson-b": [invalidLessonBPages],
    });
    await expect(generateCourse(model, answers)).rejects.toThrow(/Lesson B/);
    // 1 initial attempt + 2 repairs.
    expect(lessonCallsFor(model.calls, "lesson-b")).toHaveLength(3);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run lib/generation/pipeline.test.ts`
Expected: FAIL (`pipeline.ts` doesn't exist).

- [ ] **Step 4: Create `lib/generation/pipeline.ts`**:

```ts
// The generation pipeline: one outline call, then one call per lesson with
// limited parallelism, validating each lesson as it lands and regenerating
// failures with the concrete validation errors appended (repair loop,
// bounded). No partial course ever escapes: the assembled course must pass
// the full schema-v2 validator or the run throws.

import type {
  CourseContent,
  GenerationJobStatus,
  Lesson,
  Page,
  WizardAnswers,
} from "@/lib/types";
import { validateCourseContent } from "@/lib/validation/course-content";
import {
  availableConceptsByLesson,
  conceptsTaughtIn,
  lessonPedagogyIssues,
} from "@/lib/validation/pedagogy";
import { GENERATION_MODEL } from "./client";
import type { ModelClient } from "./model";
import { LESSON_SYSTEM, OUTLINE_SYSTEM, lessonUserPrompt, outlineUserPrompt } from "./prompts";
import {
  lessonPagesSchema,
  outlineSchema,
  type GeneratedPage,
  type Outline,
  type OutlineLesson,
} from "./schemas";

const LESSON_CONCURRENCY = 3;
/** 1 initial attempt + 2 repairs. */
const LESSON_ATTEMPTS = 3;
const OUTLINE_MAX_TOKENS = 16000;
const LESSON_MAX_TOKENS = 16000;

/** XP is server-assigned by question type — the model never sets it. */
export const XP_BY_QUESTION_TYPE = {
  multiple_choice: 10,
  matching: 15,
  typing: 10,
  open_ended: 20,
} as const;

export interface GenerateCourseOptions {
  /** Override the minted contentId (used by the starter-course script). */
  contentId?: string;
  onStatus?: (status: GenerationJobStatus) => void | Promise<void>;
}

export async function generateCourse(
  model: ModelClient,
  answers: WizardAnswers,
  options: GenerateCourseOptions = {},
): Promise<CourseContent> {
  await options.onStatus?.("outlining");
  const outline = await model.generate({
    model: GENERATION_MODEL,
    maxTokens: OUTLINE_MAX_TOKENS,
    system: OUTLINE_SYSTEM,
    user: outlineUserPrompt(answers),
    schema: outlineSchema,
    thinking: true,
  });

  await options.onStatus?.("generating");
  const availability = availableConceptsByLesson(
    outline.skillNodes,
    outline.lessons.map((l) => ({ skillNodeId: l.skillNodeId, concepts: new Set(l.conceptIds) })),
  );
  const lessons = await mapWithConcurrency(outline.lessons, LESSON_CONCURRENCY, (brief, i) =>
    generateLessonWithRepair(model, outline, brief, availability[i]),
  );

  await options.onStatus?.("validating");
  return validateCourseContent(assembleCourse(outline, lessons, options.contentId));
}

async function generateLessonWithRepair(
  model: ModelClient,
  outline: Outline,
  brief: OutlineLesson,
  availableBefore: ReadonlySet<string>,
): Promise<Lesson> {
  const allConceptIds = new Set(outline.concepts.map((c) => c.id));
  let errors: string[] = [];
  for (let attempt = 0; attempt < LESSON_ATTEMPTS; attempt++) {
    let generated: { pages: GeneratedPage[] };
    try {
      generated = await model.generate({
        model: GENERATION_MODEL,
        maxTokens: LESSON_MAX_TOKENS,
        system: LESSON_SYSTEM,
        user: lessonUserPrompt(outline, brief, availableBefore, errors),
        schema: lessonPagesSchema,
        thinking: true,
      });
    } catch (err) {
      errors = [
        `The response failed schema validation: ${err instanceof Error ? err.message : String(err)}`,
      ];
      continue;
    }
    const lesson = buildLesson(brief, generated.pages);
    errors = checkLesson(lesson, brief, availableBefore, allConceptIds);
    if (errors.length === 0) return lesson;
  }
  throw new Error(
    `Lesson "${brief.title}" failed validation after ${LESSON_ATTEMPTS} attempts:\n${errors
      .map((e) => `- ${e}`)
      .join("\n")}`,
  );
}

/** Repair-loop checks: per-lesson pedagogy plus assigned-concept coverage. */
function checkLesson(
  lesson: Lesson,
  brief: OutlineLesson,
  availableBefore: ReadonlySet<string>,
  allConceptIds: ReadonlySet<string>,
): string[] {
  const errors = lessonPedagogyIssues(lesson, availableBefore, allConceptIds).map(
    (issue) => issue.message,
  );
  const taught = conceptsTaughtIn(lesson);
  for (const conceptId of brief.conceptIds) {
    if (!taught.has(conceptId)) {
      errors.push(
        `assigned concept "${conceptId}" is not taught by any content page in this lesson`,
      );
    }
  }
  return errors;
}

/** Inject deterministic page ids and server-assigned XP. */
function buildLesson(brief: OutlineLesson, pages: GeneratedPage[]): Lesson {
  return {
    id: brief.id,
    title: brief.title,
    description: brief.description,
    skillNodeId: brief.skillNodeId,
    estimatedMinutes: Math.max(1, brief.estimatedMinutes),
    pages: pages.map((page, i): Page => {
      const id = `${brief.id}-p${i + 1}`;
      switch (page.type) {
        case "text":
        case "diagram":
          return { ...page, id };
        case "multiple_choice":
        case "matching":
        case "typing":
        case "open_ended":
          return { ...page, id, xp: XP_BY_QUESTION_TYPE[page.type] };
      }
    }),
  };
}

function assembleCourse(outline: Outline, lessons: Lesson[], contentId?: string): CourseContent {
  return {
    contentId: contentId ?? `content-${crypto.randomUUID()}`,
    schemaVersion: 2,
    title: outline.title,
    description: outline.description,
    outcome: outline.outcome,
    tags: outline.tags,
    estimatedHours: Math.max(1, outline.estimatedHours),
    concepts: outline.concepts,
    skillNodes: outline.skillNodes.map((node) => ({
      ...node,
      lessonIds: lessons.filter((l) => l.skillNodeId === node.id).map((l) => l.id),
    })),
    lessons,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/generation/pipeline.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/generation
git commit -m "feat: generation pipeline — outline, parallel lesson calls, validate + bounded repair loop"
```

---

### Task 8: Job orchestration, route handler, and the real wizard (TDD for jobs)

**Files:**
- Create: `lib/generation/jobs.ts`
- Test: `lib/generation/jobs.test.ts`
- Create: `app/api/generation/route.ts`
- Rewrite: `components/wizard/course-wizard.tsx`
- Modify: `components/wizard/course-preview.tsx` (WizardAnswers import)

- [ ] **Step 1: Write the failing tests** — `lib/generation/jobs.test.ts`:

```ts
// @vitest-environment node
// Job lifecycle against PGlite: status progression to done with stored
// content, clean failure with no partial course persisted, and per-user
// job visibility.

import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Db } from "@/lib/data/core";
import type { WizardAnswers } from "@/lib/types";
import { validateCourseContent } from "@/lib/validation/course-content";
import {
  invalidLessonBPages,
  makeStubModel,
  stubOutline,
  validLessonAPages,
  validLessonBPages,
} from "./generation-fixtures";
import { createGenerationJob, getGenerationJobView, runGenerationJob } from "./jobs";

let db: Db;

const ALICE = "user-alice";
const BOB = "user-bob";

const answers: WizardAnswers = {
  outcome: "Ship an app in a container",
  knowledge: "beginner",
  time: "25",
  style: "mix",
  sources: [],
};

beforeAll(async () => {
  const client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite as unknown as Db;
});

beforeEach(async () => {
  await db.delete(schema.generationJobs);
  await db.delete(schema.courseContent);
  await db.delete(schema.user).where(eq(schema.user.id, ALICE));
  await db.delete(schema.user).where(eq(schema.user.id, BOB));
  for (const id of [ALICE, BOB]) {
    await db.insert(schema.user).values({ id, name: id, email: `${id}@example.com` });
  }
});

describe("runGenerationJob", () => {
  it("runs the pipeline, stores the content, and marks the job done", async () => {
    const model = makeStubModel(stubOutline, {
      "lesson-a": [validLessonAPages],
      "lesson-b": [validLessonBPages],
    });
    const job = await createGenerationJob(db, ALICE, answers);
    expect(job.status).toBe("queued");

    await runGenerationJob(db, model, job.id);

    const view = await getGenerationJobView(db, ALICE, job.id);
    expect(view?.status).toBe("done");
    expect(view?.error).toBeNull();
    expect(view?.content).not.toBeNull();
    expect(() => validateCourseContent(view!.content!)).not.toThrow();

    // The content row exists and is attributed to the user, not the catalog.
    const [row] = await db
      .select()
      .from(schema.courseContent)
      .where(eq(schema.courseContent.contentId, view!.content!.contentId));
    expect(row.isStarter).toBe(false);
    expect(row.createdBy).toBe(ALICE);
  });

  it("marks the job failed and persists no partial course", async () => {
    const model = makeStubModel(stubOutline, {
      "lesson-a": [validLessonAPages],
      "lesson-b": [invalidLessonBPages],
    });
    const job = await createGenerationJob(db, ALICE, answers);
    await runGenerationJob(db, model, job.id);

    const view = await getGenerationJobView(db, ALICE, job.id);
    expect(view?.status).toBe("failed");
    expect(view?.error).toContain("Lesson B");
    expect(view?.content).toBeNull();
    expect(await db.select().from(schema.courseContent)).toHaveLength(0);
  });

  it("does not re-run a job that already left the queued state", async () => {
    const model = makeStubModel(stubOutline, {
      "lesson-a": [validLessonAPages],
      "lesson-b": [validLessonBPages],
    });
    const job = await createGenerationJob(db, ALICE, answers);
    await runGenerationJob(db, model, job.id);
    const callsAfterFirst = model.calls.length;
    await runGenerationJob(db, model, job.id);
    expect(model.calls.length).toBe(callsAfterFirst);
  });
});

describe("getGenerationJobView", () => {
  it("hides other users' jobs", async () => {
    const job = await createGenerationJob(db, ALICE, answers);
    expect(await getGenerationJobView(db, BOB, job.id)).toBeNull();
    expect(await getGenerationJobView(db, ALICE, job.id)).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/generation/jobs.test.ts`
Expected: FAIL (`jobs.ts` doesn't exist).

- [ ] **Step 3: Create `lib/generation/jobs.ts`**:

```ts
// Generation-job orchestration: one row per wizard submission. The route
// handler creates the row and schedules runGenerationJob after the response
// (next/server `after`); the wizard polls getGenerationJobView for real
// stage progress. On success the validated content is stored in
// course_content and the job carries its contentId; on failure only the
// error is recorded — no partial course is ever persisted.

import { and, eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { toCourseContent, type Db } from "@/lib/data/core";
import type { CourseContent, GenerationJobView, WizardAnswers } from "@/lib/types";
import type { ModelClient } from "./model";
import { generateCourse } from "./pipeline";

type JobRow = typeof schema.generationJobs.$inferSelect;

export async function createGenerationJob(
  db: Db,
  userId: string,
  answers: WizardAnswers,
): Promise<JobRow> {
  const [row] = await db
    .insert(schema.generationJobs)
    .values({ id: `genjob-${crypto.randomUUID()}`, userId, answers })
    .returning();
  return row;
}

async function updateJob(
  db: Db,
  jobId: string,
  patch: Partial<Pick<JobRow, "status" | "error" | "contentId">>,
): Promise<void> {
  await db
    .update(schema.generationJobs)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.generationJobs.id, jobId));
}

export async function runGenerationJob(db: Db, model: ModelClient, jobId: string): Promise<void> {
  const [job] = await db
    .select()
    .from(schema.generationJobs)
    .where(eq(schema.generationJobs.id, jobId));
  if (!job || job.status !== "queued") return;
  try {
    const content = await generateCourse(model, job.answers, {
      onStatus: (status) => updateJob(db, jobId, { status }),
    });
    await db
      .insert(schema.courseContent)
      .values({
        contentId: content.contentId,
        title: content.title,
        description: content.description,
        outcome: content.outcome,
        tags: content.tags,
        estimatedHours: content.estimatedHours,
        schemaVersion: 2,
        concepts: content.concepts,
        skillNodes: content.skillNodes,
        lessons: content.lessons,
        isStarter: false,
        createdBy: job.userId,
      })
      .onConflictDoNothing();
    await updateJob(db, jobId, { status: "done", contentId: content.contentId });
  } catch (err) {
    await updateJob(db, jobId, {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function getGenerationJobView(
  db: Db,
  userId: string,
  jobId: string,
): Promise<GenerationJobView | null> {
  const [row] = await db
    .select()
    .from(schema.generationJobs)
    .where(and(eq(schema.generationJobs.id, jobId), eq(schema.generationJobs.userId, userId)));
  if (!row) return null;
  let content: CourseContent | null = null;
  if (row.status === "done" && row.contentId) {
    const [contentRow] = await db
      .select()
      .from(schema.courseContent)
      .where(eq(schema.courseContent.contentId, row.contentId));
    if (contentRow) content = toCourseContent(contentRow);
  }
  return { id: row.id, status: row.status, error: row.error, content };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/generation/jobs.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Create `app/api/generation/route.ts`**:

```ts
// Kicks off course generation. The generation itself runs AFTER the response
// via next/server `after`, so the wizard gets its job id immediately and the
// work survives the request (on Vercel, `after` maps to waitUntil and runs
// up to maxDuration; locally the Node server just keeps going). Progress is
// reported through the generation_jobs row, which the wizard polls.

import { after } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { wizardAnswersSchema } from "@/lib/validation/wizard-answers";
import { getModelClient } from "@/lib/generation/client";
import { createGenerationJob, runGenerationJob } from "@/lib/generation/jobs";

export const maxDuration = 800;

export async function POST(request: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = wizardAnswersSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid answers" }, { status: 400 });
  }

  const job = await createGenerationJob(db, session.user.id, parsed.data);
  after(() => runGenerationJob(db, getModelClient(), job.id));
  return Response.json({ jobId: job.id });
}
```

- [ ] **Step 6: Rewrite `components/wizard/course-wizard.tsx`** — same steps/answers UI as before; the generating step becomes a real job with polling. Full file:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, FileText, Sparkles, TriangleAlert, Upload, X } from "lucide-react";
import type { CourseContent, GenerationJobStatus, WizardAnswers } from "@/lib/types";
import { getGenerationJob } from "@/lib/data/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CoursePreview } from "./course-preview";

const KNOWLEDGE_OPTIONS = [
  { value: "beginner", label: "Complete beginner", hint: "Starting from zero" },
  { value: "some", label: "Some exposure", hint: "I've dabbled or read about it" },
  { value: "comfortable", label: "Comfortable with basics", hint: "I want to go deeper" },
];

const TIME_OPTIONS = [
  { value: "10", label: "~10 min / day", hint: "Short daily sessions" },
  { value: "25", label: "~25 min / day", hint: "A solid daily block" },
  { value: "60", label: "1 hour+ / day", hint: "I'm going all in" },
  { value: "weekend", label: "Weekends only", hint: "Longer, less frequent sessions" },
];

const STYLE_OPTIONS = [
  { value: "hands_on", label: "Hands-on projects", hint: "Learn by building" },
  { value: "reading", label: "Read, then quiz me", hint: "Explanations with knowledge checks" },
  { value: "scenarios", label: "Real-world scenarios", hint: "Decisions and case studies" },
  { value: "mix", label: "Mix it up", hint: "A balance of everything" },
];

const MAX_FILE_MB = 10;
const ACCEPTED_TYPES = ".pdf,.md,.txt,.docx";

const STATUS_MESSAGES: Record<GenerationJobStatus, string> = {
  queued: "Queued…",
  outlining: "Mapping the skills you'll need…",
  generating: "Writing lessons, questions, and diagrams…",
  validating: "Checking every question against what's been taught…",
  failed: "Something went wrong.",
  done: "Done!",
};

const POLL_INTERVAL_MS = 2000;

type Step = "outcome" | "knowledge" | "time" | "style" | "sources" | "generating" | "preview";
const FORM_STEPS: Step[] = ["outcome", "knowledge", "time", "style", "sources"];

export function CourseWizard() {
  const [step, setStep] = useState<Step>("outcome");
  const [answers, setAnswers] = useState<WizardAnswers>({
    outcome: "",
    knowledge: "",
    time: "",
    style: "",
    sources: [],
  });
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CourseContent | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<GenerationJobStatus>("queued");
  const [jobError, setJobError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepIndex = FORM_STEPS.indexOf(step);

  async function startGeneration() {
    setJobError(null);
    setJobId(null);
    setJobStatus("queued");
    setStep("generating");
    try {
      const res = await fetch("/api/generation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(answers),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as { jobId: string };
      setJobId(data.jobId);
    } catch {
      setJobError("Could not start generation. Check your connection and try again.");
    }
  }

  // Poll the job row for real stage progress until done or failed.
  useEffect(() => {
    if (step !== "generating" || !jobId || jobError) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      const job = await getGenerationJob(jobId).catch(() => null);
      if (cancelled || !job) return;
      if (job.status === "failed") {
        setJobError(job.error ?? "Something went wrong during generation.");
      } else if (job.status === "done" && job.content) {
        setPreview(job.content);
        setStep("preview");
      } else {
        setJobStatus(job.status);
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [step, jobId, jobError]);

  function canAdvance(): boolean {
    switch (step) {
      case "outcome":
        return answers.outcome.trim().length >= 10;
      case "knowledge":
        return !!answers.knowledge;
      case "time":
        return !!answers.time;
      case "style":
        return !!answers.style;
      case "sources":
        return true; // optional
      default:
        return false;
    }
  }

  function next() {
    if (step === "sources") {
      void startGeneration();
    } else {
      setStep(FORM_STEPS[stepIndex + 1]);
    }
  }

  function back() {
    if (stepIndex > 0) setStep(FORM_STEPS[stepIndex - 1]);
  }

  function addFiles(list: FileList | null) {
    setFileError(null);
    if (!list) return;
    const names: string[] = [];
    for (const file of Array.from(list)) {
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setFileError(`“${file.name}” is over ${MAX_FILE_MB} MB — try a smaller file.`);
        continue;
      }
      names.push(file.name);
    }
    setAnswers((a) => ({ ...a, sources: [...a.sources, ...names] }));
  }

  if (step === "preview" && preview) {
    return (
      <CoursePreview
        content={preview}
        answers={answers}
        onRestart={() => {
          setPreview(null);
          setJobId(null);
          setJobError(null);
          setAnswers({ outcome: "", knowledge: "", time: "", style: "", sources: [] });
          setStep("outcome");
        }}
      />
    );
  }

  if (step === "generating") {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
          {jobError ? (
            <>
              <TriangleAlert className="size-10 text-destructive" aria-hidden />
              <div>
                <h2 className="font-bold">Generation failed</h2>
                <p className="mt-1 break-words text-sm text-muted-foreground">{jobError}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => void startGeneration()}>
                  <Sparkles className="size-4" aria-hidden />
                  Try again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setJobError(null);
                    setJobId(null);
                    setStep("sources");
                  }}
                >
                  Back
                </Button>
              </div>
            </>
          ) : (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              >
                <Sparkles className="size-10 text-brand" aria-hidden />
              </motion.div>
              <div>
                <h2 className="font-bold">Designing your course</h2>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={jobStatus}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-1 text-sm text-muted-foreground"
                  >
                    {STATUS_MESSAGES[jobStatus]}
                  </motion.p>
                </AnimatePresence>
                <p className="mt-2 text-xs text-muted-foreground">
                  This takes a few minutes — a real AI is writing every lesson.
                </p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full w-1/3 rounded-full bg-brand"
                  animate={{ x: ["-100%", "300%"] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      {/* step progress */}
      <div className="flex items-center gap-1.5">
        {FORM_STEPS.map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i <= stepIndex ? "bg-brand" : "bg-muted",
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardContent className="space-y-4 p-5">
              {step === "outcome" && (
                <>
                  <StepHeading
                    title="What do you want to be able to do?"
                    hint="Describe the real-world outcome — not the topic. “Run my own sourdough bakery stall” beats “baking”."
                  />
                  <Textarea
                    value={answers.outcome}
                    onChange={(e) => setAnswers((a) => ({ ...a, outcome: e.target.value }))}
                    placeholder="e.g. Confidently shoot a friend's wedding in manual mode"
                    rows={3}
                    aria-label="Your learning goal"
                  />
                  {answers.outcome.trim().length > 0 && answers.outcome.trim().length < 10 && (
                    <p className="text-xs text-destructive">
                      A few more words — the more specific the goal, the better the course.
                    </p>
                  )}
                </>
              )}

              {step === "knowledge" && (
                <>
                  <StepHeading
                    title="Where are you starting from?"
                    hint="This sets the difficulty of your first lessons."
                  />
                  <OptionList
                    options={KNOWLEDGE_OPTIONS}
                    value={answers.knowledge}
                    onChange={(v) => setAnswers((a) => ({ ...a, knowledge: v }))}
                  />
                </>
              )}

              {step === "time" && (
                <>
                  <StepHeading
                    title="How much time can you give it?"
                    hint="Lessons get sized to fit your real schedule."
                  />
                  <OptionList
                    options={TIME_OPTIONS}
                    value={answers.time}
                    onChange={(v) => setAnswers((a) => ({ ...a, time: v }))}
                  />
                </>
              )}

              {step === "style" && (
                <>
                  <StepHeading
                    title="How do you like to learn?"
                    hint="This shapes the mix of pages in your course."
                  />
                  <OptionList
                    options={STYLE_OPTIONS}
                    value={answers.style}
                    onChange={(v) => setAnswers((a) => ({ ...a, style: v }))}
                  />
                </>
              )}

              {step === "sources" && (
                <>
                  <StepHeading
                    title="Any materials to build from?"
                    hint="Optional — notes, syllabi, or docs you trust. (File contents aren't used yet.)"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_TYPES}
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                    aria-label="Upload source documents"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-sm text-muted-foreground transition-colors hover:border-brand hover:text-foreground"
                  >
                    <Upload className="size-6" aria-hidden />
                    Click to add files ({ACCEPTED_TYPES.replaceAll(",", ", ")} · max {MAX_FILE_MB} MB)
                  </button>
                  {fileError && <p className="text-xs text-destructive">{fileError}</p>}
                  {answers.sources.length > 0 && (
                    <ul className="space-y-1.5">
                      {answers.sources.map((name, i) => (
                        <li
                          key={`${name}-${i}`}
                          className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <FileText className="size-4 shrink-0 text-brand" aria-hidden />
                            <span className="truncate">{name}</span>
                          </span>
                          <button
                            type="button"
                            aria-label={`Remove ${name}`}
                            onClick={() =>
                              setAnswers((a) => ({
                                ...a,
                                sources: a.sources.filter((_, j) => j !== i),
                              }))
                            }
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="size-4" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              <div className="flex justify-between border-t pt-4">
                <Button variant="ghost" size="sm" onClick={back} disabled={stepIndex === 0}>
                  <ArrowLeft className="size-4" aria-hidden />
                  Back
                </Button>
                <Button size="sm" onClick={next} disabled={!canAdvance()}>
                  {step === "sources" ? (
                    <>
                      <Sparkles className="size-4" aria-hidden />
                      Generate my course
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="size-4" aria-hidden />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StepHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <h2 className="font-bold">{title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function OptionList({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; hint: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2" role="radiogroup">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "w-full rounded-lg border p-3 text-left transition-colors",
            value === option.value
              ? "border-brand bg-brand-muted"
              : "hover:border-brand/50 hover:bg-brand-muted/40",
          )}
        >
          <span className="block text-sm font-medium">{option.label}</span>
          <span className="block text-xs text-muted-foreground">{option.hint}</span>
        </button>
      ))}
    </div>
  );
}
```

Note: `WizardAnswers` now lives in `@/lib/types` (it moved in Task 1). Update `components/wizard/course-preview.tsx` accordingly: delete `import type { WizardAnswers } from "./course-wizard";` and add `WizardAnswers` to its `@/lib/types` type import.

- [ ] **Step 7: Delete the canned preview** (its last consumer is gone):

```bash
git rm lib/mock/custom-preview.ts
```

- [ ] **Step 8: Run every test suite so far**

Run: `npx vitest run`
Expected: PASS across validation, core, grading, pipeline, jobs, and pages suites. (The starter-content test doesn't exist yet.)

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: real course generation — job orchestration, route handler with after(), polling wizard"
```

---

### Task 9: Starter-course regeneration through the pipeline + seed refactor

> **Gate:** this task calls the real Anthropic API (Opus 4.8). If `ANTHROPIC_API_KEY` is not in `.env`, STOP and ask your human partner for one before proceeding.

**Files:**
- Rewrite: `lib/data/seed-content.ts` (replace the Task-3 interim version)
- Create: `scripts/generate-starters.ts`
- Create: `lib/data/starter-content.test.ts`
- Create: `lib/data/starter-courses/*.json` (generated output, checked in)
- Delete: `lib/mock/courses/` (all nine files)
- Modify: `.env.example`

- [ ] **Step 1: Rewrite `lib/data/seed-content.ts`**:

```ts
// Upserts the starter-course catalog into course_content. Starter content is
// generated through the real pipeline by scripts/generate-starters.ts and
// checked into lib/data/starter-courses/ as JSON — the pipeline's dogfood
// test. Idempotent: re-running updates content in place and keeps
// is_starter flags intact.

import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Db } from "./core";
import type { CourseContent } from "@/lib/types";
import { validateCourseContent } from "@/lib/validation/course-content";

const STARTER_DIR = path.join(process.cwd(), "lib", "data", "starter-courses");

/** Parsed starter JSON. Validated at seed time and by starter-content.test.ts. */
export function loadStarterCourses(): CourseContent[] {
  if (!fs.existsSync(STARTER_DIR)) return [];
  return fs
    .readdirSync(STARTER_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(STARTER_DIR, f), "utf8")) as CourseContent);
}

export async function seedStarterCourses(db: Db): Promise<void> {
  for (const raw of loadStarterCourses()) {
    const content = validateCourseContent(raw);
    await db
      .insert(schema.courseContent)
      .values({
        contentId: content.contentId,
        title: content.title,
        description: content.description,
        outcome: content.outcome,
        tags: content.tags,
        estimatedHours: content.estimatedHours,
        schemaVersion: 2,
        concepts: content.concepts,
        skillNodes: content.skillNodes,
        lessons: content.lessons,
        isStarter: true,
        createdBy: null,
      })
      .onConflictDoUpdate({
        target: schema.courseContent.contentId,
        set: {
          title: content.title,
          description: content.description,
          outcome: content.outcome,
          tags: content.tags,
          estimatedHours: content.estimatedHours,
          schemaVersion: 2,
          concepts: content.concepts,
          skillNodes: content.skillNodes,
          lessons: content.lessons,
          isStarter: true,
          updatedAt: sql`now()`,
        },
      });
  }
}
```

- [ ] **Step 2: Create `scripts/generate-starters.ts`**:

```ts
// Regenerates the starter-course catalog through the real generation
// pipeline and checks the output into the repo as JSON. Requires
// ANTHROPIC_API_KEY. Run everything or a subset:
//   npx tsx scripts/generate-starters.ts
//   npx tsx scripts/generate-starters.ts git-essentials docker-fundamentals

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import type { WizardAnswers } from "@/lib/types";
import { getModelClient } from "@/lib/generation/client";
import { generateCourse } from "@/lib/generation/pipeline";

interface StarterBrief {
  slug: string;
  answers: WizardAnswers;
}

const BRIEFS: StarterBrief[] = [
  {
    slug: "docker-fundamentals",
    answers: {
      outcome: "Confidently build, run, and debug Docker containers for my team's services",
      knowledge: "beginner",
      time: "25",
      style: "mix",
      sources: [],
    },
  },
  {
    slug: "git-essentials",
    answers: {
      outcome:
        "Use Git day-to-day without fear — branch, merge, resolve conflicts, and recover from mistakes",
      knowledge: "some",
      time: "25",
      style: "mix",
      sources: [],
    },
  },
  {
    slug: "sql-analytics",
    answers: {
      outcome:
        "Answer real business questions by writing my own SQL queries against our analytics database",
      knowledge: "beginner",
      time: "25",
      style: "mix",
      sources: [],
    },
  },
  {
    slug: "python-automation",
    answers: {
      outcome: "Automate boring work tasks (files, spreadsheets, APIs) with small Python scripts",
      knowledge: "some",
      time: "25",
      style: "hands_on",
      sources: [],
    },
  },
  {
    slug: "markdown-basics",
    answers: {
      outcome: "Write clean docs, READMEs, and PR descriptions in Markdown",
      knowledge: "beginner",
      time: "10",
      style: "reading",
      sources: [],
    },
  },
  {
    slug: "ci-cd-pipelines",
    answers: {
      outcome: "Set up and maintain a CI/CD pipeline that tests and deploys our app automatically",
      knowledge: "some",
      time: "25",
      style: "scenarios",
      sources: [],
    },
  },
  {
    slug: "web-dev-foundations",
    answers: {
      outcome: "Build and ship a simple interactive website with HTML, CSS, and JavaScript",
      knowledge: "beginner",
      time: "25",
      style: "hands_on",
      sources: [],
    },
  },
  {
    slug: "linux-command-line",
    answers: {
      outcome:
        "Work efficiently in a Linux terminal — navigate, inspect logs, and manage processes on our servers",
      knowledge: "beginner",
      time: "25",
      style: "mix",
      sources: [],
    },
  },
  {
    slug: "kubernetes-basics",
    answers: {
      outcome: "Deploy and troubleshoot a service on our Kubernetes cluster",
      knowledge: "some",
      time: "25",
      style: "scenarios",
      sources: [],
    },
  },
];

const OUT_DIR = path.join(process.cwd(), "lib", "data", "starter-courses");

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set. Add it to .env or the environment.");
    process.exit(1);
  }
  const requested = process.argv.slice(2);
  const briefs = requested.length > 0 ? BRIEFS.filter((b) => requested.includes(b.slug)) : BRIEFS;
  if (briefs.length === 0) {
    console.error(`No briefs match: ${requested.join(", ")}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const brief of briefs) {
    console.log(`Generating ${brief.slug}…`);
    const content = await generateCourse(getModelClient(), brief.answers, {
      contentId: `content-${brief.slug}`,
      onStatus: (status) => console.log(`  ${brief.slug}: ${status}`),
    });
    const file = path.join(OUT_DIR, `${brief.slug}.json`);
    fs.writeFileSync(file, JSON.stringify(content, null, 2) + "\n");
    console.log(`  wrote ${file} (${content.lessons.length} lessons)`);
  }
}

main().catch((err) => {
  console.error("Generation failed:", err);
  process.exit(1);
});
```

- [ ] **Step 3: Create `lib/data/starter-content.test.ts`** (fails until generation runs — that's the forcing function):

```ts
// @vitest-environment node
// CI gate: the checked-in starter catalog exists and passes the full
// schema-v2 validator (structure + pedagogy).

import { describe, expect, it } from "vitest";
import { validateCourseContent } from "@/lib/validation/course-content";
import { loadStarterCourses } from "./seed-content";

describe("starter catalog content", () => {
  it("has pipeline-generated starter courses checked in", () => {
    expect(loadStarterCourses().length).toBeGreaterThan(0);
  });

  it("every starter course passes full validation", () => {
    for (const content of loadStarterCourses()) {
      expect(() => validateCourseContent(content)).not.toThrow();
    }
  });
});
```

- [ ] **Step 4: Delete the old mock courses**

```bash
git rm -r lib/mock
```

(Verify nothing imports `@/lib/mock` anymore: `grep -rn "lib/mock" app components lib scripts` should return nothing.)

- [ ] **Step 5: Add the key to `.env.example`** (append):

```
# Anthropic API key — course generation (Opus) and open-ended grading (Haiku).
ANTHROPIC_API_KEY=
```

- [ ] **Step 6: Generate the starter courses** (requires the key; runs the real pipeline — one course per run is fine if you want to check quality first):

```bash
npx tsx scripts/generate-starters.ts markdown-basics
```

Inspect `lib/data/starter-courses/markdown-basics.json` (spot-check: pages read well, distractors have misconceptions). Then generate the rest:

```bash
npx tsx scripts/generate-starters.ts
```

Expected: nine JSON files in `lib/data/starter-courses/`. This costs real money and takes a while (each course = 1 outline + one call per lesson at concurrency 3, with up to 2 repairs per lesson).

- [ ] **Step 7: Run the starter and core tests**

Run: `npx vitest run lib/data/starter-content.test.ts lib/data/core.test.ts`
Expected: PASS — the starter JSON validates and the seeded catalog matches it.

- [ ] **Step 8: Seed the dev database**

Run: `npm run db:seed`
Expected: "Starter catalog seeded (9 courses)" with the new content ids.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: regenerate starter catalog through the pipeline; JSON-backed seed"
```

---

### Task 10: Full verification and finish

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: PASS, no skips.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: clean (fix anything it flags).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: succeeds. This is the first point the whole app typechecks — expect to fix small leftovers here (stale imports of deleted modules, missed renames). Grep helpers: `grep -rn "completeActivity\|ActivityCompletionResult\|completedActivityIds\|ActivityPlayer\|activity-player\|lib/mock" app components lib`.

- [ ] **Step 4: Live smoke test (browser)**

Start the dev server (use the `.claude/launch.json` config / preview tooling, not a raw shell):
1. Sign in, open `/catalog` — starter courses show with lesson counts.
2. Add a starter course, open a lesson — text, diagram (Mermaid renders), MCQ, matching, typing pages all work; XP toasts on question pages only.
3. Answer the open-ended page — with `ANTHROPIC_API_KEY` set, real Haiku grading returns a verdict; without it, the self-assessment fallback appears.
4. Run the wizard end-to-end — real generation with live stage progress, then the preview renders and "Add to My Learning" works. (This costs one Opus course generation.)

- [ ] **Step 5: Self-review against the design spec** (`docs/superpowers/specs/2026-07-17-page-based-lessons-and-generation-design.md`): walk §1–§7 and confirm each requirement maps to shipped code. Known intentional deviations to double-check, not silently accept: none.

- [ ] **Step 6: Finish the branch**

Use superpowers:finishing-a-development-branch (verify tests, then present merge/PR options).

---

## Plan self-review (author)

- **Spec coverage:** §1 schema → Tasks 1–3; §1 validation checks 1–5 → Task 2; §1 progress/XP → Task 3; §2 player + grading → Tasks 4–5; §3 pipeline/stages/jobs/orchestration → Tasks 6–8; §3 starter courses → Task 9; §4 enforcement map → Tasks 2/6/7; §5 migration → Task 3; §6 error handling → Tasks 4 (grading fallback), 5 (Mermaid fallback, placeholder page), 7–8 (repair bound, failed jobs, no partial saves); §7 testing → every TDD task + Task 9 CI test.
- **Known judgment calls:** XP fixed per question type (10/15/10/20) server-side; mastery counts only correct outcomes (an incorrect completion caps a node's mastery — per spec "full/no mastery credit"); background mechanism = Route Handler + `after()` + `maxDuration=800`; two-step drizzle migration to avoid interactive rename prompts; model never emits page ids/xp (pipeline injects).
- **Type consistency:** checked — `completePage`/`PageOutcome`/`PageCompletionResult`, `ModelClient.generate`, `GenerationJobView`, fixture ids (`l1-p1`…`l2-p4`, nodes `n1`/`n2`) used consistently across tasks.





