import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Building2, CheckCircle2, GraduationCap, KeyRound, Loader2, UserPlus, Wand2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FormField, selectClass } from "@/components/site/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createTeacherLogin, suggestTeacherPassword } from "@/lib/teachers.functions";

type Field = { name: string; label: string; type?: "text" | "number" | "email" | "tel" | "date"; options?: { value: string; label: string }[]; required?: boolean; placeholder?: string; full?: boolean; hint?: string; generate?: () => string };
type Values = Record<string, string>;

export function QuickAddDialog({ title, description, trigger, fields, initial, onSubmit }: { title: string; description: string; trigger: ReactNode; fields: Field[]; initial?: Values; onSubmit: (v: Values) => Promise<string | null> }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Values>(initial ?? {});
  const [busy, setBusy] = useState(false);
  async function save() {
    const missing = fields.find((f) => f.required && !(values[f.name] ?? "").trim());
    if (missing) return void toast.error(`Please fill in ${missing.label.toLowerCase()}`);
    setBusy(true);
    const err = await onSubmit(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()])));
    setBusy(false);
    if (err) return void toast.error(err);
    setValues(initial ?? {});
    setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setValues(initial ?? {}); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <FormField key={f.name} label={f.required ? f.label : `${f.label} (optional)`} htmlFor={`qa-${f.name}`} className={f.full ? "sm:col-span-2" : ""}>
              {f.options ? (
                <select id={`qa-${f.name}`} className={selectClass} value={values[f.name] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}>
                  <option value="">{f.required ? "Choose…" : "None"}</option>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <div className="flex gap-2">
                  <Input id={`qa-${f.name}`} type={f.type ?? "text"} maxLength={f.type === "number" ? undefined : 160} placeholder={f.placeholder} autoComplete={f.generate ? "new-password" : undefined} value={values[f.name] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
                  {f.generate && (
                    <Button type="button" variant="outline" size="icon" aria-label={`Make a ${f.label.toLowerCase()}`} title="Make one for me" onClick={() => { const g = f.generate; if (g) setValues((v) => ({ ...v, [f.name]: g() })); }}>
                      <Wand2 />
                    </Button>
                  )}
                </div>
              )}
              {f.hint && <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>}
            </FormField>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="brand" disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="animate-spin" />} Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const num = (v: string | undefined) => (v ? Number(v) : null);

/** Add students, classes, batches and teachers to the school or centre this account runs. */
export function OrgQuickAdd({ org, classes, batches, teachers, onSaved }: {
  org: { kind: "school" | "franchise"; id: string };
  classes: { id: string; name: string }[];
  batches: { id: string; name: string; course_id?: string | null }[];
  teachers: { id: string; full_name: string }[];
  onSaved: () => Promise<void>;
}) {
  const scope = org.kind === "school" ? { school_id: org.id } : { franchise_id: org.id };
  const { data: courses = [] } = useQuery({
    queryKey: ["course-options"],
    queryFn: async () => (await supabase.from("courses").select("id, title").eq("is_published", true).order("title")).data ?? [],
    staleTime: 10 * 60_000,
  });
  const courseOpts = courses.map((c) => ({ value: c.id, label: c.title }));
  const teacherOpts = teachers.map((t) => ({ value: t.id, label: t.full_name }));
  const done = async (msg: string) => { toast.success(msg); await onSaved(); return null; };
  const giveLogin = useTeacherLogin(onSaved);

  return (
    <>
      <QuickAddDialog
        title="Add a student" description="Each student gets an AIKIDZ student ID automatically."
        trigger={<Button variant="brand"><UserPlus /> Student</Button>}
        fields={[
          { name: "full_name", label: "Full name", required: true, placeholder: "Aarav Sharma", full: true },
          { name: "grade", label: "Grade", placeholder: "6" },
          { name: "age", label: "Age", type: "number" },
          { name: "guardian_name", label: "Parent / guardian" },
          { name: "guardian_phone", label: "Guardian phone", type: "tel" },
          { name: "class_id", label: "Class", options: classes.map((c) => ({ value: c.id, label: c.name })) },
          { name: "batch_id", label: "Batch", options: batches.filter((b) => b.course_id).map((b) => ({ value: b.id, label: b.name })) },
        ]}
        onSubmit={async (v) => {
          const age = num(v["age"]);
          if (age !== null && (!Number.isInteger(age) || age < 3 || age > 25)) return "Age should be between 3 and 25";
          // The id is generated here because the new row can't be read back in the same request (access rules look it up afterwards).
          const st = { id: crypto.randomUUID() };
          const { error } = await supabase.from("students").insert({
            id: st.id, ...scope, full_name: v["full_name"] ?? "", grade: v["grade"] || null, age, guardian_name: v["guardian_name"] || null, guardian_phone: v["guardian_phone"] || null, class_id: v["class_id"] || null,
          });
          if (error) return "We couldn't add that student.";
          const batch = batches.find((b) => b.id === v["batch_id"]);
          if (batch?.course_id) {
            const { error: e2 } = await supabase.from("enrollments").insert({ student_id: st.id, course_id: batch.course_id, batch_id: batch.id });
            if (e2) toast.error("Student added, but we couldn't place them in that batch.");
          }
          return done("Student added");
        }}
      />
      <QuickAddDialog
        title="Add a class" description="Classes group students for attendance and teaching."
        trigger={<Button variant="outline"><Building2 /> Class</Button>}
        fields={[
          { name: "name", label: "Class name", required: true, placeholder: "Grade 6 – A", full: true },
          { name: "grade", label: "Grade" },
          { name: "section", label: "Section" },
          { name: "course_id", label: "Course", options: courseOpts },
          { name: "teacher_id", label: "Teacher", options: teacherOpts },
        ]}
        onSubmit={async (v) => {
          const { error } = await supabase.from("classes").insert({ ...scope, name: v["name"] ?? "", grade: v["grade"] || null, section: v["section"] || null, course_id: v["course_id"] || null, teacher_id: v["teacher_id"] || null });
          return error ? "We couldn't add that class." : done("Class added");
        }}
      />
      <QuickAddDialog
        title="Add a batch" description="A batch is a group taking one course on a schedule."
        trigger={<Button variant="outline"><BookOpen /> Batch</Button>}
        fields={[
          { name: "name", label: "Batch name", required: true, placeholder: "Robotics Sat 10am", full: true },
          { name: "course_id", label: "Course", options: courseOpts, required: true },
          { name: "teacher_id", label: "Teacher", options: teacherOpts },
          { name: "schedule", label: "Days", placeholder: "Sat, Sun" },
          { name: "timing", label: "Time", placeholder: "10:00–11:30" },
          { name: "start_date", label: "Start date", type: "date" },
          { name: "capacity", label: "Capacity", type: "number", placeholder: "20" },
        ]}
        onSubmit={async (v) => {
          const cap = num(v["capacity"]);
          const { error } = await supabase.from("batches").insert({
            ...scope, name: v["name"] ?? "", course_id: v["course_id"] || null, teacher_id: v["teacher_id"] || null, schedule: v["schedule"] || null, timing: v["timing"] || null,
            start_date: v["start_date"] || null, ...(cap && cap > 0 ? { capacity: Math.round(cap) } : {}), status: "active",
          });
          return error ? "We couldn't add that batch." : done("Batch added");
        }}
      />
      <QuickAddDialog
        title="Add a teacher" description="Set an email and password so the teacher can sign in to their own dashboard. Share both with them."
        trigger={<Button variant="outline"><GraduationCap /> Teacher</Button>}
        fields={[
          { name: "full_name", label: "Full name", required: true, full: true },
          { name: "email", label: "Login email", type: "email", placeholder: "teacher@gmail.com" },
          { name: "password", label: "Login password", placeholder: "At least 8 characters", generate: suggestTeacherPassword, hint: "Leave email and password empty to add the login later." },
          { name: "phone", label: "Phone", type: "tel" },
          { name: "specialization", label: "Subject", placeholder: "Robotics" },
          { name: "experience_years", label: "Years of experience", type: "number" },
        ]}
        onSubmit={async (v) => {
          const email = v["email"] ?? "";
          const password = v["password"] ?? "";
          if (password && !email) return "Add the teacher's login email";
          if (password && password.length < 8) return "Password needs at least 8 characters";
          const yrs = num(v["experience_years"]);
          const id = crypto.randomUUID();
          const { error } = await supabase.from("teachers").insert({ id, ...scope, full_name: v["full_name"] ?? "", email: email || null, phone: v["phone"] || null, specialization: v["specialization"] || null, ...(yrs && yrs >= 0 ? { experience_years: Math.round(yrs) } : {}) });
          if (error) return "We couldn't add that teacher.";
          if (!password) return done("Teacher added");
          const err = await giveLogin(id, email, password);
          if (err) { toast.error(`Teacher added, but: ${err}`); await onSaved(); return null; }
          return null;
        }}
      />
    </>
  );
}

/** Creates (or links) a teacher's sign-in and reports the outcome; returns an error message or null. */
function useTeacherLogin(onSaved: () => Promise<void>) {
  const create = useServerFn(createTeacherLogin);
  return async (teacherId: string, email: string, password: string): Promise<string | null> => {
    try {
      const r = await create({ data: { teacherId, email, password } });
      toast.success(r.status === "created" ? `Login ready: ${email} can now sign in with the password you set.` : `${email} already had an account, so it's now linked as a teacher. They sign in with their existing password.`, { duration: 8000 });
      await onSaved();
      return null;
    } catch (e) {
      return e instanceof Error && e.message ? e.message : "We couldn't create that login.";
    }
  };
}

/** Teachers of a school or centre, with their sign-in status and a way to give them one. */
export function TeacherList({ teachers, onSaved }: { teachers: { id: string; user_id: string | null; full_name: string; email: string | null; specialization: string | null; experience_years: number }[]; onSaved: () => Promise<void> }) {
  const giveLogin = useTeacherLogin(onSaved);
  if (teachers.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No teachers added yet.</p>;
  return (
    <ul className="divide-y">
      {teachers.map((t) => (
        <li key={t.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{t.full_name}</div>
            <div className="truncate text-xs text-muted-foreground">{t.specialization ?? "General"} · {t.experience_years} yrs · {t.email ?? "no email"}</div>
          </div>
          {t.user_id ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-mint/15 px-2.5 py-0.5 text-xs font-semibold text-mint"><CheckCircle2 className="size-3.5" /> Can sign in</span>
          ) : (
            <QuickAddDialog
              title={`Login for ${t.full_name}`} description="The teacher signs in with this email and password. Share both with them."
              trigger={<Button size="sm" variant="outline"><KeyRound /> Set login</Button>}
              initial={{ email: t.email ?? "" }}
              fields={[
                { name: "email", label: "Login email", type: "email", required: true, full: true },
                { name: "password", label: "Login password", required: true, placeholder: "At least 8 characters", generate: suggestTeacherPassword, full: true },
              ]}
              onSubmit={async (v) => {
                if ((v["password"] ?? "").length < 8) return "Password needs at least 8 characters";
                return giveLogin(t.id, v["email"] ?? "", v["password"] ?? "");
              }}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
