// Shared domain types for the learning app.
// These mirror the "controlled JSON" course schema from the MVP spec so the
// same shapes can later be produced by the real generation pipeline.

// ---------- Activities ----------

export interface KnowledgeCheckOption {
  id: string;
  text: string;
}

export interface KnowledgeCheckQuestion {
  id: string;
  prompt: string;
  options: KnowledgeCheckOption[];
  correctOptionId: string;
  /** Shown after answering, right or wrong. */
  explanation: string;
}

export interface ExplanationCheckActivity {
  type: "explanation_check";
  id: string;
  title: string;
  skillNodeId: string;
  xp: number;
  /** Explanation content. Paragraphs separated by blank lines; supports **bold** and `code`. */
  content: string;
  questions: KnowledgeCheckQuestion[];
}

export interface ScenarioChoice {
  id: string;
  text: string;
  /** What happens if the learner picks this. */
  outcome: string;
  /** Why this was right or wrong. */
  rationale: string;
  correct: boolean;
}

export interface ScenarioDecisionActivity {
  type: "scenario_decision";
  id: string;
  title: string;
  skillNodeId: string;
  xp: number;
  scenario: string;
  choices: ScenarioChoice[];
}

export interface ChecklistItem {
  id: string;
  text: string;
}

export interface AppliedTaskActivity {
  type: "applied_task";
  id: string;
  title: string;
  skillNodeId: string;
  xp: number;
  prompt: string;
  submissionType: "command" | "checklist";
  /**
   * For "command" submissions: case-insensitive regex sources; the submission
   * must match every pattern to pass. Mock rule-matching, not real evaluation.
   */
  expectedPatterns?: string[];
  /** For "checklist" submissions: all items must be checked to pass. */
  checklist?: ChecklistItem[];
  successFeedback: string;
  /** Shown when a command submission doesn't match ("needs review", not failure). */
  reviewFeedback: string;
}

export interface TutorSampleMessage {
  role: "tutor" | "learner";
  text: string;
}

export interface AiTutorConversationActivity {
  type: "ai_tutor_conversation";
  id: string;
  title: string;
  skillNodeId: string;
  xp: number;
  description: string;
  /** Static preview transcript — not functional in the prototype. */
  sampleMessages: TutorSampleMessage[];
}

export interface SpacedReviewActivity {
  type: "spaced_review";
  id: string;
  title: string;
  skillNodeId: string;
  xp: number;
  description: string;
  /** Concepts this review session would cover — preview only. */
  reviewItems: string[];
}

export type Activity =
  | ExplanationCheckActivity
  | ScenarioDecisionActivity
  | AppliedTaskActivity
  | AiTutorConversationActivity
  | SpacedReviewActivity;

export type ActivityType = Activity["type"];

// ---------- Course structure ----------

export interface Lesson {
  id: string;
  title: string;
  description: string;
  skillNodeId: string;
  estimatedMinutes: number;
  activities: Activity[];
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

/** Immutable course content — what the generation pipeline would produce. */
export interface CourseContent {
  /** Stable content identity; shared across copies and cohort members. */
  contentId: string;
  title: string;
  description: string;
  /** The real-world outcome this course targets. */
  outcome: string;
  tags: string[];
  estimatedHours: number;
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

export type ActivityOutcome = "correct" | "incorrect" | "needs_review";

export interface LessonProgress {
  lessonId: string;
  completedActivityIds: string[];
  completed: boolean;
}

export interface CourseProgress {
  courseId: string;
  /** 0-100 mastery per skill node id. */
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

/** Result of completing one activity — what the UI celebrates. */
export interface ActivityCompletionResult {
  outcome: ActivityOutcome;
  xpAwarded: number;
  /** New mastery value (0-100) for the activity's skill node. */
  nodeMastery: number;
  /** True if this completion extended the streak (first activity today). */
  streakExtended: boolean;
  currentStreak: number;
  lessonCompleted: boolean;
  courseCompleted: boolean;
}
