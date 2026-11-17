import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, ClipboardList, PlayCircle } from "lucide-react";
import { DashboardShell } from "@/components/dash/DashboardShell";
import { EmptyState, ErrorNote, LoadingGrid } from "@/components/dash/DashSections";
import { Button } from "@/components/ui/button";
import { dashQuery } from "@/lib/dash.api";
import type { QuizRow } from "@/lib/dash.api";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/student/quizzes/")({
  head: () => ({
    meta: [
      ...pageMeta("Quizzes", "Test what you learned in AIKIDZ courses."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentQuizzes,
});

function StudentQuizzes() {
  const quizzes = useQuery(dashQuery<QuizRow[]>(["student", "quizzes"], "/api/student/quizzes"));

  return (
    <DashboardShell
      role="student"
      title="Quizzes"
      subtitle="Short checks after each module — retake them any time."
    >
      {quizzes.isLoading ? (
        <LoadingGrid rows={1} />
      ) : quizzes.isError ? (
        <ErrorNote message="Could not load quizzes. Please refresh." />
      ) : (quizzes.data ?? []).length === 0 ? (
        <EmptyState>No quizzes available yet. They appear as your courses progress.</EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {(quizzes.data ?? []).map((quiz) => {
            const courseTitle =
              typeof quiz.course_id === "object" && quiz.course_id
                ? quiz.course_id.title
                : undefined;
            return (
              <div key={quiz.id} className="glass-panel flex flex-col rounded-3xl border p-5">
                <span className="grid size-11 place-items-center rounded-2xl bg-violet/10 text-violet">
                  <ClipboardList className="size-5" />
                </span>
                <p className="mt-3 font-display text-lg font-bold leading-tight">{quiz.title}</p>
                <p className="text-xs text-muted-foreground">{courseTitle ?? "AIKIDZ course"}</p>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {quiz.description ?? ""}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-secondary/60 px-2.5 py-0.5 font-semibold">
                    {quiz.questionCount} questions
                  </span>
                  {quiz.attempts > 0 ? (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 font-semibold",
                        (quiz.bestScore ?? 0) >= 50
                          ? "bg-mint/15 text-mint"
                          : "bg-destructive/10 text-destructive",
                      )}
                    >
                      Best {quiz.bestScore ?? 0}%
                    </span>
                  ) : (
                    <span className="rounded-full bg-sun/15 px-2.5 py-0.5 font-semibold text-sun-foreground">
                      Not attempted
                    </span>
                  )}
                </div>

                <div className="mt-auto pt-5">
                  <Button asChild variant="brand" size="sm" className="rounded-full">
                    <Link to="/student/quizzes/$id" params={{ id: quiz.id }}>
                      <PlayCircle className="size-4" />{" "}
                      {quiz.attempts > 0 ? "Retake quiz" : "Start quiz"}
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Award className="size-4" />
        Pass with 50% or more. Your best score is shown on each card.
      </div>
    </DashboardShell>
  );
}
