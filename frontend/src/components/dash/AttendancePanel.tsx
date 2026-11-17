import { CalendarCheck, CheckCheck, Loader2, Save, UserCheck, UserX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Empty, Panel, StatCard } from "@/components/dash/DashboardShell";
import { FormField, selectClass } from "@/components/site/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ATTENDANCE_STATUSES, attendanceRate, todayIST, type AttendanceStatus } from "@/lib/fees";
import { cn } from "@/lib/utils";

export type RegisterStudent = { id: string; full_name: string; student_code: string };
export type RegisterGroup = { key: string; label: string; batchId: string | null; classId: string | null; students: RegisterStudent[] };
export type AttendanceRecord = { student_id: string; batch_id: string | null; class_id: string | null; date: string; status: string };

const LABEL: Record<AttendanceStatus, string> = { present: "Present", late: "Late", absent: "Absent" };
const ACTIVE: Record<AttendanceStatus, string> = {
  present: "border-mint bg-mint text-mint-foreground",
  late: "border-sun bg-sun text-sun-foreground",
  absent: "border-destructive bg-destructive text-destructive-foreground",
};

/** Daily register for a class or batch: mark, re-save and see each learner's recent attendance rate. */
export function AttendancePanel({ groups, records, onSaved, title = "Attendance register" }: {
  groups: RegisterGroup[];
  records: AttendanceRecord[];
  onSaved: () => Promise<void>;
  title?: string;
}) {
  const today = todayIST();
  const [groupKey, setGroupKey] = useState(groups[0]?.key ?? "");
  const [date, setDate] = useState(today);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [busy, setBusy] = useState(false);
  // Marks saved in this session, shown straight away while the dashboard refreshes in the background.
  const [local, setLocal] = useState<AttendanceRecord[]>([]);
  const group = groups.find((g) => g.key === groupKey) ?? groups[0];

  const all = useMemo(() => {
    const key = (r: AttendanceRecord) => `${r.student_id}|${r.date}|${r.batch_id}|${r.class_id}`;
    const m = new Map(records.map((r) => [key(r), r]));
    for (const r of local) m.set(key(r), r);
    return [...m.values()];
  }, [records, local]);
  const batchId = group?.batchId ?? null;
  const classId = group?.classId ?? null;
  const saved = useMemo(() => {
    const m: Record<string, AttendanceStatus> = {};
    for (const r of all) if (r.batch_id === batchId && r.class_id === classId && r.date === date) m[r.student_id] = r.status as AttendanceStatus;
    return m;
  }, [all, date, batchId, classId]);
  useEffect(() => setMarks(saved), [saved]);

  const todayRows = all.filter((r) => r.date === today);
  const todayPresent = todayRows.filter((r) => r.status !== "absent").length;
  const overall = attendanceRate(all);

  if (groups.length === 0 || !group) {
    return <Panel title={title}><Empty>No classes or batches with students yet. Once learners are assigned, you can take attendance here.</Empty></Panel>;
  }

  async function save() {
    if (!group) return;
    const rows = group.students.filter((s) => marks[s.id]).map((s) => ({ student_id: s.id, batch_id: group.batchId, class_id: group.classId, date, status: marks[s.id] as string }));
    if (rows.length === 0) return void toast.error("Mark at least one student first");
    setBusy(true);
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,date,batch_id,class_id" });
    setBusy(false);
    if (error) return void toast.error("We couldn't save the register. Please try again.");
    setLocal((l) => [...l, ...rows]);
    toast.success(`Attendance saved for ${rows.length} student${rows.length === 1 ? "" : "s"}`);
    await onSaved();
  }

  const unsaved = group.students.some((s) => marks[s.id] && marks[s.id] !== saved[s.id]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Marked today" value={todayRows.length} icon={CalendarCheck} />
        <StatCard label="Present today" value={todayRows.length ? `${todayPresent}/${todayRows.length}` : "—"} icon={UserCheck} tone="mint" />
        <StatCard label="Attendance, last 30 days" value={overall === null ? "—" : `${overall}%`} icon={UserX} tone="violet" />
      </div>
      <Panel title={title}>
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <FormField label="Class or batch" htmlFor="att-group">
            <select id="att-group" className={selectClass} value={group.key} onChange={(e) => setGroupKey(e.target.value)}>
              {groups.map((g) => <option key={g.key} value={g.key}>{g.label} ({g.students.length})</option>)}
            </select>
          </FormField>
          <FormField label="Date" htmlFor="att-date"><Input id="att-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value || today)} /></FormField>
          <Button variant="outline" onClick={() => setMarks(Object.fromEntries(group.students.map((s) => [s.id, "present" as const])))}><CheckCheck /> All present</Button>
        </div>
        {group.students.length === 0 ? <Empty>No students in this group yet.</Empty> : (
          <ul className="divide-y">
            {group.students.map((s) => {
              const rate = attendanceRate(all.filter((r) => r.student_id === s.id));
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground"><span className="font-mono">{s.student_code}</span>{rate !== null ? ` · ${rate}% attendance` : ""}</div>
                  </div>
                  <div className="flex gap-1" role="radiogroup" aria-label={`Attendance for ${s.full_name}`}>
                    {ATTENDANCE_STATUSES.map((st) => (
                      <button key={st} type="button" role="radio" aria-checked={marks[s.id] === st} onClick={() => setMarks((m) => ({ ...m, [s.id]: st }))}
                        className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition active:scale-95", marks[s.id] === st ? ACTIVE[st] : "bg-card hover:border-primary/50")}>
                        {LABEL[st]}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          {unsaved && <span className="text-xs font-medium text-sun-foreground">Unsaved changes</span>}
          <Button variant="brand" disabled={busy} onClick={() => void save()}>{busy ? <Loader2 className="animate-spin" /> : <Save />} Save register</Button>
        </div>
      </Panel>
    </div>
  );
}
