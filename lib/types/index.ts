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
