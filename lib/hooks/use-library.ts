"use client";

import { useCallback, useEffect, useState } from "react";
import type { Course, CourseProgress } from "@/lib/types";
import { getLibrary } from "@/lib/data/actions";
import { useAppStore } from "@/lib/store/app-store";

export interface LibraryData {
  courses: Course[];
  progressByCourse: Record<string, CourseProgress>;
  loaded: boolean;
  /** True when the last load failed; call retry() to reload. */
  error: boolean;
  retry: () => void;
}

/** The user's course library + progress, refreshed after any data write. */
export function useLibrary(): LibraryData {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<Omit<LibraryData, "retry">>({
    courses: [],
    progressByCourse: {},
    loaded: false,
    error: false,
  });

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    getLibrary()
      .then(({ courses, progress }) => {
        if (cancelled) return;
        const progressByCourse: Record<string, CourseProgress> = {};
        for (const p of progress) progressByCourse[p.courseId] = p;
        setData({ courses, progressByCourse, loaded: true, error: false });
      })
      .catch(() => {
        if (!cancelled) setData((prev) => ({ ...prev, loaded: true, error: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [dataVersion, attempt]);

  return { ...data, retry };
}
