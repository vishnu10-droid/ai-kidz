import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  Download,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "./AdminBits";
import { DashboardShell, Empty, Panel, ProgressBar, StatCard } from "./DashboardShell";
import {
  EmptyState,
  ErrorNote,
  InlineStat,
  LoadingGrid,
  LoadingRows,
  TabsNav,
} from "./DashSections";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { dashQuery, dateLabel, money, post } from "@/lib/dash.api";
import type { CourseRow, FeeRow, StudentRow, SubmissionRow } from "@/lib/dash.api";
import { downloadReceiptPdf } from "@/lib/pdf";
import { useDashTab } from "@/lib/useDashTab";
import { cn } from "@/lib/utils";

type Summary = { present: number; absent: number; late: number; total: number; percentage: number };

type EnrollmentLite = {
  id: string;
  progress?: number;
  course_id?: CourseRow | null;
};

type QuizLite = {
  id: string;
  score?: number;
  passed?: boolean;
  quiz_id?: { _id?: string; title?: string } | null;
};

type ParentOverview = {
  parent: { id: string; full_name: string; email?: string | null };
  children: StudentRow[];
  kpis: {
    children: number;
    attendanceRate: number;
    pendingFees: number;
    pendingAmount: number;
    paidAmount: number;
    graded: number;
  };
  attendance: Summary;
  fees: FeeRow[];
  recentGrades: SubmissionRow[];
  quizzes: QuizLite[];
  courses: EnrollmentLite[];
};

type AttendanceResponse = {
  child: StudentRow;
  month: string;
  summary: Summary;
  records: { id: string; date: string; status: string; day: number }[];
};

type ProgressResponse = {
  child: StudentRow;
  summary: {
    attendanceRate: number;
    submitted: number;
    graded: number;
    averageMarks: number | null;
    quizAverage: number | null;
  };
  submissions: SubmissionRow[];
  quizzes: QuizLite[];
  courses: EnrollmentLite[];
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const dayTone: Record<string, string> = {
  present: "bg-mint/20 text-mint ring-mint/40",
  absent: "bg-destructive/15 text-destructive ring-destructive/30",
  late: "bg-sun/20 text-sun-foreground ring-sun/40",
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong";

/** Parent workspace: child overview, attendance calendar, fees and progress. */
export function ParentWorkspace() {
  const [tab, setTab] = useDashTab("overview");
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ["parent"] });

  const overview = useQuery(
    dashQuery<ParentOverview>(["parent", "overview"], "/api/parent/overview"),
  );
  const children = useQuery(
    dashQuery<StudentRow[]>(["parent", "children"], "/api/parent/children"),
  );
  const fees = useQuery(dashQuery<FeeRow[]>(["parent", "fees"], "/api/parent/fees"));

  const [childId, setChildId] = useState("");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    const first = children.data?.[0];
    if (!childId && first) setChildId(first.id);
  }, [children.data, childId]);

  const attendance = useQuery({
    ...dashQuery<AttendanceResponse>(
      ["parent", "attendance", childId, month],
      `/api/parent/attendance?student_id=${childId}&month=${month}`,
    ),
    enabled: Boolean(childId),
  });

  const progress = useQuery({
    ...dashQuery<ProgressResponse>(
      ["parent", "progress", childId],
      `/api/parent/progress?student_id=${childId}`,
    ),
    enabled: Boolean(childId),
  });

  const child = useMemo(
    () => (children.data ?? []).find((row) => row.id === childId) ?? (children.data ?? [])[0],
    [children.data, childId],
  );

  const orgName = child?.school_id?.name ?? child?.franchise_id?.name ?? "AIKIDZ";

  const openFees = (fees.data ?? []).filter((fee) => fee.status === "pending");
  const paidFees = (fees.data ?? []).filter((fee) => fee.status === "paid");

  async function payFee(fee: FeeRow) {
    setPaying(fee.id);
    try {
      await post(`/api/parent/fees/${fee.id}/pay`, { method: "upi" });
      toast.success(`${fee.title ?? "Fee"} paid successfully`);
      refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPaying(null);
    }
  }

  function downloadReceipt(fee: FeeRow) {
    void downloadReceiptPdf({
      receiptNumber: fee.receipt_number ?? fee.id.slice(-8).toUpperCase(),
      orgName,
      studentName: fee.student_id?.full_name ?? child?.full_name ?? "Student",
      studentCode: fee.student_id?.roll_number,
      description: fee.title ?? "Fee",
      amount: fee.amount,
      status: fee.status,
      method: fee.method,
      paidAt: fee.paid_at,
      dueDate: fee.due_date,
      createdAt: fee.createdAt ?? new Date().toISOString(),
    });
  }

  // Calendar layout for the attendance tab.
  const calendar = useMemo(() => {
    if (!attendance.data) return null;
    const [year, monthPart] = attendance.data.month.split("-").map(Number);
    const daysInMonth = new Date(Date.UTC(year ?? 2026, monthPart ?? 1, 0)).getUTCDate();
    const firstWeekday = new Date(Date.UTC(year ?? 2026, (monthPart ?? 1) - 1, 1)).getUTCDay();
    const byDay = new Map(attendance.data.records.map((record) => [record.day, record]));
    return { daysInMonth, firstWeekday, byDay };
  }, [attendance.data]);

  const title = overview.data?.parent.full_name
    ? `Hello, ${overview.data.parent.full_name}`
    : "Parent dashboard";

  return (
    <DashboardShell
      role="parent"
      title={title}
      subtitle="Attendance, fee receipts and academic progress for your children."
      actions={
        <>
          {(children.data ?? []).length > 1 ? (
            <select
              value={childId}
              onChange={(event) => setChildId(event.target.value)}
              aria-label="Select child"
              className="glass-tile h-9 rounded-full border px-3 text-sm font-semibold outline-none focus-visible:border-primary/40"
            >
              {(children.data ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.full_name}
                </option>
              ))}
            </select>
          ) : null}
          <Button variant="outline" size="sm" className="rounded-full" onClick={refresh}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
        </>
      }
    >
      {overview.isLoading ? (
        <LoadingGrid />
      ) : overview.isError ? (
        <Empty>
          No children are linked to this account yet. Ask your school or centre to add your child
          with this email — attendance, fees and progress will appear here.
        </Empty>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsNav
            tabs={[
              { value: "overview", label: "Child overview" },
              { value: "attendance", label: "Attendance" },
              { value: "fees", label: "Fees & receipts", badge: openFees.length },
              { value: "progress", label: "Academic progress" },
            ]}
          />

          {/* ------------------------------------------------------- overview */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Children" value={overview.data?.kpis.children ?? 0} icon={Users} />
              <StatCard
                label="Attendance"
                value={`${overview.data?.kpis.attendanceRate ?? 0}%`}
                icon={CalendarCheck}
                tone="mint"
                hint={`${overview.data?.attendance.total ?? 0} classes recorded`}
              />
              <StatCard
                label="Pending fees"
                value={money(overview.data?.kpis.pendingAmount ?? 0)}
                icon={Wallet}
                tone="sun"
                hint={`${overview.data?.kpis.pendingFees ?? 0} invoices`}
              />
              <StatCard
                label="Graded work"
                value={overview.data?.kpis.graded ?? 0}
                icon={Award}
                tone="violet"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
              <Panel title="My children">
                {(overview.data?.children ?? []).length === 0 ? (
                  <EmptyState>No children linked yet.</EmptyState>
                ) : (
                  <div className="space-y-3">
                    {(overview.data?.children ?? []).map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setChildId(row.id)}
                        className={cn(
                          "glass-tile flex w-full flex-wrap items-center gap-3 rounded-2xl border p-4 text-left transition hover:border-primary/40",
                          row.id === childId && "border-primary/50 ring-1 ring-primary/30",
                        )}
                      >
                        <span className="grid size-11 place-items-center rounded-2xl bg-gradient-brand font-display text-sm font-extrabold text-primary-foreground">
                          {row.full_name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{row.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.batch_id?.name ?? "No batch"} ·{" "}
                            {row.school_id?.name ?? row.franchise_id?.name ?? "AIKIDZ"}
                          </p>
                        </div>
                        <StatusBadge value={row.status ?? "active"} />
                      </button>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Recent grades">
                {(overview.data?.recentGrades ?? []).length === 0 ? (
                  <EmptyState>
                    No graded work yet. Assignments appear here after teachers grade them.
                  </EmptyState>
                ) : (
                  <ul className="divide-y">
                    {(overview.data?.recentGrades ?? []).map((row) => (
                      <li key={row.id} className="py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="min-w-0 truncate text-sm font-semibold">
                            {row.assignment_id?.title ?? "Assignment"}
                          </p>
                          <span className="rounded-full bg-mint/15 px-2.5 py-0.5 text-xs font-bold text-mint">
                            {row.marks ?? 0}/{row.assignment_id?.max_marks ?? 100}
                          </span>
                        </div>
                        {row.feedback ? (
                          <p className="mt-1 text-xs text-muted-foreground">{row.feedback}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <Panel title="Courses in progress">
              {(overview.data?.courses ?? []).length === 0 ? (
                <EmptyState>No course enrolments yet.</EmptyState>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(overview.data?.courses ?? []).map((row) => (
                    <div key={row.id} className="glass-tile rounded-2xl border p-4">
                      <p className="truncate font-semibold">{row.course_id?.title ?? "Course"}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <ProgressBar value={row.progress ?? 0} />
                        <span className="text-xs font-bold tabular-nums">{row.progress ?? 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </TabsContent>

          {/* ----------------------------------------------------- attendance */}
          <TabsContent value="attendance" className="space-y-6">
            <Panel
              title="Attendance calendar"
              description={
                child
                  ? `${child.full_name} · ${child.batch_id?.name ?? "AIKIDZ"}`
                  : "Select a child"
              }
              action={
                <input
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  aria-label="Attendance month"
                  className="glass-tile h-9 rounded-xl border px-3 text-sm font-medium outline-none focus-visible:border-primary/40"
                />
              }
            >
              {!childId ? (
                <EmptyState>Link a child to view attendance.</EmptyState>
              ) : attendance.isLoading ? (
                <LoadingRows label="Loading attendance" />
              ) : attendance.isError ? (
                <ErrorNote message="Could not load attendance for this month." />
              ) : (
                <>
                  <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="glass-tile rounded-2xl border p-3">
                      <InlineStat
                        label="Present"
                        value={attendance.data?.summary.present ?? 0}
                        tone="mint"
                      />
                    </div>
                    <div className="glass-tile rounded-2xl border p-3">
                      <InlineStat
                        label="Absent"
                        value={attendance.data?.summary.absent ?? 0}
                        tone="destructive"
                      />
                    </div>
                    <div className="glass-tile rounded-2xl border p-3">
                      <InlineStat
                        label="Late"
                        value={attendance.data?.summary.late ?? 0}
                        tone="sun"
                      />
                    </div>
                    <div className="glass-tile rounded-2xl border p-3">
                      <InlineStat
                        label="Attendance"
                        value={`${attendance.data?.summary.percentage ?? 0}%`}
                      />
                    </div>
                  </div>

                  {calendar ? (
                    <div>
                      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {WEEKDAYS.map((day, index) => (
                          <span key={`${day}-${index}`}>{day}</span>
                        ))}
                      </div>
                      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
                        {Array.from({ length: calendar.firstWeekday }).map((_, index) => (
                          <span key={`blank-${index}`} />
                        ))}
                        {Array.from({ length: calendar.daysInMonth }).map((_, index) => {
                          const day = index + 1;
                          const record = calendar.byDay.get(day);
                          return (
                            <div
                              key={day}
                              title={
                                record ? `${record.status} on ${dateLabel(record.date)}` : undefined
                              }
                              className={cn(
                                "grid aspect-square place-items-center rounded-xl border border-border/50 text-xs font-semibold",
                                record
                                  ? cn("ring-1", dayTone[record.status])
                                  : "bg-secondary/30 text-muted-foreground",
                              )}
                            >
                              {day}
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-2.5 rounded-full bg-mint" /> Present
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-2.5 rounded-full bg-destructive" /> Absent
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-2.5 rounded-full bg-sun" /> Late
                        </span>
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </Panel>
          </TabsContent>

          {/* ----------------------------------------------------------- fees */}
          <TabsContent value="fees" className="space-y-6">
            <Panel title="Pending fees" description="Pay online to clear an invoice instantly.">
              {openFees.length === 0 ? (
                <EmptyState>All fees are paid. Thank you!</EmptyState>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {openFees.map((fee) => (
                    <div key={fee.id} className="glass-tile rounded-2xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{fee.title ?? "Fee"}</p>
                          <p className="text-xs text-muted-foreground">
                            {fee.student_id?.full_name ?? "Student"} · due {dateLabel(fee.due_date)}
                          </p>
                        </div>
                        <span className="font-display text-xl font-extrabold">
                          {money(fee.amount)}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant="brand"
                          size="sm"
                          className="rounded-full"
                          disabled={paying === fee.id}
                          onClick={() => void payFee(fee)}
                        >
                          {paying === fee.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <CreditCard className="size-4" />
                          )}
                          Pay now
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => downloadReceipt(fee)}
                        >
                          <Download className="size-4" /> Invoice
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Paid receipts">
              {paidFees.length === 0 ? (
                <EmptyState>No payments yet.</EmptyState>
              ) : (
                <ul className="divide-y">
                  {paidFees.map((fee) => (
                    <li key={fee.id} className="flex flex-wrap items-center gap-3 py-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mint/15 text-mint">
                        <CheckCircle2 className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{fee.title ?? "Fee"}</p>
                        <p className="text-xs text-muted-foreground">
                          {fee.student_id?.full_name ?? "Student"} · paid {dateLabel(fee.paid_at)}
                          {fee.method ? ` · ${fee.method}` : ""}
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums">{money(fee.amount)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full"
                        onClick={() => downloadReceipt(fee)}
                      >
                        <Download className="size-4" /> Receipt
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </TabsContent>

          {/* ------------------------------------------------------- progress */}
          <TabsContent value="progress" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Attendance"
                value={`${progress.data?.summary.attendanceRate ?? 0}%`}
                icon={CalendarCheck}
                tone="mint"
              />
              <StatCard
                label="Submitted"
                value={progress.data?.summary.submitted ?? 0}
                icon={CheckCircle2}
              />
              <StatCard
                label="Average marks"
                value={progress.data?.summary.averageMarks ?? "—"}
                icon={TrendingUp}
                tone="violet"
              />
              <StatCard
                label="Quiz average"
                value={progress.data?.summary.quizAverage ?? "—"}
                icon={Award}
                tone="sun"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
              <Panel title="Assignments & feedback">
                {progress.isLoading ? (
                  <LoadingRows label="Loading assignments" />
                ) : (progress.data?.submissions ?? []).length === 0 ? (
                  <EmptyState>No submissions yet.</EmptyState>
                ) : (
                  <ul className="divide-y">
                    {(progress.data?.submissions ?? []).map((row) => (
                      <li key={row.id} className="py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                            {row.assignment_id?.title ?? "Assignment"}
                          </p>
                          <StatusBadge value={row.status} />
                          {row.status === "graded" ? (
                            <span className="rounded-full bg-mint/15 px-2.5 py-0.5 text-xs font-bold text-mint">
                              {row.marks ?? 0}/{row.assignment_id?.max_marks ?? 100}
                            </span>
                          ) : null}
                        </div>
                        {row.feedback ? (
                          <p className="mt-1 text-xs text-muted-foreground">“{row.feedback}”</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <div className="space-y-6">
                <Panel title="Quiz scores">
                  {(progress.data?.quizzes ?? []).length === 0 ? (
                    <EmptyState>No quiz attempts yet.</EmptyState>
                  ) : (
                    <ul className="divide-y">
                      {(progress.data?.quizzes ?? []).map((quiz) => (
                        <li key={quiz.id} className="flex items-center gap-3 py-2.5 text-sm">
                          <span className="min-w-0 flex-1 truncate">
                            {quiz.quiz_id?.title ?? "Quiz"}
                          </span>
                          <span
                            className={cn(
                              "font-bold tabular-nums",
                              (quiz.score ?? 0) >= 50 ? "text-mint" : "text-destructive",
                            )}
                          >
                            {quiz.score ?? 0}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                <Panel title="Course progress">
                  {(progress.data?.courses ?? []).length === 0 ? (
                    <EmptyState>No courses yet.</EmptyState>
                  ) : (
                    <ul className="space-y-3">
                      {(progress.data?.courses ?? []).map((row) => (
                        <li key={row.id}>
                          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                            <span className="min-w-0 truncate font-medium">
                              {row.course_id?.title ?? "Course"}
                            </span>
                            <span className="text-xs font-bold tabular-nums">
                              {row.progress ?? 0}%
                            </span>
                          </div>
                          <ProgressBar value={row.progress ?? 0} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </DashboardShell>
  );
}
