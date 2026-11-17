import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  ExternalLink,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "./AdminBits";
import { DashboardShell, Empty, Panel, StatCard } from "./DashboardShell";
import { ConfirmDialog, FormDialog } from "./DashKit";
import {
  EmptyState,
  ErrorNote,
  InfoDialog,
  LoadingGrid,
  LoadingRows,
  TabsNav,
} from "./DashSections";
import { DataTable } from "./DataTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { dashQuery, dateLabel, post, remove, todayInput } from "@/lib/dash.api";
import type {
  AssignmentRow,
  BatchRow,
  StudentRow,
  SubmissionRow,
  TeacherRow,
} from "@/lib/dash.api";
import { useDashTab } from "@/lib/useDashTab";
import { cn } from "@/lib/utils";

type TeacherOverview = {
  teacher: TeacherRow;
  kpis: {
    batches: number;
    students: number;
    assignments: number;
    pendingGrading: number;
    attendanceRate: number;
  };
  batches: BatchRow[];
  assignments: AssignmentRow[];
  submissions: SubmissionRow[];
};

type AttendanceResponse = {
  batch: BatchRow;
  date: string;
  rows: { student: StudentRow; status: string }[];
};

const ATTENDANCE_OPTIONS = ["present", "absent", "late"] as const;
const attendanceTone: Record<string, string> = {
  present: "bg-mint/20 text-mint",
  absent: "bg-destructive/15 text-destructive",
  late: "bg-sun/20 text-sun-foreground",
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong";

/** Inline grading card for a single submission. */
function GradeForm({ submission, onSaved }: { submission: SubmissionRow; onSaved: () => void }) {
  const [marks, setMarks] = useState(submission.marks != null ? String(submission.marks) : "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const value = Number(marks);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      toast.error("Marks must be between 0 and 100");
      return;
    }
    setBusy(true);
    try {
      await post(`/api/teacher/submissions/${submission.id}/grade`, { marks: value, feedback });
      toast.success("Submission graded — the student has been notified");
      onSaved();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-tile rounded-2xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{submission.student_id?.full_name ?? "Student"}</p>
          <p className="text-xs text-muted-foreground">
            {submission.assignment_id?.title ?? "Assignment"} · submitted{" "}
            {dateLabel(submission.submitted_at ?? submission.createdAt)}
          </p>
        </div>
        <StatusBadge value={submission.status} />
      </div>

      {submission.content ? (
        <p className="mt-3 whitespace-pre-line rounded-xl bg-secondary/40 p-3 text-sm text-foreground/90">
          {submission.content}
        </p>
      ) : null}

      {submission.file_url ? (
        <a
          href={submission.file_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <ExternalLink className="size-3.5" /> Open submitted work
        </a>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr]">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Marks (0–100)
          <input
            type="number"
            min={0}
            max={100}
            value={marks}
            onChange={(event) => setMarks(event.target.value)}
            className="glass-tile mt-1 h-9 w-full rounded-xl border px-3 text-sm outline-none focus-visible:border-primary/40"
          />
        </label>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Feedback
          <textarea
            rows={2}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="What went well? What should they improve?"
            className="glass-tile mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus-visible:border-primary/40"
          />
        </label>
      </div>

      <div className="mt-3 flex justify-end">
        <Button variant="brand" size="sm" onClick={() => void save()} disabled={busy}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <GraduationCap className="size-4" />
          )}
          {submission.status === "graded" ? "Update grade" : "Save grade"}
        </Button>
      </div>
    </div>
  );
}

/** Teacher workspace: batches, attendance, assignments and grading. */
export function TeacherWorkspace() {
  const [tab, setTab] = useDashTab("batches");
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ["teacher"] });

  const overview = useQuery(
    dashQuery<TeacherOverview>(["teacher", "overview"], "/api/teacher/overview"),
  );
  const batches = useQuery(dashQuery<BatchRow[]>(["teacher", "batches"], "/api/teacher/batches"));
  const assignments = useQuery(
    dashQuery<AssignmentRow[]>(["teacher", "assignments"], "/api/teacher/assignments"),
  );
  const submissions = useQuery(
    dashQuery<SubmissionRow[]>(["teacher", "submissions"], "/api/teacher/submissions"),
  );

  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [viewBatch, setViewBatch] = useState<BatchRow | null>(null);
  const [deleting, setDeleting] = useState<AssignmentRow | null>(null);
  const [gradeFilter, setGradeFilter] = useState<"pending" | "graded" | "all">("pending");

  const batchStudents = useQuery({
    ...dashQuery<StudentRow[]>(
      ["teacher", "batch-students", viewBatch?.id ?? ""],
      `/api/teacher/batches/${viewBatch?.id ?? ""}/students`,
    ),
    enabled: Boolean(viewBatch),
  });

  // Attendance register state.
  const [attBatch, setAttBatch] = useState("");
  const [attDate, setAttDate] = useState(todayInput());
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const first = batches.data?.[0];
    if (!attBatch && first) setAttBatch(first.id);
  }, [batches.data, attBatch]);

  const attendance = useQuery({
    ...dashQuery<AttendanceResponse>(
      ["teacher", "attendance", attBatch, attDate],
      `/api/teacher/attendance?batch_id=${attBatch}&date=${attDate}`,
    ),
    enabled: Boolean(attBatch),
  });

  useEffect(() => {
    if (!attendance.data) return;
    setStatuses(
      Object.fromEntries(attendance.data.rows.map((row) => [row.student.id, row.status])),
    );
  }, [attendance.data]);

  const batchOptions = (batches.data ?? []).map((batch) => ({
    label: batch.name,
    value: batch.id,
  }));

  async function createAssignment(values: Record<string, string>) {
    await post("/api/teacher/assignments", {
      batch_id: values["batch_id"],
      title: values["title"],
      description: values["description"],
      due_date: values["due_date"] || undefined,
      max_marks: Number(values["max_marks"] || 100),
    });
    toast.success("Assignment created");
    refresh();
  }

  async function saveAttendance() {
    if (!attBatch) return void toast.error("Pick a batch first.");
    setSaving(true);
    try {
      const records = (attendance.data?.rows ?? []).map((row) => ({
        student_id: row.student.id,
        status: statuses[row.student.id] ?? "present",
      }));
      const result = await post<{ saved: number }>("/api/teacher/attendance", {
        batch_id: attBatch,
        date: attDate,
        records,
      });
      toast.success(`Attendance saved for ${result.saved} students`);
      refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const gradeRows = (submissions.data ?? []).filter((row) =>
    gradeFilter === "all"
      ? true
      : gradeFilter === "graded"
        ? row.status === "graded"
        : row.status !== "graded",
  );

  const pendingGrading = overview.data?.kpis.pendingGrading ?? 0;
  const title = overview.data?.teacher.full_name
    ? `Welcome, ${overview.data.teacher.full_name}`
    : "Teacher workspace";

  return (
    <DashboardShell
      role="teacher"
      title={title}
      subtitle="Your AIKIDZ batches, attendance register, assignments and grading queue."
      actions={
        <>
          <Button variant="outline" size="sm" className="rounded-full" onClick={refresh}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button
            variant="brand"
            size="sm"
            className="rounded-full"
            onClick={() => setAssignmentOpen(true)}
          >
            <Plus className="size-4" /> New assignment
          </Button>
        </>
      }
    >
      {overview.isLoading ? (
        <LoadingGrid />
      ) : overview.isError ? (
        <Empty>
          Your teacher profile isn't linked to a batch yet. Ask your school admin to add you as a
          teacher — batches, students and grading will appear here.
        </Empty>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsNav
            tabs={[
              { value: "batches", label: "My batches" },
              { value: "attendance", label: "Daily attendance" },
              { value: "assignments", label: "Assignments" },
              { value: "grading", label: "Grading", badge: pendingGrading },
            ]}
          />

          <TabsContent value="batches" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="My batches"
                value={overview.data?.kpis.batches ?? 0}
                icon={BookOpen}
              />
              <StatCard
                label="Students"
                value={overview.data?.kpis.students ?? 0}
                icon={Users}
                tone="violet"
              />
              <StatCard
                label="Assignments"
                value={overview.data?.kpis.assignments ?? 0}
                icon={ClipboardList}
                tone="sun"
              />
              <StatCard
                label="Pending grading"
                value={pendingGrading}
                icon={GraduationCap}
                tone="mint"
                hint={`${overview.data?.kpis.attendanceRate ?? 0}% attendance`}
              />
            </div>

            <Panel title="Batches" description="Batches assigned to you by your school or centre.">
              {batches.isLoading ? (
                <LoadingRows label="Loading batches" />
              ) : (batches.data ?? []).length === 0 ? (
                <EmptyState>No batches assigned yet.</EmptyState>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {(batches.data ?? []).map((batch) => (
                    <div key={batch.id} className="glass-tile rounded-2xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-display text-lg font-bold">{batch.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {batch.grade ?? "Grade not set"} ·{" "}
                            {batch.schedule ?? "Schedule pending"}
                          </p>
                        </div>
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          {batch.studentCount ?? 0} students
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{batch.school_id?.name ?? batch.franchise_id?.name ?? "AIKIDZ"}</span>
                        <span>·</span>
                        <span>{batch.room ?? "Room TBD"}</span>
                        <span>·</span>
                        <span>{batch.assignmentCount ?? 0} assignments</span>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => setViewBatch(batch)}
                        >
                          <Users className="size-4" /> Students
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            setAttBatch(batch.id);
                            setTab("attendance");
                          }}
                        >
                          <CalendarCheck className="size-4" /> Attendance
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </TabsContent>

          <TabsContent value="attendance">
            <Panel
              title="Daily attendance"
              description="Mark your assigned batch and save the register in one click."
              action={
                <Button
                  variant="brand"
                  size="sm"
                  onClick={() => void saveAttendance()}
                  disabled={saving || !attBatch}
                >
                  {saving ? "Saving…" : "Save attendance"}
                </Button>
              }
            >
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Batch
                  <select
                    value={attBatch}
                    onChange={(event) => setAttBatch(event.target.value)}
                    className="glass-tile mt-1 h-10 w-full rounded-xl border px-3 text-sm font-medium text-foreground outline-none focus-visible:border-primary/40"
                  >
                    <option value="">Select a batch…</option>
                    {(batches.data ?? []).map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Date
                  <input
                    type="date"
                    value={attDate}
                    onChange={(event) => setAttDate(event.target.value)}
                    className="glass-tile mt-1 h-10 w-full rounded-xl border px-3 text-sm font-medium outline-none focus-visible:border-primary/40"
                  />
                </label>
              </div>

              {!attBatch ? (
                <EmptyState>Select a batch to load its students.</EmptyState>
              ) : attendance.isLoading ? (
                <LoadingRows label="Loading register" />
              ) : attendance.isError ? (
                <ErrorNote message="Could not load the register." />
              ) : (attendance.data?.rows ?? []).length === 0 ? (
                <EmptyState>This batch has no students yet.</EmptyState>
              ) : (
                <ul className="divide-y">
                  {(attendance.data?.rows ?? []).map((row) => (
                    <li key={row.student.id} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{row.student.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.student.roll_number ?? "—"}
                        </p>
                      </div>
                      <div className="inline-flex overflow-hidden rounded-full border border-border/70">
                        {ATTENDANCE_OPTIONS.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              setStatuses((previous) => ({ ...previous, [row.student.id]: option }))
                            }
                            aria-pressed={(statuses[row.student.id] ?? "present") === option}
                            className={cn(
                              "px-3 py-1.5 text-xs font-semibold capitalize transition",
                              (statuses[row.student.id] ?? "present") === option
                                ? attendanceTone[option]
                                : "text-muted-foreground hover:bg-secondary/60",
                            )}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </TabsContent>

          <TabsContent value="assignments">
            <Panel
              title="Assignments"
              description="Create homework for a batch and track submissions."
              action={
                <Button variant="brand" size="sm" onClick={() => setAssignmentOpen(true)}>
                  <Plus className="size-4" /> Create assignment
                </Button>
              }
            >
              <DataTable
                rows={assignments.data ?? []}
                columns={[
                  {
                    id: "title",
                    header: "Assignment",
                    cell: (row: AssignmentRow) => (
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{row.title}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {row.description ?? ""}
                        </p>
                      </div>
                    ),
                    sortValue: (row: AssignmentRow) => row.title,
                  },
                  {
                    id: "batch",
                    header: "Batch",
                    cell: (row: AssignmentRow) => (
                      <span className="text-sm">{row.batch_id?.name ?? "—"}</span>
                    ),
                    sortValue: (row: AssignmentRow) => row.batch_id?.name ?? "",
                  },
                  {
                    id: "due",
                    header: "Due",
                    cell: (row: AssignmentRow) => (
                      <span className="text-xs text-muted-foreground">
                        {dateLabel(row.due_date)}
                      </span>
                    ),
                    sortValue: (row: AssignmentRow) => row.due_date ?? "",
                  },
                  {
                    id: "submissions",
                    header: "Submissions",
                    align: "right" as const,
                    cell: (row: AssignmentRow) => (
                      <span className="text-sm font-semibold tabular-nums">
                        {row.submissionCount ?? 0}
                        <span className="text-xs font-normal text-muted-foreground">
                          {" "}
                          · {row.pendingCount ?? 0} to grade
                        </span>
                      </span>
                    ),
                    sortValue: (row: AssignmentRow) => row.submissionCount ?? 0,
                  },
                ]}
                rowKey={(row) => row.id}
                searchFields={(row) => [row.title, row.description, row.batch_id?.name]}
                searchPlaceholder="Search assignments…"
                empty="No assignments yet — create one."
                actions={(row) => [
                  {
                    label: "Delete assignment",
                    icon: Trash2,
                    destructive: true,
                    onSelect: () => setDeleting(row),
                  },
                ]}
              />
            </Panel>
          </TabsContent>

          <TabsContent value="grading" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Grading queue</h2>
                <p className="text-sm text-muted-foreground">
                  Marks are saved with the feedback and the student is notified instantly.
                </p>
              </div>
              <div className="flex gap-1.5">
                {(["pending", "graded", "all"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setGradeFilter(filter)}
                    aria-pressed={gradeFilter === filter}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold capitalize transition",
                      gradeFilter === filter
                        ? "border-primary bg-primary text-primary-foreground"
                        : "glass-tile text-foreground/70 hover:border-primary/40",
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {submissions.isLoading ? (
              <LoadingRows label="Loading submissions" />
            ) : gradeRows.length === 0 ? (
              <EmptyState>
                {gradeFilter === "pending"
                  ? "Nothing to grade — you're all caught up!"
                  : "No submissions in this view."}
              </EmptyState>
            ) : (
              <div className="space-y-4">
                {gradeRows.map((submission) => (
                  <GradeForm key={submission.id} submission={submission} onSaved={refresh} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <FormDialog
        open={assignmentOpen}
        onOpenChange={setAssignmentOpen}
        title="Create an assignment"
        description="Every student in the batch gets a notification."
        fields={[
          {
            name: "title",
            label: "Title",
            required: true,
            placeholder: "Build a line-follower robot",
          },
          {
            name: "description",
            label: "Instructions",
            type: "textarea",
            placeholder: "What should students submit?",
          },
          {
            name: "batch_id",
            label: "Batch",
            type: "select",
            options: batchOptions,
            required: true,
          },
          { name: "due_date", label: "Due date", type: "date", defaultValue: todayInput() },
          { name: "max_marks", label: "Maximum marks", type: "number", defaultValue: "100" },
        ]}
        submitLabel="Create assignment"
        onSubmit={createAssignment}
      />

      <InfoDialog
        open={Boolean(viewBatch)}
        onOpenChange={(open) => !open && setViewBatch(null)}
        title={viewBatch?.name ?? "Batch students"}
        description={`${batchStudents.data?.length ?? 0} students in this batch`}
      >
        {batchStudents.isLoading ? (
          <LoadingRows label="Loading students" />
        ) : (batchStudents.data ?? []).length === 0 ? (
          <EmptyState>No students in this batch yet.</EmptyState>
        ) : (
          <ul className="divide-y">
            {(batchStudents.data ?? []).map((student) => (
              <li key={student.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{student.full_name}</p>
                  <p className="text-xs text-muted-foreground">{student.roll_number ?? "—"}</p>
                </div>
                <StatusBadge value={student.status ?? "active"} />
              </li>
            ))}
          </ul>
        )}
      </InfoDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.title ?? "assignment"}?`}
        description="Submissions for this assignment will also be removed."
        onConfirm={async () => {
          if (!deleting) return;
          await remove(`/api/teacher/assignments/${deleting.id}`);
          toast.success("Assignment deleted");
          setDeleting(null);
          refresh();
        }}
      />
    </DashboardShell>
  );
}
