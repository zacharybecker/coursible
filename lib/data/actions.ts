"use server";

// Server Actions: the app's entire data API. Each action resolves the user
// from the session (never from the client), validates inputs with Zod, and
// delegates to lib/data/core (and lib/generation for AI-backed actions).

import { cache } from "react";
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
  GradeResponse,
  PageCompletionResult,
  PageOutcome,
  UserStats,
} from "@/lib/types";
import { courseContentSchema } from "@/lib/validation/course-content";
import { getModelClient } from "@/lib/generation/client";
import { gradeWithFallback } from "@/lib/generation/grading";
import * as core from "./core";

// Memoized for the lifetime of a request so multiple reads in one Server
// Component / action render resolve the session once, not per call.
const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** Authoritative auth check: session → user id. Redirects when signed out. */
async function requireUser(): Promise<string> {
  const session = await getSession();
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

/** Course + progress in one round-trip (one session lookup, one owned-course load). */
export async function getCourseView(
  courseId: string,
): Promise<{ course: Course; progress: CourseProgress | null } | null> {
  const userId = await requireUser();
  return core.getCourseView(db, userId, idSchema.parse(courseId));
}

export async function getAllProgress(): Promise<CourseProgress[]> {
  const userId = await requireUser();
  return core.getAllProgress(db, userId);
}

/**
 * The whole library dashboard in one round-trip. Client pages dispatch Server
 * Actions sequentially, so bundling the two reads here (run in parallel
 * server-side) collapses two round-trips and two session lookups into one.
 */
export async function getLibrary(): Promise<{
  courses: Course[];
  progress: CourseProgress[];
}> {
  const userId = await requireUser();
  const [courses, progress] = await Promise.all([
    core.getCourses(db, userId),
    core.getAllProgress(db, userId),
  ]);
  return { courses, progress };
}

export async function getUserStats(): Promise<UserStats> {
  const userId = await requireUser();
  return core.getUserStats(db, userId);
}

export async function getStarterCatalog(): Promise<CourseContent[]> {
  await requireUser();
  return core.getStarterCatalog(db);
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
