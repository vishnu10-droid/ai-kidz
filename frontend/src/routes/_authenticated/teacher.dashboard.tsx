import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen, CalendarClock, ClipboardList, Loader2, Plus, Save, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, Empty, Panel, StatCard } from "@/components/dash/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendancePanel } from "@/components/dash/AttendancePanel";
import { QuickAddDialog } from "@/components/dash/OrgQuickAdd";
import { buildRegisterGroups } from "@/lib/org.queries";
import { teacherHomeQuery } from "@/lib/teacher.queries";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/teacher/dashboard")({
  head: () => ({ meta: [...pageMeta("Teacher Dashboard", "Your batches, students and assignments."), { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(teacherHomeQuery(context.userId)),
  component: TeacherHome,
});

function TeacherHome() {
  const { userId } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(teacherHomeQuery(userId));
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  async function grade(submissionId: string, value: string, max: number) {
    const n = Number(value);
    if (value.trim() === "" || !Number.isFinite(n) || n < 0) return void toast.error("Enter the marks you want to give");
    if (n > max) return void toast.error(`Marks can't be more than ${max}`);
    setSaving(submissionId);
    const note = (feedback[submissionId] ?? "").trim().slice(0, 1000);
    const { error } = await supabase.from("submissions").update({ marks: Math.round(n), ...(note ? { feedback: note } : {}) }).eq("id", submissionId);
    setSaving(null);
    if (error) return void toast.error("We couldn't save those marks.");
    toast.success("Marks saved — the student has been notified.");
    await qc.invalidateQueries({ queryKey: ["teacher-home"] });
  }

  if (!data.teacher) {
    return (
      <DashboardShell role="teacher" title="Teacher dashboard">
        <Empty>Your teacher profile isn't linked to this account yet. An AIKIDZ admin can link it so your batches appear here.</Empty>
      </DashboardShell>
    );
  }

  const pending = data.submissions.filter((s) => s.marks === null);
  const org = data.teacher.schools?.name ?? data.teacher.franchises?.name;

  return (
    <DashboardShell
      role="teacher"
      title={`Hello ${data.teacher.full_name.split(" ")[0]}! 👋`}
      subtitle={org ? `${org} · ${data.teacher.specialization ?? "Faculty"}` : "Your classes and batches"}
      actions={<Button asChild variant="outline"><Link to="/programs">Course library</Link></Button>}
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Batches" value={data.batches.length} icon={BookOpen} />
        <StatCard label="Students you teach" value={data.students.length} icon={Users} tone="violet" />
        <StatCard label="Assignments" value={data.assignments.length} icon={ClipboardList} tone="sun" />
        <StatCard label="To grade" value={pending.length} icon={CalendarClock} tone="mint" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="grading">Grading{pending.length ? ` (${pending.length})` : ""}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel title="My batches">
          {data.batches.length === 0 ? <Empty>No batches assigned yet.</Empty> : (
            <ul className="divide-y">
              {data.batches.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold">{b.name}</span>
                  <span className="text-xs text-muted-foreground">{b.courses?.title ?? "No course"}</span>
                  <span className="text-xs text-muted-foreground">{[b.schedule, b.timing].filter(Boolean).join(" · ") || "Timing not set"}</span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", b.status === "active" ? "bg-mint/15 text-mint" : "bg-muted text-muted-foreground")}>{b.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="My classes">
          {data.classes.length === 0 ? <Empty>No classes assigned yet.</Empty> : (
            <ul className="divide-y">
              {data.classes.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.grade ? `Grade ${c.grade}` : ""}{c.section ? ` · ${c.section}` : ""}</span>
                  <span className="text-xs text-muted-foreground">{c.courses?.title ?? "No course"}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Assignments you set" className="mt-6" action={
        <QuickAddDialog
          title="New assignment" description="Students enrolled in the batch's course see it on their Assignments page."
          trigger={<Button size="sm" variant="brand" disabled={!data.batches.some((b) => b.course_id)}><Plus /> New assignment</Button>}
          fields={[
            { name: "title", label: "Title", required: true, placeholder: "Build a line-following robot", full: true },
            { name: "batch_id", label: "Batch", required: true, options: data.batches.filter((b) => b.course_id).map((b) => ({ value: b.id, label: b.name })) },
            { name: "due_date", label: "Due date", type: "date" },
            { name: "max_marks", label: "Maximum marks", type: "number", placeholder: "100" },
            { name: "description", label: "Instructions", full: true },
          ]}
          onSubmit={async (v) => {
            const batch = data.batches.find((b) => b.id === v["batch_id"]);
            if (!batch?.course_id || !data.teacher) return "Choose a batch that has a course";
            const max = v["max_marks"] ? Math.round(Number(v["max_marks"])) : 100;
            if (!Number.isFinite(max) || max < 1 || max > 1000) return "Maximum marks should be between 1 and 1000";
            const { error } = await supabase.from("assignments").insert({ title: v["title"] ?? "", description: v["description"] || null, batch_id: batch.id, course_id: batch.course_id, teacher_id: data.teacher.id, due_date: v["due_date"] || null, max_marks: max });
            if (error) return "We couldn't create that assignment.";
            toast.success("Assignment set");
            await qc.invalidateQueries({ queryKey: ["teacher-home"] });
            return null;
          }}
        />
      }>
        {data.assignments.length === 0 ? <Empty>You haven't set any assignments yet.</Empty> : (
          <ul className="divide-y">
            {data.assignments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-semibold">{a.title}</span>
                <span className="text-xs text-muted-foreground">{a.courses?.title ?? ""}{a.batches?.name ? ` · ${a.batches.name}` : ""}</span>
                <span className="text-xs text-muted-foreground">Max {a.max_marks}</span>
                <span className="text-xs text-muted-foreground">{a.due_date ? `Due ${new Date(a.due_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}` : "No due date"}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

        </TabsContent>
        <TabsContent value="attendance">
          <AttendancePanel title="Take attendance" groups={buildRegisterGroups(data.classes, data.batches, data.students, data.enrollments)} records={data.attendance} onSaved={() => qc.invalidateQueries({ queryKey: ["teacher-home"] })} />
        </TabsContent>
        <TabsContent value="grading">
      <Panel title="Submissions to grade">
        {data.submissions.length === 0 ? (
          <Empty>No submissions yet. Students' work will appear here.</Empty>
        ) : (
          <ul className="divide-y">
            {data.submissions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{s.students?.full_name ?? "Student"} · {s.assignments?.title ?? "Assignment"}</div>
                  <div className="text-xs text-muted-foreground">
                    Submitted {new Date(s.submitted_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    {s.content ? ` · ${s.content.slice(0, 60)}${s.content.length > 60 ? "…" : ""}` : ""}
                  </div>
                </div>
                {s.marks !== null ? (
                  <span className="text-right"><span className="block text-sm font-bold text-mint">{s.marks}/{s.assignments?.max_marks ?? 100}</span>{s.feedback && <span className="block max-w-56 truncate text-xs text-muted-foreground">{s.feedback}</span>}</span>
                ) : (
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <Input
                      aria-label={`Feedback for ${s.students?.full_name ?? "student"}`}
                      className="h-8 min-w-0 flex-1 sm:w-56"
                      value={feedback[s.id] ?? ""}
                      onChange={(e) => setFeedback((m) => ({ ...m, [s.id]: e.target.value }))}
                      placeholder="Feedback (optional)"
                    />
                    <Input
                      aria-label={`Marks for ${s.students?.full_name ?? "student"}`}
                      type="number"
                      className="h-8 w-20"
                      value={marks[s.id] ?? ""}
                      onChange={(e) => setMarks((m) => ({ ...m, [s.id]: e.target.value }))}
                      placeholder={`/${s.assignments?.max_marks ?? 100}`}
                    />
                    <Button size="sm" variant="brand" disabled={saving === s.id} onClick={() => void grade(s.id, marks[s.id] ?? "", s.assignments?.max_marks ?? 100)}>
                      {saving === s.id ? <Loader2 className="animate-spin" /> : <Save />} Save
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
