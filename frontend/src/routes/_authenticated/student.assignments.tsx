import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Clock, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/dash/AdminBits";
import { DashboardShell, Empty, Panel, StatCard } from "@/components/dash/DashboardShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/admin-constants";
import { todayIST } from "@/lib/fees";
import { studentAssignmentsQuery } from "@/lib/student.queries";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/student/assignments")({
  head: () => ({ meta: [...pageMeta("My Assignments", "Assignments from your AIKIDZ teachers."), { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(studentAssignmentsQuery(context.userId)),
  component: Assignments,
});

function Assignments() {
  const { userId } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(studentAssignmentsQuery(userId));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const today = todayIST();
  const subFor = (id: string) => data.submissions.find((s) => s.assignment_id === id);
  const todo = data.assignments.filter((a) => !subFor(a.id));
  const graded = data.submissions.filter((s) => s.marks !== null);

  async function submit(assignmentId: string) {
    const content = (drafts[assignmentId] ?? "").trim();
    if (!data.student) return;
    if (content.length < 5) return void toast.error("Write a few words about your work before submitting");
    setBusy(assignmentId);
    const { error } = await supabase.from("submissions").insert({ assignment_id: assignmentId, student_id: data.student.id, content: content.slice(0, 5000), status: "submitted" });
    setBusy(null);
    if (error) return void toast.error("We couldn't submit that. Please try again.");
    toast.success("Submitted! Your teacher will grade it soon.");
    await qc.invalidateQueries({ queryKey: ["student-assignments"] });
  }

  return (
    <DashboardShell role="student" title="My assignments" subtitle="Hand in your work and see your teacher's marks and feedback.">
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="To do" value={todo.length} icon={Clock} tone="sun" />
        <StatCard label="Submitted" value={data.submissions.length} icon={Send} />
        <StatCard label="Graded" value={graded.length} icon={CheckCircle2} tone="mint" />
      </div>
      {!data.student ? <Empty>Your student profile isn't set up yet.</Empty> : data.assignments.length === 0 ? (
        <Empty>No assignments yet. When a teacher sets one for a course you're enrolled in, it shows up here.</Empty>
      ) : (
        <div className="space-y-4">
          {data.assignments.map((a) => {
            const sub = subFor(a.id);
            const late = !sub && a.due_date && a.due_date < today;
            return (
              <Panel key={a.id} title={a.title} action={sub ? <StatusBadge value={sub.marks !== null ? "graded" : "submitted"} /> : <StatusBadge value={late ? "overdue" : "pending"} labels={{ pending: "To do" }} />}>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span><ClipboardList className="mr-1 inline size-3.5" />{a.courses?.title ?? "Course"}{a.batches?.name ? ` · ${a.batches.name}` : ""}</span>
                  <span>{a.due_date ? `Due ${formatDate(a.due_date)}` : "No due date"}</span>
                  <span>Out of {a.max_marks}</span>
                </div>
                {a.description && <p className="mt-3 whitespace-pre-line text-sm">{a.description}</p>}
                {sub ? (
                  <div className="mt-4 rounded-2xl bg-muted/50 p-4 text-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your answer · {formatDate(sub.submitted_at, true)}</div>
                    <p className="mt-1 whitespace-pre-line">{sub.content}</p>
                    {sub.marks !== null && (
                      <div className="mt-3 border-t pt-3">
                        <span className="font-display text-xl font-extrabold text-mint">{sub.marks}/{a.max_marks}</span>
                        {sub.feedback && <p className="mt-1 text-muted-foreground">“{sub.feedback}”</p>}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    <Textarea aria-label={`Your answer for ${a.title}`} rows={4} maxLength={5000} placeholder="Describe what you built, paste your code or share a link to your project…" value={drafts[a.id] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: e.target.value }))} />
                    <div className="flex justify-end"><Button variant="brand" disabled={busy === a.id} onClick={() => void submit(a.id)}>{busy === a.id ? <Loader2 className="animate-spin" /> : <Send />} Submit</Button></div>
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
