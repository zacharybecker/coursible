// Drizzle schema: Better Auth core tables + app tables.
// Course content is stored as validated jsonb (see lib/validation/course-content.ts);
// the skill graph and lessons are consumed whole by the player, so exploding them
// into relational tables would add joins with no query benefit.

import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
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

// ---------- Better Auth tables (managed via its Drizzle adapter) ----------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ---------- App tables ----------

/** Immutable controlled-JSON course content; `is_starter` rows form the catalog. */
export const courseContent = pgTable("course_content", {
  contentId: text("content_id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  outcome: text("outcome").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull(),
  estimatedHours: integer("estimated_hours").notNull(),
  skillNodes: jsonb("skill_nodes").$type<SkillNode[]>().notNull(),
  lessons: jsonb("lessons").$type<Lesson[]>().notNull(),
  schemaVersion: integer("schema_version").default(2).notNull(),
  concepts: jsonb("concepts").$type<Concept[]>().notNull(),
  isStarter: boolean("is_starter").default(false).notNull(),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  /** Pre-provisioned for slice-3 publish-updates. */
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Minimal pre-provision for slice-3 sharing/cohorts. */
export const cohorts = pgTable("cohorts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  contentId: text("content_id")
    .notNull()
    .references(() => courseContent.contentId),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** A course instance in a user's library. */
export const courses = pgTable(
  "courses",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contentId: text("content_id")
      .notNull()
      .references(() => courseContent.contentId),
    source: text("source").$type<CourseSource>().notNull(),
    status: text("status").$type<CourseStatus>().default("active").notNull(),
    cohortId: text("cohort_id").references(() => cohorts.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("courses_user_id_status_idx").on(table.userId, table.status)],
);

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

/** 1:1 with courses. Lesson completion is derived from page_completions. */
export const courseProgress = pgTable("course_progress", {
  courseId: text("course_id")
    .primaryKey()
    .references(() => courses.id, { onDelete: "cascade" }),
  masteryByNode: jsonb("mastery_by_node").$type<Record<string, number>>().notNull(),
  xpEarned: integer("xp_earned").default(0).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
});

/** 1:1 with users; created on first sign-in via a Better Auth database hook. */
export const userStats = pgTable("user_stats", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  totalXp: integer("total_xp").default(0).notNull(),
  xpToday: integer("xp_today").default(0).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  /** UTC day (YYYY-MM-DD) of the most recent study day. */
  lastStudyDate: date("last_study_date"),
});
