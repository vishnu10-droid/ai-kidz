import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Loader2, PlayCircle, RotateCcw, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardShell, Empty, Panel, ProgressBar } from "@/components/dash/DashboardShell";
import { ErrorNote, LoadingGrid } from "@/components/dash/DashSections";
import { Button } from "@/components/ui/button";
import { dashQuery, post, remove } from "@/lib/dash.api";
import type { EnrollmentRow } from "@/lib/dash.api";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

type CompletionResult = {
  xpAwarded?: number;
  badgeAwarded?: string | null;
  certificate?: { code: string } | null;
};

export const Route = createFileRoute("/_authenticated/student/learn/$slug")({
  head: ({ params }) => ({
    meta: [
      ...pageMeta(`Learn ${params.slug.replace(/-/g, " ")}`, "Your AIKIDZ lessons and progress."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Learn,
});

function Learn() {
  const { slug } = Route.useParams();
  const qc = useQueryClient();
  const course = useQuery(
    dashQuery<EnrollmentRow>(["student", "course", slug], `/api/student/courses/${slug}`),
  );
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const data = course.data;
  const lessons = data?.lessons ?? [];
  const current =
    lessons.find((lesson) => lesson.id === picked) ??
    lessons.find((lesson) => !lesson.completed) ??
    lessons[0];

  async function toggleLesson(lessonId: string, completed: boolean) {
    if (!data) return;
    setBusy(true);
    try {
      const path = `/api/student/courses/${data.course.id}/lessons/${lessonId}/complete`;
      if (completed) {
        await remove(path);
        toast.success("Lesson marked incomplete");
      } else {
        const result = await post<CompletionResult>(path, {});
        if (result.certificate?.code) {
          toast.success(`Course complete! Certificate ${result.certificate.code} is ready.`);
        } else if (result.xpAwarded) {
          toast.success(`Lesson completed! +${result.xpAwarded} XP`);
        } else {
          toast.success("Lesson completed!");
        }
        if (result.badgeAwarded) toast.success("🎖️ New badge unlocked!");
      }
      await qc.invalidateQueries({ queryKey: ["student"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the lesson");
    } finally {
      setBusy(false);
    }
  }

  if (course.isLoading) {
    return (
      <DashboardShell role="student" title="Loading course">
        <LoadingGrid rows={1} />
      </DashboardShell>
    );
  }

  if (course.isError || !data) {
    return (
      <DashboardShell role="student" title="Course unavailable">
        <Empty>
          {course.isError ? (
            <ErrorNote
              message={
                course.error instanceof Error
                  ? course.error.message
                  : "You are not enrolled in this course."
              }
            />
          ) : null}
          <div className="mt-4">
            <Button asChild variant="brand">
              <Link to="/student/courses">Back to my courses</Link>
            </Button>
          </div>
        </Empty>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      role="student"
      title={data.course.title}
      subtitle={`${data.completedLessons} of ${data.totalLessons} lessons complete`}
      actions={
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link to="/student/courses">All my courses</Link>
        </Button>
      }
    >
      <div className="glass-panel mb-6 flex items-center gap-4 rounded-3xl p-5">
        <ProgressBar value={data.progress} />
        <span className="font-display text-2xl font-extrabold tabular-nums">{data.progress}%</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {current ? (
          <Panel title={current.title}>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Lesson {(lessons.findIndex((lesson) => lesson.id === current.id) ?? 0) + 1} of{" "}
              {lessons.length} · {current.duration_minutes ?? current.duration_min ?? 15} min
            </div>

            {current.video_url ? (
              <div className="mt-4 overflow-hidden rounded-2xl border bg-black/80">
                <video
                  controls
                  preload="metadata"
                  className="aspect-video w-full"
                  src={current.video_url}
                />
              </div>
            ) : null}

            <p className="mt-4 whitespace-pre-line leading-relaxed text-foreground/90">
              {current.content || "The lesson notes for this one are still being written."}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t pt-5">
              {current.completed ? (
                <>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-mint">
                    <CheckCircle2 className="size-4" /> Lesson completed
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    disabled={busy}
                    onClick={() => void toggleLesson(current.id, true)}
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RotateCcw className="size-4" />
                    )}{" "}
                    Mark incomplete
                  </Button>
                </>
              ) : (
                <Button
                  variant="brand"
                  disabled={busy}
                  onClick={() => void toggleLesson(current.id, false)}
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}{" "}
                  Mark as complete
                </Button>
              )}
              {current.video_url ? (
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <a href={current.video_url} target="_blank" rel="noreferrer">
                    <Video className="size-4" /> Open video
                  </a>
                </Button>
              ) : null}
            </div>
          </Panel>
        ) : (
          <Empty>This course has no lessons yet.</Empty>
        )}

        <Panel title="Lessons">
          <ol className="space-y-1">
            {lessons.map((lesson) => {
              const active = current?.id === lesson.id;
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(lesson.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition",
                      active ? "bg-primary/10 font-semibold text-primary" : "hover:bg-secondary/60",
                    )}
                  >
                    {lesson.completed ? (
                      <CheckCircle2 className="size-4 shrink-0 text-mint" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {lesson.duration_minutes ?? lesson.duration_min ?? 15}m
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 border-t pt-4">
            <Button asChild variant="outline" size="sm" className="w-full rounded-full">
              <Link to="/student/quizzes">
                <PlayCircle className="size-4" /> Take a quiz
              </Link>
            </Button>
          </div>
        </Panel>
      </div>
    </DashboardShell>
  );
}
