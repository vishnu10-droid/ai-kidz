import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Download,
  GraduationCap,
  IndianRupee,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "./AdminBits";
import { DashboardShell, Empty, Panel, ProgressBar, StatCard } from "./DashboardShell";
import { ConfirmDialog, FormDialog, SimpleBarChart, type FieldDef } from "./DashKit";
import {
  EmptyState,
  ErrorNote,
  InfoDialog,
  InlineStat,
  LoadingGrid,
  LoadingRows,
  TabsNav,
} from "./DashSections";
import { DataTable, type DataTableAction } from "./DataTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  dashQuery,
  dateLabel,
  money,
  patch,
  post,
  refId,
  remove,
  todayInput,
} from "@/lib/dash.api";
import type {
  BatchRow,
  EnquiryRow,
  FeeRow,
  FranchiseRow,
  OrgOverview,
  StudentRow,
  TeacherRow,
} from "@/lib/dash.api";
import { downloadReceiptPdf } from "@/lib/pdf";
import { useDashTab } from "@/lib/useDashTab";
import { cn } from "@/lib/utils";

type AttendanceResponse = {
  batch: BatchRow;
  date: string;
  rows: { student: StudentRow; status: string }[];
};

type RevenueResponse = {
  revenue: number;
  revenueShare: number;
  yourShare: number;
  aikidzShare: number;
  pending: number;
  series: { label: string; value: number }[];
};

const ATTENDANCE_OPTIONS = ["present", "absent", "late"] as const;
const attendanceTone: Record<string, string> = {
  present: "bg-mint/20 text-mint",
  absent: "bg-destructive/15 text-destructive",
  late: "bg-sun/20 text-sun-foreground",
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Please try again.";

/**
 * Shared school / franchise workspace. Every tab is backed by the Express API
 * mounted at /api/school or /api/franchise.
 */
export function OrgWorkspace({ kind }: { kind: "school" | "franchise" }) {
  const base = `/api/${kind}`;
  const isFranchise = kind === "franchise";
  const role = isFranchise ? "franchise" : "school_admin";
  const [tab, setTab] = useDashTab("overview");
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ["org", kind] });

  const overview = useQuery(dashQuery<OrgOverview>(["org", kind, "overview"], `${base}/overview`));
  const batches = useQuery(dashQuery<BatchRow[]>(["org", kind, "batches"], `${base}/batches`));
  const teachers = useQuery(dashQuery<TeacherRow[]>(["org", kind, "teachers"], `${base}/teachers`));
  const students = useQuery(dashQuery<StudentRow[]>(["org", kind, "students"], `${base}/students`));
  const fees = useQuery(dashQuery<FeeRow[]>(["org", kind, "fees"], `${base}/fees`));
  const revenue = useQuery(dashQuery<RevenueResponse>(["org", kind, "revenue"], `${base}/revenue`));
  const enquiries = useQuery({
    ...dashQuery<EnquiryRow[]>(["org", kind, "enquiries"], `${base}/enquiries`),
    enabled: isFranchise,
  });

  const [batchForm, setBatchForm] = useState<BatchRow | "new" | null>(null);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [studentForm, setStudentForm] = useState<StudentRow | "new" | null>(null);
  const [feeOpen, setFeeOpen] = useState(false);
  const [viewBatch, setViewBatch] = useState<BatchRow | null>(null);
  const [deleting, setDeleting] = useState<{
    kind: "batch" | "teacher" | "student" | "fee";
    id: string;
    label: string;
  } | null>(null);

  const batchEditing = batchForm && batchForm !== "new" ? batchForm : null;
  const studentEditing = studentForm && studentForm !== "new" ? studentForm : null;

  const batchOptions = (batches.data ?? []).map((batch) => ({
    label: `${batch.name}${batch.grade ? ` · ${batch.grade}` : ""}`,
    value: batch.id,
  }));
  const teacherOptions = (teachers.data ?? []).map((teacher) => ({
    label: teacher.full_name,
    value: teacher.id,
  }));
  const studentOptions = (students.data ?? []).map((student) => ({
    label: `${student.full_name}${student.roll_number ? ` · ${student.roll_number}` : ""}`,
    value: student.id,
  }));

  /* ------------------------------------------------------------- attendance */
  const [attBatch, setAttBatch] = useState("");
  const [attDate, setAttDate] = useState(todayInput());
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  useEffect(() => {
    const first = batches.data?.[0];
    if (!attBatch && first) setAttBatch(first.id);
  }, [batches.data, attBatch]);

  const attendance = useQuery({
    ...dashQuery<AttendanceResponse>(
      ["org", kind, "attendance", attBatch, attDate],
      `${base}/attendance?batch_id=${attBatch}&date=${attDate}`,
    ),
    enabled: Boolean(attBatch),
  });

  useEffect(() => {
    if (!attendance.data) return;
    setStatuses(
      Object.fromEntries(attendance.data.rows.map((row) => [row.student.id, row.status])),
    );
  }, [attendance.data]);

  const batchStudents = useQuery({
    ...dashQuery<StudentRow[]>(
      ["org", kind, "batch-students", viewBatch?.id ?? ""],
      `${base}/batches/${viewBatch?.id ?? ""}/students`,
    ),
    enabled: Boolean(viewBatch),
  });

  /* --------------------------------------------------------------- helpers */

  async function run(action: () => Promise<unknown>, message: string) {
    try {
      await action();
      toast.success(message);
      refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function saveBatch(values: Record<string, string>) {
    const body = {
      name: values["name"],
      grade: values["grade"],
      teacher_id: values["teacher_id"] || undefined,
      schedule: values["schedule"],
      room: values["room"],
    };
    if (batchEditing) await patch(`${base}/batches/${batchEditing.id}`, body);
    else await post(`${base}/batches`, body);
    toast.success(batchEditing ? "Batch updated" : "Batch created");
    refresh();
  }

  async function saveTeacher(values: Record<string, string>) {
    const result = await post<{ generatedPassword?: string | null }>(`${base}/teachers`, {
      full_name: values["full_name"],
      email: values["email"],
      phone: values["phone"],
      subject: values["subject"],
      password: values["password"] || undefined,
    });
    if (result.generatedPassword) {
      toast.success("Teacher login ready", {
        description: `${values["email"]} can sign in with ${result.generatedPassword}`,
        duration: 14000,
      });
    } else {
      toast.success("Teacher saved");
    }
    refresh();
  }

  async function resetTeacherPassword(teacher: TeacherRow) {
    if (!teacher.email) return void toast.error("Add an email before creating a login.");
    try {
      const result = await post<{ password: string }>(
        `${base}/teachers/${teacher.id}/password`,
        {},
      );
      toast.success("New password generated", {
        description: `${teacher.email} · ${result.password}`,
        duration: 14000,
      });
      refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function saveStudent(values: Record<string, string>) {
    const body = {
      full_name: values["full_name"],
      roll_number: values["roll_number"] || undefined,
      grade: values["grade"],
      email: values["email"] || undefined,
      batch_id: values["batch_id"] || undefined,
      parent_email: values["parent_email"] || undefined,
    };
    if (studentEditing) await patch(`${base}/students/${studentEditing.id}`, body);
    else await post(`${base}/students`, body);
    toast.success(studentEditing ? "Student updated" : "Student added");
    refresh();
  }

  async function saveFee(values: Record<string, string>) {
    await post(`${base}/fees`, {
      student_id: values["student_id"],
      title: values["title"] || "Tuition fee",
      amount: Number(values["amount"]),
      due_date: values["due_date"] || undefined,
    });
    toast.success("Fee bill created");
    refresh();
  }

  async function saveAttendance() {
    if (!attBatch) return void toast.error("Pick a batch first.");
    setSavingAttendance(true);
    try {
      const records = (attendance.data?.rows ?? []).map((row) => ({
        student_id: row.student.id,
        status: statuses[row.student.id] ?? "present",
      }));
      const result = await post<{ saved: number }>(`${base}/attendance`, {
        batch_id: attBatch,
        date: attDate,
        records,
      });
      toast.success(`Attendance saved for ${result.saved} students`);
      refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingAttendance(false);
    }
  }

  async function payFee(fee: FeeRow) {
    await run(
      () => post(`${base}/fees/${fee.id}/pay`, { method: "cash" }),
      "Invoice marked as paid",
    );
  }

  function downloadReceipt(fee: FeeRow) {
    const orgName = overview.data?.organization.name ?? "AIKIDZ";
    void downloadReceiptPdf({
      receiptNumber: fee.receipt_number ?? fee.id.slice(-8).toUpperCase(),
      orgName,
      studentName: fee.student_id?.full_name ?? "Student",
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

  const confirmDelete = async () => {
    if (!deleting) return;
    const segments = {
      batch: "batches",
      teacher: "teachers",
      student: "students",
      fee: "fees",
    } as const;
    await remove(`${base}/${segments[deleting.kind]}/${deleting.id}`);
    toast.success(`${deleting.label} deleted`);
    setDeleting(null);
    refresh();
  };

  const org = overview.data?.organization;
  const kpis = overview.data?.kpis;
  const title = org?.name ?? (isFranchise ? "Centre dashboard" : "School dashboard");
  const subtitle = org
    ? `${[org.city].filter(Boolean).join(", ") || "AIKIDZ partner"}${org.code ? ` · ${org.code}` : ""}`
    : "Your AIKIDZ workspace";

  const headerActions = (
    <>
      <Button variant="outline" size="sm" onClick={refresh} className="rounded-full">
        <RefreshCw className="size-4" /> Refresh
      </Button>
      <Button
        variant="brand"
        size="sm"
        className="rounded-full"
        onClick={() => setStudentForm("new")}
      >
        <Plus className="size-4" /> Add student
      </Button>
    </>
  );

  /* ------------------------------------------------------------------ rows */

  const feeColumns = [
    {
      id: "student",
      header: "Student",
      cell: (fee: FeeRow) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{fee.student_id?.full_name ?? "Student"}</p>
          <p className="text-xs text-muted-foreground">{fee.student_id?.roll_number ?? "—"}</p>
        </div>
      ),
      sortValue: (fee: FeeRow) => fee.student_id?.full_name ?? "",
    },
    {
      id: "title",
      header: "Invoice",
      cell: (fee: FeeRow) => (
        <div className="min-w-0">
          <p className="truncate">{fee.title ?? "Fee"}</p>
          <p className="font-mono text-[11px] text-muted-foreground">{fee.receipt_number ?? "—"}</p>
        </div>
      ),
      sortValue: (fee: FeeRow) => fee.title ?? "",
    },
    {
      id: "amount",
      header: "Amount",
      align: "right" as const,
      cell: (fee: FeeRow) => (
        <span className="font-semibold tabular-nums">{money(fee.amount)}</span>
      ),
      sortValue: (fee: FeeRow) => Number(fee.amount),
    },
    {
      id: "due",
      header: "Due",
      cell: (fee: FeeRow) => (
        <span className="text-xs text-muted-foreground">{dateLabel(fee.due_date)}</span>
      ),
      sortValue: (fee: FeeRow) => fee.due_date ?? "",
    },
    {
      id: "status",
      header: "Status",
      cell: (fee: FeeRow) => <StatusBadge value={fee.status} />,
      sortValue: (fee: FeeRow) => fee.status,
    },
  ];

  const feeActions = (fee: FeeRow): DataTableAction<FeeRow>[] => [
    ...(fee.status === "pending"
      ? [{ label: "Mark as paid", icon: CheckCircle2, onSelect: (row: FeeRow) => void payFee(row) }]
      : []),
    { label: "Download receipt", icon: Download, onSelect: downloadReceipt },
    {
      label: "Delete invoice",
      icon: Trash2,
      destructive: true,
      onSelect: (row) => setDeleting({ kind: "fee", id: row.id, label: row.title ?? "Invoice" }),
    },
  ];

  const batchColumns = [
    {
      id: "name",
      header: "Batch",
      cell: (batch: BatchRow) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{batch.name}</p>
          <p className="text-xs text-muted-foreground">{batch.grade ?? "Grade not set"}</p>
        </div>
      ),
      sortValue: (batch: BatchRow) => batch.name,
    },
    {
      id: "teacher",
      header: "Teacher",
      cell: (batch: BatchRow) => (
        <span className="text-sm">{batch.teacher_id?.full_name ?? "Unassigned"}</span>
      ),
      sortValue: (batch: BatchRow) => batch.teacher_id?.full_name ?? "",
    },
    {
      id: "schedule",
      header: "Schedule",
      cell: (batch: BatchRow) => (
        <span className="text-xs text-muted-foreground">
          {[batch.schedule, batch.room].filter(Boolean).join(" · ") || "Not scheduled"}
        </span>
      ),
    },
    {
      id: "students",
      header: "Students",
      align: "right" as const,
      cell: (batch: BatchRow) => (
        <span className="font-semibold tabular-nums">{batch.studentCount ?? 0}</span>
      ),
      sortValue: (batch: BatchRow) => batch.studentCount ?? 0,
    },
  ];

  const batchRowActions = (batch: BatchRow): DataTableAction<BatchRow>[] => [
    { label: "View students", icon: Users, onSelect: (row) => setViewBatch(row) },
    { label: "Edit batch", icon: Pencil, onSelect: (row) => setBatchForm(row) },
    {
      label: "Delete batch",
      icon: Trash2,
      destructive: true,
      onSelect: (row) => setDeleting({ kind: "batch", id: row.id, label: row.name }),
    },
  ];

  const teacherColumns = [
    {
      id: "name",
      header: "Teacher",
      cell: (teacher: TeacherRow) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{teacher.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">{teacher.email ?? "No email"}</p>
        </div>
      ),
      sortValue: (teacher: TeacherRow) => teacher.full_name,
    },
    {
      id: "subject",
      header: "Subject",
      cell: (teacher: TeacherRow) => <span className="text-sm">{teacher.subject ?? "—"}</span>,
      sortValue: (teacher: TeacherRow) => teacher.subject ?? "",
    },
    {
      id: "batches",
      header: "Batches",
      cell: (teacher: TeacherRow) => (
        <span className="text-xs text-muted-foreground">
          {teacher.batches?.join(", ") || "No batches"}
        </span>
      ),
    },
    {
      id: "login",
      header: "Login",
      cell: (teacher: TeacherRow) => (
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
            teacher.hasLogin ? "bg-mint/15 text-mint" : "bg-sun/15 text-sun-foreground",
          )}
        >
          {teacher.hasLogin ? "Can sign in" : "No login yet"}
        </span>
      ),
    },
  ];

  const teacherRowActions = (teacher: TeacherRow): DataTableAction<TeacherRow>[] => [
    { label: "Reset password", icon: RefreshCw, onSelect: (row) => void resetTeacherPassword(row) },
    {
      label: "Delete teacher",
      icon: Trash2,
      destructive: true,
      onSelect: (row) => setDeleting({ kind: "teacher", id: row.id, label: row.full_name }),
    },
  ];

  const studentColumns = [
    {
      id: "name",
      header: "Student",
      cell: (student: StudentRow) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{student.full_name}</p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {student.roll_number ?? "—"}
          </p>
        </div>
      ),
      sortValue: (student: StudentRow) => student.full_name,
    },
    {
      id: "batch",
      header: "Batch",
      cell: (student: StudentRow) => (
        <span className="text-sm">{student.batch_id?.name ?? "Unassigned"}</span>
      ),
      sortValue: (student: StudentRow) => student.batch_id?.name ?? "",
    },
    {
      id: "parent",
      header: "Parent",
      cell: (student: StudentRow) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{student.parent_id?.full_name ?? "—"}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {student.parent_id?.email ?? "No email"}
          </p>
        </div>
      ),
    },
    {
      id: "grade",
      header: "Grade",
      cell: (student: StudentRow) => <span className="text-sm">{student.grade ?? "—"}</span>,
      sortValue: (student: StudentRow) => student.grade ?? "",
    },
  ];

  const studentRowActions = (student: StudentRow): DataTableAction<StudentRow>[] => [
    { label: "Edit student", icon: Pencil, onSelect: (row) => setStudentForm(row) },
    {
      label: "Remove student",
      icon: Trash2,
      destructive: true,
      onSelect: (row) => setDeleting({ kind: "student", id: row.id, label: row.full_name }),
    },
  ];

  const batchFields: FieldDef[] = [
    {
      name: "name",
      label: "Batch name",
      required: true,
      defaultValue: batchEditing?.name ?? "",
      placeholder: "Robotics Batch A",
    },
    {
      name: "grade",
      label: "Grade",
      defaultValue: batchEditing?.grade ?? "",
      placeholder: "Grade 6",
    },
    {
      name: "teacher_id",
      label: "Assigned teacher",
      type: "select",
      options: teacherOptions,
      defaultValue: refId(batchEditing?.teacher_id) ?? "",
    },
    {
      name: "schedule",
      label: "Schedule",
      defaultValue: batchEditing?.schedule ?? "",
      placeholder: "Mon & Wed · 10:00 AM",
    },
    { name: "room", label: "Room", defaultValue: batchEditing?.room ?? "", placeholder: "Lab 1" },
  ];

  const studentFields: FieldDef[] = [
    {
      name: "full_name",
      label: "Student name",
      required: true,
      defaultValue: studentEditing?.full_name ?? "",
    },
    {
      name: "roll_number",
      label: "Roll number",
      defaultValue: studentEditing?.roll_number ?? "",
      hint: "Leave blank to auto-generate",
    },
    { name: "grade", label: "Grade", defaultValue: studentEditing?.grade ?? "" },
    {
      name: "email",
      label: "Student email",
      type: "email",
      defaultValue: studentEditing?.email ?? "",
    },
    {
      name: "parent_email",
      label: "Parent email",
      type: "email",
      defaultValue: studentEditing?.parent_id?.email ?? "",
      hint: "Links the child to a parent account for the parent dashboard",
    },
    {
      name: "batch_id",
      label: "Batch",
      type: "select",
      options: batchOptions,
      defaultValue: refId(studentEditing?.batch_id) ?? "",
    },
  ];

  const revenueSeries = (revenue.data?.series ?? []).map((point) => ({
    label: point.label,
    value: point.value,
  }));

  return (
    <DashboardShell role={role} title={title} subtitle={subtitle} actions={headerActions}>
      {overview.isLoading ? (
        <LoadingGrid />
      ) : overview.isError ? (
        <Empty>
          No {isFranchise ? "centre" : "school"} is linked to this account yet. Ask an AIKIDZ admin
          to connect your organisation — your batches, teachers and fees will show up here.
        </Empty>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsNav
            tabs={[
              { value: "overview", label: "Overview" },
              { value: "batches", label: isFranchise ? "Centre batches" : "Batches" },
              { value: "teachers", label: "Teachers" },
              { value: "students", label: "Students" },
              { value: "fees", label: "Fees & invoices" },
              { value: "attendance", label: "Daily attendance" },
              ...(isFranchise
                ? [
                    { value: "enquiries", label: "Local enquiries" },
                    { value: "revenue", label: "Revenue" },
                  ]
                : []),
            ]}
          />

          {/* ------------------------------------------------------- overview */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Students"
                value={kpis?.students ?? 0}
                icon={Users}
                hint="Active enrolments"
              />
              <StatCard
                label="Teachers"
                value={kpis?.teachers ?? 0}
                icon={GraduationCap}
                tone="violet"
              />
              <StatCard label="Batches" value={kpis?.batches ?? 0} icon={BookOpen} tone="sun" />
              <StatCard
                label="Attendance"
                value={`${kpis?.attendanceRate ?? 0}%`}
                icon={CalendarCheck}
                tone="mint"
                hint="Last 30 days"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard
                label="Fees collected"
                value={money(kpis?.collected ?? 0)}
                icon={Wallet}
                tone="mint"
              />
              <StatCard
                label="Pending fees"
                value={money(kpis?.pendingFeesAmount ?? 0)}
                icon={Receipt}
                tone="sun"
                hint={`${kpis?.pendingFeesCount ?? 0} open invoices`}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
              <Panel title="Fee collection" description="Last six months of paid invoices">
                {revenue.isLoading ? (
                  <LoadingRows label="Loading revenue" />
                ) : (
                  <SimpleBarChart data={revenueSeries} height={280} />
                )}
              </Panel>

              <Panel
                title="Batches"
                action={
                  <Button variant="ghost" size="sm" onClick={() => setTab("batches")}>
                    View all
                  </Button>
                }
              >
                {batches.isLoading ? (
                  <LoadingRows label="Loading batches" />
                ) : (batches.data ?? []).length === 0 ? (
                  <EmptyState>No batches yet. Create your first batch.</EmptyState>
                ) : (
                  <ul className="divide-y">
                    {(batches.data ?? []).slice(0, 5).map((batch) => (
                      <li key={batch.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                        <span className="min-w-0 flex-1 truncate font-semibold">{batch.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {batch.teacher_id?.full_name ?? "Unassigned"}
                        </span>
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          {batch.studentCount ?? 0} students
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <Panel title="Recently added students">
              {students.isLoading ? (
                <LoadingRows label="Loading students" />
              ) : (overview.data?.recentStudents ?? []).length === 0 ? (
                <EmptyState>No students yet.</EmptyState>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {(overview.data?.recentStudents ?? []).map((student) => (
                    <div key={student.id} className="glass-tile rounded-2xl border p-4">
                      <p className="font-semibold">{student.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {student.roll_number ?? "No roll number"} ·{" "}
                        {student.batch_id?.name ?? "Unassigned"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </TabsContent>

          {/* -------------------------------------------------------- batches */}
          <TabsContent value="batches">
            <Panel
              title={isFranchise ? "Centre batches" : "Batches & classes"}
              description="Create a batch, assign a teacher and review enrolled students."
              action={
                <Button variant="brand" size="sm" onClick={() => setBatchForm("new")}>
                  <Plus className="size-4" /> New batch
                </Button>
              }
            >
              {batches.isError ? (
                <ErrorNote message="Could not load batches." />
              ) : (
                <DataTable
                  rows={batches.data ?? []}
                  columns={batchColumns}
                  rowKey={(batch) => batch.id}
                  searchFields={(batch) => [batch.name, batch.grade, batch.teacher_id?.full_name]}
                  searchPlaceholder="Search batches…"
                  empty="No batches yet — create one to get started."
                  actions={batchRowActions}
                />
              )}
            </Panel>
          </TabsContent>

          {/* ------------------------------------------------------- teachers */}
          <TabsContent value="teachers">
            <Panel
              title="Teachers"
              description="Adding a teacher also creates their login credentials."
              action={
                <Button variant="brand" size="sm" onClick={() => setTeacherOpen(true)}>
                  <Plus className="size-4" /> Add teacher
                </Button>
              }
            >
              <DataTable
                rows={teachers.data ?? []}
                columns={teacherColumns}
                rowKey={(teacher) => teacher.id}
                searchFields={(teacher) => [teacher.full_name, teacher.email, teacher.subject]}
                searchPlaceholder="Search teachers…"
                empty="No teachers yet — add one and share the generated password."
                actions={teacherRowActions}
              />
            </Panel>
          </TabsContent>

          {/* ------------------------------------------------------- students */}
          <TabsContent value="students">
            <Panel
              title="Students"
              description="Quick add a student with a parent email to link their family dashboard."
              action={
                <Button variant="brand" size="sm" onClick={() => setStudentForm("new")}>
                  <Plus className="size-4" /> Quick add student
                </Button>
              }
            >
              <DataTable
                rows={students.data ?? []}
                columns={studentColumns}
                rowKey={(student) => student.id}
                searchFields={(student) => [
                  student.full_name,
                  student.roll_number,
                  student.email,
                  student.parent_id?.full_name,
                  student.parent_id?.email,
                  student.batch_id?.name,
                ]}
                searchPlaceholder="Search students…"
                empty="No students yet — quick add your first learner."
                actions={studentRowActions}
                toolbar={
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setFeeOpen(true)}
                  >
                    <Receipt className="size-4" /> Create fee bill
                  </Button>
                }
              />
            </Panel>
          </TabsContent>

          {/* ----------------------------------------------------------- fees */}
          <TabsContent value="fees" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Collected"
                value={money(kpis?.collected ?? 0)}
                icon={Wallet}
                tone="mint"
              />
              <StatCard
                label="Pending amount"
                value={money(kpis?.pendingFeesAmount ?? 0)}
                icon={Receipt}
                tone="sun"
              />
              <StatCard
                label="Open invoices"
                value={kpis?.pendingFeesCount ?? 0}
                icon={CalendarCheck}
                tone="violet"
              />
            </div>
            <Panel
              title="Fees & invoices"
              description="Create fee bills, mark payments and download receipts."
              action={
                <Button variant="brand" size="sm" onClick={() => setFeeOpen(true)}>
                  <Plus className="size-4" /> Create fee bill
                </Button>
              }
            >
              <DataTable
                rows={fees.data ?? []}
                columns={feeColumns}
                rowKey={(fee) => fee.id}
                searchFields={(fee) => [fee.student_id?.full_name, fee.title, fee.receipt_number]}
                searchPlaceholder="Search invoices…"
                filters={[
                  {
                    id: "status",
                    label: "Status",
                    options: [
                      { label: "Pending", value: "pending" },
                      { label: "Paid", value: "paid" },
                    ],
                    match: (fee, value) => fee.status === value,
                  },
                ]}
                empty="No invoices yet — create a fee bill."
                actions={feeActions}
              />
            </Panel>
          </TabsContent>

          {/* ----------------------------------------------------- attendance */}
          <TabsContent value="attendance">
            <Panel
              title="Daily attendance register"
              description="Pick a date and batch, mark each learner, then save the register."
              action={
                <Button
                  variant="brand"
                  size="sm"
                  onClick={() => void saveAttendance()}
                  disabled={savingAttendance || !attBatch}
                >
                  {savingAttendance ? "Saving…" : "Save attendance register"}
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
                <ErrorNote message="Could not load the attendance register." />
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

          {/* ------------------------------------------------------ enquiries */}
          {isFranchise ? (
            <TabsContent value="enquiries">
              <Panel
                title="Local enquiries"
                description="Leads routed to your centre by the AIKIDZ website."
              >
                <DataTable
                  rows={enquiries.data ?? []}
                  columns={[
                    {
                      id: "name",
                      header: "Enquiry",
                      cell: (row: EnquiryRow) => (
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{row.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.email ?? row.phone ?? "No contact"}
                          </p>
                        </div>
                      ),
                      sortValue: (row: EnquiryRow) => row.name,
                    },
                    {
                      id: "subject",
                      header: "Subject",
                      cell: (row: EnquiryRow) => (
                        <div className="min-w-0">
                          <p className="truncate text-sm">{row.subject ?? "General enquiry"}</p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {row.message ?? ""}
                          </p>
                        </div>
                      ),
                    },
                    {
                      id: "status",
                      header: "Status",
                      cell: (row: EnquiryRow) => <StatusBadge value={row.status} />,
                    },
                  ]}
                  rowKey={(row) => row.id}
                  searchFields={(row) => [row.name, row.email, row.phone, row.subject]}
                  searchPlaceholder="Search enquiries…"
                  empty="No enquiries routed to your centre yet."
                  actions={(row) => [
                    ...["contacted", "follow_up", "converted", "closed"]
                      .filter((status) => status !== row.status)
                      .map((status) => ({
                        label: `Mark ${status.replace("_", " ")}`,
                        icon: CheckCircle2,
                        onSelect: () =>
                          void run(
                            () => patch(`/api/franchise/enquiries/${row.id}`, { status }),
                            `Enquiry marked ${status.replace("_", " ")}`,
                          ),
                      })),
                  ]}
                />
              </Panel>
            </TabsContent>
          ) : null}

          {/* -------------------------------------------------------- revenue */}
          {isFranchise ? (
            <TabsContent value="revenue" className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Centre revenue"
                  value={money(revenue.data?.revenue ?? 0)}
                  icon={IndianRupee}
                  hint="Paid invoices"
                />
                <StatCard
                  label="Your share"
                  value={money(revenue.data?.yourShare ?? 0)}
                  icon={TrendingUp}
                  tone="mint"
                  hint={`${revenue.data?.revenueShare ?? 0}% share`}
                />
                <StatCard
                  label="AIKIDZ share"
                  value={money(revenue.data?.aikidzShare ?? 0)}
                  icon={Wallet}
                  tone="violet"
                />
                <StatCard
                  label="Pending"
                  value={money(revenue.data?.pending ?? 0)}
                  icon={Receipt}
                  tone="sun"
                />
              </div>
              <Panel
                title="Revenue trend"
                description="Paid centre invoices over the last six months"
              >
                {revenue.isLoading ? (
                  <LoadingRows label="Loading revenue" />
                ) : (
                  <SimpleBarChart data={revenueSeries} height={300} />
                )}
              </Panel>
              <Panel title="Revenue share" description="Set by the AIKIDZ partnerships team">
                <div className="flex flex-wrap items-end gap-6">
                  <div>
                    <p className="font-display text-4xl font-extrabold">
                      {revenue.data?.revenueShare ?? 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Centre share of every paid invoice
                    </p>
                  </div>
                  <div className="min-w-40 flex-1">
                    <ProgressBar value={revenue.data?.revenueShare ?? 0} />
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <InlineStat label="Collected" value={money(revenue.data?.revenue ?? 0)} />
                  <InlineStat
                    label="Centre keeps"
                    value={money(revenue.data?.yourShare ?? 0)}
                    tone="mint"
                  />
                  <InlineStat label="AIKIDZ keeps" value={money(revenue.data?.aikidzShare ?? 0)} />
                </div>
              </Panel>
            </TabsContent>
          ) : null}
        </Tabs>
      )}

      {/* ------------------------------------------------------------ dialogs */}
      <FormDialog
        open={batchForm !== null}
        onOpenChange={(open) => setBatchForm(open ? (batchEditing ?? "new") : null)}
        title={batchEditing ? "Edit batch" : "Create a batch"}
        description="Students can be assigned to this batch from the Students tab."
        fields={batchFields}
        submitLabel={batchEditing ? "Save changes" : "Create batch"}
        onSubmit={saveBatch}
      />

      <FormDialog
        open={teacherOpen}
        onOpenChange={setTeacherOpen}
        title="Add a teacher"
        description="A login is created instantly. Share the generated password with the teacher."
        fields={[
          { name: "full_name", label: "Full name", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "phone", label: "Phone" },
          { name: "subject", label: "Subject", placeholder: "Robotics" },
          {
            name: "password",
            label: "Password",
            type: "password",
            generate: true,
            hint: "Leave blank to let the server generate a strong temporary password.",
          },
        ]}
        submitLabel="Create login"
        onSubmit={saveTeacher}
      />

      <FormDialog
        open={studentForm !== null}
        onOpenChange={(open) => setStudentForm(open ? (studentEditing ?? "new") : null)}
        title={studentEditing ? "Edit student" : "Quick add student"}
        description="Parent emails are matched to existing parent accounts automatically."
        fields={studentFields}
        submitLabel={studentEditing ? "Save changes" : "Add student"}
        onSubmit={saveStudent}
      />

      <FormDialog
        open={feeOpen}
        onOpenChange={setFeeOpen}
        title="Create a fee bill"
        description="The invoice appears on the parent dashboard immediately."
        fields={[
          {
            name: "student_id",
            label: "Student",
            type: "select",
            options: studentOptions,
            required: true,
          },
          {
            name: "title",
            label: "Invoice title",
            placeholder: "Term 1 Lab Fee",
            defaultValue: "Tuition fee",
          },
          {
            name: "amount",
            label: "Amount (Rs)",
            type: "number",
            required: true,
            min: 1,
            placeholder: "8000",
          },
          { name: "due_date", label: "Due date", type: "date", defaultValue: todayInput() },
        ]}
        submitLabel="Create invoice"
        onSubmit={saveFee}
      />

      <InfoDialog
        open={Boolean(viewBatch)}
        onOpenChange={(open) => !open && setViewBatch(null)}
        title={viewBatch?.name ?? "Batch students"}
        description={`${batchStudents.data?.length ?? 0} students enrolled`}
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
        title={`Delete ${deleting?.label ?? "record"}?`}
        description="This cannot be undone. Related records may also be removed."
        onConfirm={confirmDelete}
      />
    </DashboardShell>
  );
}
