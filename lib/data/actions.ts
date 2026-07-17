"use server";

// Server Actions: the app's entire data API. Same names and signatures as the
// prototype's repository so components and hooks only change an import path.
// Each action resolves the user from the session (never from the client),
// validates inputs with Zod, and delegates to lib/data/core.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type {
  ActivityCompletionResult,
  ActivityOutcome,
  Course,
  CourseContent,
  CourseProgress,
  CourseSource,
  CourseStatus,
  UserStats,
} from "@/lib/types";
import { courseContentSchema } from "@/lib/validation/course-content";
import { customCoursePreview } from "@/lib/mock/custom-preview";
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
const outcomeSchema = z.enum(["correct", "incorrect", "needs_review"]);

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

/** The wizard's preview stays canned this slice; generation lands in slice 2. */
export async function getCustomCoursePreview(): Promise<CourseContent> {
  await requireUser();
  return customCoursePreview;
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

export async function completeActivity(
  courseId: string,
  lessonId: string,
  activityId: string,
  outcome: ActivityOutcome,
): Promise<ActivityCompletionResult | null> {
  const userId = await requireUser();
  return core.completeActivity(
    db,
    userId,
    idSchema.parse(courseId),
    idSchema.parse(lessonId),
    idSchema.parse(activityId),
    outcomeSchema.parse(outcome),
  );
}
