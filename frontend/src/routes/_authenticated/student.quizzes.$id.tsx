import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardShell, Panel } from "@/components/dash/DashboardShell";
import { EmptyState, ErrorNote, LoadingGrid } from "@/components/dash/DashSections";
import { Button } from "@/components/ui/button";
import { dashQuery, dateLabel, post } from "@/lib/dash.api";
import type { QuizDetail } from "@/lib/dash.api";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/student/quizzes/$id")({
  head: () => ({
    meta: [
      ...pageMeta("Quiz", "Answer the questions and see your score instantly."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuizRunner,
});

type Result = {
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  xpAwarded?: number;
  badgeAwarded?: string | null;
};

function QuizRunner() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const quiz = useQuery(
    dashQuery<QuizDetail>(["student", "quiz", id], `/api/student/quizzes/${id}`),
  );

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const questions = quiz.data?.questions ?? [];
  const answered = Object.keys(answers).length;
  const best = quiz.data?.attempts.length
    ? Math.max(...quiz.data.attempts.map((attempt) => Number(attempt.score || 0)))
    : null;

  async function submit() {
    if (answered < questions.length) {
      toast.error(`Answer all ${questions.length} questions before submitting`);
      return;
    }
    setSubmitting(true);
    try {
      const payload = questions.map((question) => answers[question.index] ?? -1);
      const response = await post<Result>(`/api/student/quizzes/${id}/submit`, {
        answers: payload,
      });
      setResult(response);
      toast.success(
        `${
          response.passed
            ? `Passed with ${response.score}%`
            : `Scored ${response.score}% — try again`
        }${response.xpAwarded ? ` · +${response.xpAwarded} XP` : ""}`,
      );
      if (response.badgeAwarded) toast.success("🎖️ Quiz Ace badge unlocked!");
      await qc.invalidateQueries({ queryKey: ["student"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit the quiz");
    } finally {
      setSubmitting(false);
    }
  }

  function retake() {
    setAnswers({});
    setResult(null);
    void quiz.refetch();
  }

  const courseTitle =
    typeof quiz.data?.course_id === "object" && quiz.data.course_id
      ? quiz.data.course_id.title
      : undefined;

  if (quiz.isLoading) {
    return (
      <DashboardShell role="student" title="Loading quiz">
        <LoadingGrid rows={1} />
      </DashboardShell>
    );
  }

  if (quiz.isError || !quiz.data) {
    return (
      <DashboardShell role="student" title="Quiz unavailable">
        <ErrorNote
          message={
            quiz.error instanceof Error ? quiz.error.message : "This quiz could not be loaded."
          }
        />
        <div className="mt-4">
          <Button asChild variant="brand">
            <Link to="/student/quizzes">Back to quizzes</Link>
          </Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      role="student"
      title={quiz.data.title}
      subtitle={`${courseTitle ?? "AIKIDZ"} · ${questions.length} questions${
        best != null ? ` · best score ${best}%` : ""
      }`}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => void navigate({ to: "/student/quizzes" })}
          >
            <ArrowLeft className="size-4" /> All quizzes
          </Button>
          {result || Object.keys(answers).length > 0 ? (
            <Button variant="ghost" size="sm" className="rounded-full" onClick={retake}>
              <RotateCcw className="size-4" /> Restart
            </Button>
          ) : null}
        </>
      }
    >
      {result ? (
        <div className="glass-panel mb-6 rounded-3xl border p-6 text-center">
          <span
            className={cn(
              "mx-auto grid size-16 place-items-center rounded-full",
              result.passed ? "bg-mint/15 text-mint" : "bg-destructive/10 text-destructive",
            )}
          >
            {result.passed ? <Award className="size-8" /> : <XCircle className="size-8" />}
          </span>
          <p className="mt-4 font-display text-4xl font-extrabold tabular-nums">{result.score}%</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.correct} of {result.total} correct ·{" "}
            {result.passed ? "Passed" : "Keep practising"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            The pass mark is 50%. Your best score is saved on the quizzes page.
          </p>
        </div>
      ) : null}

      {quiz.data.description ? (
        <p className="mb-4 text-sm text-muted-foreground">{quiz.data.description}</p>
      ) : null}

      <div className="space-y-4">
        {questions.map((question) => (
          <Panel
            key={question.index}
            title={`Question ${question.index + 1}`}
            description={result ? "Your answer is locked in." : undefined}
          >
            <p className="text-sm font-medium leading-relaxed">{question.question}</p>
            <div className="mt-4 grid gap-2">
              {question.options.map((option, optionIndex) => {
                const selected = answers[question.index] === optionIndex;
                return (
                  <button
                    key={optionIndex}
                    type="button"
                    disabled={Boolean(result)}
                    onClick={() =>
                      setAnswers((previous) => ({ ...previous, [question.index]: optionIndex }))
                    }
                    aria-pressed={selected}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition",
                      selected
                        ? "border-primary bg-primary/10 font-semibold text-primary"
                        : "glass-tile hover:border-primary/40",
                      result && "opacity-70",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <span className="min-w-0 flex-1">{option}</span>
                    {selected ? <CheckCircle2 className="size-4 shrink-0" /> : null}
                  </button>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>

      {questions.length === 0 ? (
        <EmptyState>This quiz has no questions yet.</EmptyState>
      ) : (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {answered} of {questions.length} answered
          </p>
          {result ? (
            <Button variant="brand" className="rounded-full" onClick={retake}>
              <RotateCcw className="size-4" /> Retake quiz
            </Button>
          ) : (
            <Button
              variant="brand"
              className="rounded-full"
              disabled={submitting || answered < questions.length}
              onClick={() => void submit()}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ClipboardList className="size-4" />
              )}
              {submitting ? "Scoring…" : "Submit quiz"}
            </Button>
          )}
        </div>
      )}

      {(quiz.data.attempts ?? []).length > 0 ? (
        <Panel title="Previous attempts" className="mt-6">
          <ul className="divide-y">
            {(quiz.data.attempts ?? []).map((attempt) => (
              <li key={attempt.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full",
                    attempt.passed ? "bg-mint/15 text-mint" : "bg-destructive/10 text-destructive",
                  )}
                >
                  {attempt.passed ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <XCircle className="size-3.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {dateLabel(attempt.createdAt, true)}
                </span>
                <span className="font-semibold tabular-nums">{attempt.score}%</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </DashboardShell>
  );
}
