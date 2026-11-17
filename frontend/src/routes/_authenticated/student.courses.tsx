import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, PlayCircle } from "lucide-react";
import { DashboardShell, ProgressBar } from "@/components/dash/DashboardShell";
import { EmptyState, ErrorNote, LoadingGrid } from "@/components/dash/DashSections";
import { Button } from "@/components/ui/button";
import { dashQuery } from "@/lib/dash.api";
import type { EnrollmentRow } from "@/lib/dash.api";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/student/courses")({
  head: () => ({
    meta: [
      ...pageMeta("My Courses", "Every AIKIDZ course you are enrolled in."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentCourses,
});

function StudentCourses() {
  const courses = useQuery(
    dashQuery<EnrollmentRow[]>(["student", "courses"], "/api/student/courses"),
  );

  return (
    <DashboardShell
      role="student"
      title="My courses"
      subtitle="Pick up where you left off — every course tracks your lesson progress."
    >
      {courses.isLoading ? (
        <LoadingGrid rows={1} />
      ) : courses.isError ? (
        <ErrorNote message="Could not load your courses. Please refresh." />
      ) : (courses.data ?? []).length === 0 ? (
        <EmptyState>
          You're not enrolled in any course yet. Ask your teacher or school to enrol you.
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {(courses.data ?? []).map((row) => (
            <div
              key={row.enrollmentId}
              className="glass-panel flex flex-col rounded-3xl border p-5"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground">
                  <BookOpen className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold leading-tight">{row.course.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.course.level ?? "All levels"} · {row.course.duration ?? "Self paced"}
                  </p>
                </div>
              </div>

              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                {row.course.short_description ?? ""}
              </p>

              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">
                    {row.completedLessons}/{row.totalLessons} lessons
                  </span>
                  <span className="tabular-nums">{row.progress}%</span>
                </div>
                <ProgressBar value={row.progress} />
              </div>

              <div className="mt-5 flex items-center gap-2">
                <Button asChild variant="brand" size="sm" className="rounded-full">
                  <Link to="/student/learn/$slug" params={{ slug: row.course.slug }}>
                    <PlayCircle className="size-4" />{" "}
                    {row.progress > 0 ? "Resume" : "Start learning"}
                  </Link>
                </Button>
                {row.progress >= 100 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-mint">
                    <CheckCircle2 className="size-4" /> Completed
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
