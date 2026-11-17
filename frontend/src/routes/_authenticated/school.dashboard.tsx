import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen, Building2, GraduationCap, Users, Wallet } from "lucide-react";
import { DashboardShell, Empty, Panel, PendingApprovalNotice, StatCard } from "@/components/dash/DashboardShell";
import { AttendancePanel } from "@/components/dash/AttendancePanel";
import { FeesPanel } from "@/components/dash/FeesPanel";
import { OrgQuickAdd, TeacherList } from "@/components/dash/OrgQuickAdd";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildRegisterGroups, schoolHomeQuery } from "@/lib/org.queries";
import { formatINR } from "@/lib/pricing";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/school/dashboard")({
  head: () => ({ meta: [...pageMeta("School Dashboard", "Your school's AIKIDZ classes, batches and learners."), { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(schoolHomeQuery(context.userId)),
  component: SchoolHome,
});

function SchoolHome() {
  const { userId } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(schoolHomeQuery(userId));
  const refresh = () => qc.invalidateQueries({ queryKey: ["school-home"] });

  if (!data.school) {
    return (
      <DashboardShell role="school_admin" title="School dashboard">
        <Empty>
          No school is linked to this account yet. Ask an AIKIDZ admin to link your school to this email — once that’s done, your classes, batches and students appear here.
          <div className="mt-4"><Button asChild variant="brand"><Link to="/school">Talk to us about partnering</Link></Button></div>
        </Empty>
      </DashboardShell>
    );
  }

  const s = data.school;
  const paid = [...data.payments, ...data.fees].filter((p) => p.status === "paid").reduce((n, p) => n + Number(p.amount), 0);

  return (
    <DashboardShell role="school_admin" title={s.name} subtitle={`${[s.city, s.state].filter(Boolean).join(", ") || "Address pending"} · ${s.package} package`}
      actions={<OrgQuickAdd org={{ kind: "school", id: s.id }} classes={data.classes} batches={data.batches} teachers={data.teachers} onSaved={refresh} />}
    >
      <PendingApprovalNotice kind="school" status={s.status} />
      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fees">Fees{data.fees.some((x) => x.status === "pending") ? ` (${data.fees.filter((x) => x.status === "pending").length})` : ""}</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={data.students.length} icon={Users} />
        <StatCard label="Classes" value={data.classes.length} icon={Building2} tone="violet" />
        <StatCard label="Batches" value={data.batches.length} icon={BookOpen} tone="sun" />
        <StatCard label="Teachers" value={data.teachers.length} icon={GraduationCap} tone="mint" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Classes">
          {data.classes.length === 0 ? <Empty>No classes yet.</Empty> : (
            <ul className="divide-y">
              {data.classes.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.grade ? `Grade ${c.grade}` : ""}{c.section ? ` · ${c.section}` : ""}</span>
                  <span className="text-xs text-muted-foreground">{c.courses?.title ?? "No course"}</span>
                  <span className="text-xs text-muted-foreground">{c.teachers?.full_name ?? "No teacher"}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Batches">
          {data.batches.length === 0 ? <Empty>No batches yet.</Empty> : (
            <ul className="divide-y">
              {data.batches.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold">{b.name}</span>
                  <span className="text-xs text-muted-foreground">{b.courses?.title ?? "No course"}</span>
                  <span className="text-xs text-muted-foreground">{[b.schedule, b.timing].filter(Boolean).join(" · ") || "Timing not set"}</span>
                  <span className="text-xs text-muted-foreground">{b.teachers?.full_name ?? "No teacher"}</span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", b.status === "active" ? "bg-mint/15 text-mint" : "bg-muted text-muted-foreground")}>{b.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Students">
          {data.students.length === 0 ? <Empty>No students enrolled at your school yet.</Empty> : (
            <ul className="divide-y">
              {data.students.slice(0, 12).map((st) => (
                <li key={st.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold">{st.full_name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{st.student_code}</span>
                  <span className="text-xs text-muted-foreground">{st.grade ? `Grade ${st.grade}` : ""}</span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", st.status === "active" ? "bg-mint/15 text-mint" : "bg-muted text-muted-foreground")}>{st.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Teachers">
            <TeacherList teachers={data.teachers} onSaved={refresh} />
          </Panel>

          <Panel title="Payments" action={<span className="text-sm font-bold text-mint">{formatINR(paid)} paid</span>}>
            {data.payments.length === 0 ? <Empty>No invoices or payments yet.</Empty> : (
              <ul className="divide-y">
                {data.payments.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <Wallet className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{p.description ?? p.purpose}</span>
                    <span className="font-semibold">{formatINR(p.amount)}</span>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", p.status === "paid" ? "bg-mint/15 text-mint" : p.status === "pending" ? "bg-sun/15 text-sun-foreground" : "bg-muted text-muted-foreground")}>{p.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
        </TabsContent>
        <TabsContent value="fees">
          <FeesPanel org={{ kind: "school", id: s.id, name: s.name }} students={data.students} fees={data.fees} onChange={refresh} />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendancePanel groups={buildRegisterGroups(data.classes, data.batches, data.students, data.enrollments, "All school students")} records={data.attendance} onSaved={refresh} />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
