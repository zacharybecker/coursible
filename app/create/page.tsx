import { CourseWizard } from "@/components/wizard/course-wizard";

export default function CreatePage() {
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold tracking-tight">Create a course</h1>
        <p className="text-sm text-muted-foreground">
          Tell us the outcome you're after — we'll design the path to it.
        </p>
      </div>
      <CourseWizard />
    </div>
  );
}
