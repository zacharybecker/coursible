"use client";

import { useEffect, useState } from "react";
import type { Course, CourseProgress } from "@/lib/types";
import { getAllProgress, getCourses } from "@/lib/data/repository";
import { useAppStore } from "@/lib/store/app-store";

export interface LibraryData {
  courses: Course[];
  progressByCourse: Record<string, CourseProgress>;
  loaded: boolean;
}

/** The user's course library + progress, refreshed after any data write. */
export function useLibrary(): LibraryData {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const [data, setData] = useState<LibraryData>({
    courses: [],
    progressByCourse: {},
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCourses(), getAllProgress()]).then(([courses, progress]) => {
      if (cancelled) return;
      const progressByCourse: Record<string, CourseProgress> = {};
      for (const p of progress) progressByCourse[p.courseId] = p;
      setData({ courses, progressByCourse, loaded: true });
    });
    return () => {
      cancelled = true;
    };
  }, [dataVersion]);

  return data;
}
