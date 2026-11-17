import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, ExternalLink, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/dash/AdminBits";
import { DashboardShell, Panel } from "@/components/dash/DashboardShell";
import { FormDialog } from "@/components/dash/DashKit";
import { EmptyState, ErrorNote, LoadingGrid } from "@/components/dash/DashSections";
import { Button } from "@/components/ui/button";
import { dashQuery, dateLabel, post } from "@/lib/dash.api";
import type { AssignmentRow } from "@/lib/dash.api";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/student/assignments")({
  head: () => ({
    meta: [
      ...pageMeta("Assignments", "Submit your AIKIDZ homework and review feedback."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentAssignments,
});

function StudentAssignments() {
  const qc = useQueryClient();
  const assignments = useQuery(
    dashQuery<AssignmentRow[]>(["student", "assignments"], "/api/student/assignments"),
  );
  const [submitting, setSubmitting] = useState<AssignmentRow | null>(null);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["student"] });

  async function submit(values: Record<string, string>) {
    if (!submitting) return;
    const content = values["content"]?.trim() ?? "";
    const projectUrl = values["projectUrl"]?.trim() ?? "";
    const fileUrl = values["fileUrl"]?.trim() ?? "";
    if (!content && !projectUrl && !fileUrl) {
      toast.error("Add your work, a project link or a file before submitting");
      return;
    }
    const result = await post<{ xpAwarded?: number; badgeAwarded?: string | null }>(
      `/api/student/assignments/${submitting.id}/submit`,
      { content, projectUrl, fileUrl },
    );
    toast.success(
      result.xpAwarded ? `Assignment submitted! +${result.xpAwarded} XP` : "Assignment submitted!",
    );
    if (result.badgeAwarded) toast.success("🎖️ Assignment Hero badge unlocked!");
    setSubmitting(null);
    refresh();
  }

  const pending = (assignments.data ?? []).filter((row) => !row.submission);
  const done = (assignments.data ?? []).filter((row) => Boolean(row.submission));

  return (
    <DashboardShell
      role="student"
      title="Assignments"
      subtitle="Submit your work, then check marks and teacher feedback here."
    >
      {assignments.isLoading ? (
        <LoadingGrid rows={2} />
      ) : assignments.isError ? (
        <ErrorNote message="Could not load assignments. Please refresh." />
      ) : (assignments.data ?? []).length === 0 ? (
        <EmptyState>No assignments for your batch yet.</EmptyState>
      ) : (
        <div className="space-y-6">
          <Panel title={`Pending (${pending.length})`} description="Submit text, a link, or both.">
            {pending.length === 0 ? (
              <EmptyState>You're all caught up — nothing pending.</EmptyState>
            ) : (
              <div className="space-y-4">
                {pending.map((assignment) => (
                  <div key={assignment.id} className="glass-tile rounded-2xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{assignment.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {assignment.batch_id?.name ?? "Your batch"} · due{" "}
                          {dateLabel(assignment.due_date)} · {assignment.max_marks ?? 100} marks
                        </p>
                      </div>
                      <Button
                        variant="brand"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setSubmitting(assignment)}
                      >
                        <Send className="size-4" /> Submit work
                      </Button>
                    </div>
                    {assignment.description ? (
                      <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                        {assignment.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={`Submitted & graded (${done.length})`}>
            {done.length === 0 ? (
              <EmptyState>Nothing submitted yet.</EmptyState>
            ) : (
              <ul className="divide-y">
                {done.map((assignment) => {
                  const submission = assignment.submission;
                  return (
                    <li key={assignment.id} className="py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 flex-1 truncate font-semibold">
                          {assignment.title}
                        </span>
                        {submission ? <StatusBadge value={submission.status} /> : null}
                        {submission?.status === "graded" ? (
                          <span className="rounded-full bg-mint/15 px-2.5 py-0.5 text-xs font-bold text-mint">
                            {submission.marks ?? 0}/{assignment.max_marks ?? 100}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3.5" /> Awaiting grading
                          </span>
                        )}
                      </div>

                      {submission?.content ? (
                        <p className="mt-2 whitespace-pre-line rounded-xl bg-secondary/40 p-3 text-sm">
                          {submission.content}
                        </p>
                      ) : null}

                      {submission?.file_url ? (
                        <a
                          href={submission.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          <ExternalLink className="size-3.5" /> Submitted work
                        </a>
                      ) : null}

                      {submission?.project_url ? (
                        <a
                          href={submission.project_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 ml-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          <ExternalLink className="size-3.5" /> Project / video
                        </a>
                      ) : null}

                      {submission?.feedback ? (
                        <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-mint" />{" "}
                          {submission.feedback}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}

      <FormDialog
        open={Boolean(submitting)}
        onOpenChange={(open) => !open && setSubmitting(null)}
        title={`Submit · ${submitting?.title ?? "assignment"}`}
        description="Paste your write-up and/or a link to your file."
        fields={[
          {
            name: "content",
            label: "Your work",
            type: "textarea",
            placeholder: "Describe what you built or learned…",
          },
          {
            name: "projectUrl",
            label: "Project / video link",
            placeholder: "https://github.com/… or https://drive.google.com/…",
          },
          {
            name: "fileUrl",
            label: "File link (optional)",
            placeholder: "https://…",
          },
        ]}
        submitLabel="Submit assignment"
        onSubmit={submit}
      />
    </DashboardShell>
  );
}
