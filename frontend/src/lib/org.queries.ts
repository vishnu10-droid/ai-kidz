import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RegisterGroup } from "@/components/dash/AttendancePanel";
import { daysAgoIST } from "./fees";

const FEE_FIELDS = "id, receipt_number, purpose, description, amount, status, method, due_date, paid_at, created_at, student_id, students(full_name, student_code)";
const ATT_FIELDS = "student_id, batch_id, class_id, date, status";

type Named = { id: string; name: string };
type Learner = { id: string; full_name: string; student_code: string; class_id?: string | null };

/** Register groups: every class (by students' class) and batch (by enrolment), plus a whole-organisation list. */
export function buildRegisterGroups(classes: Named[], batches: Named[], students: Learner[], enrollments: { student_id: string; batch_id: string | null }[], allLabel?: string): RegisterGroup[] {
  const byId = new Map(students.map((s) => [s.id, s]));
  const pick = (s: Learner) => ({ id: s.id, full_name: s.full_name, student_code: s.student_code });
  const groups: RegisterGroup[] = [
    ...classes.map((c) => ({ key: `c:${c.id}`, label: `Class · ${c.name}`, batchId: null, classId: c.id, students: students.filter((s) => s.class_id === c.id).map(pick) })),
    ...batches.map((b) => ({
      key: `b:${b.id}`, label: `Batch · ${b.name}`, batchId: b.id, classId: null,
      students: [...new Set(enrollments.filter((e) => e.batch_id === b.id).map((e) => e.student_id))].map((id) => byId.get(id)).filter((s): s is Learner => Boolean(s)).map(pick),
    })),
  ];
  if (allLabel) groups.push({ key: "all", label: allLabel, batchId: null, classId: null, students: students.map(pick) });
  return groups.filter((g) => g.students.length > 0 || g.key === "all");
}

/** School-admin dashboard: everything inside the school this account owns. */
export const schoolHomeQuery = (userId: string) =>
  queryOptions({
    queryKey: ["school-home", userId],
    queryFn: async () => {
      const { data: school } = await supabase
        .from("schools")
        .select("id, name, email, phone, city, state, package, status, address, created_at")
        .eq("owner_id", userId)
        .maybeSingle();

      if (!school) return { school, classes: [], batches: [], students: [], teachers: [], payments: [], fees: [], enrollments: [], attendance: [] };

      const [cl, ba, st, te, pa, fe] = await Promise.all([
        supabase.from("classes").select("id, name, grade, section, courses(title), teachers(full_name)").eq("school_id", school.id).order("name"),
        supabase.from("batches").select("id, name, course_id, schedule, timing, capacity, status, courses(title), teachers(full_name)").eq("school_id", school.id).order("created_at", { ascending: false }),
        supabase.from("students").select("id, full_name, student_code, grade, age, status, class_id, created_at").eq("school_id", school.id).order("created_at", { ascending: false }),
        supabase.from("teachers").select("id, user_id, full_name, email, phone, specialization, experience_years, status").eq("school_id", school.id).order("full_name"),
        supabase
          .from("payments")
          .select("id, receipt_number, purpose, description, amount, status, method, paid_at, created_at")
          .eq("school_id", school.id)
          .neq("purpose", "fee")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase.from("payments").select(FEE_FIELDS).eq("school_id", school.id).eq("purpose", "fee").order("created_at", { ascending: false }),
      ]);
      const extra = await orgLearningData((st.data ?? []).map((x) => x.id));

      return {
        school,
        classes: cl.data ?? [],
        batches: ba.data ?? [],
        students: st.data ?? [],
        teachers: te.data ?? [],
        payments: pa.data ?? [],
        fees: fe.data ?? [],
        ...extra,
      };
    },
  });

/** Franchise dashboard: the centre this account owns, its learners, staff and money. */
export const franchiseHomeQuery = (userId: string) =>
  queryOptions({
    queryKey: ["franchise-home", userId],
    queryFn: async () => {
      const { data: franchise } = await supabase
        .from("franchises")
        .select("id, name, email, phone, city, state, status, address, created_at")
        .eq("owner_id", userId)
        .maybeSingle();

      if (!franchise) return { franchise, classes: [], batches: [], students: [], teachers: [], enquiries: [], payments: [], fees: [], enrollments: [], attendance: [] };

      const [cl, ba, st, te, en, pa, fe] = await Promise.all([
        supabase.from("classes").select("id, name, grade, section, courses(title), teachers(full_name)").eq("franchise_id", franchise.id).order("name"),
        supabase.from("batches").select("id, name, course_id, schedule, timing, capacity, status, courses(title), teachers(full_name)").eq("franchise_id", franchise.id).order("created_at", { ascending: false }),
        supabase.from("students").select("id, full_name, student_code, grade, age, status, class_id, created_at").eq("franchise_id", franchise.id).order("created_at", { ascending: false }),
        supabase.from("teachers").select("id, user_id, full_name, email, phone, specialization, experience_years, status").eq("franchise_id", franchise.id).order("full_name"),
        supabase
          .from("enquiries")
          .select("id, name, email, phone, subject, message, program, status, created_at")
          .eq("franchise_id", franchise.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("payments")
          .select("id, receipt_number, purpose, description, amount, status, method, paid_at, created_at")
          .eq("franchise_id", franchise.id)
          .neq("purpose", "fee")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase.from("payments").select(FEE_FIELDS).eq("franchise_id", franchise.id).eq("purpose", "fee").order("created_at", { ascending: false }),
      ]);
      const extra = await orgLearningData((st.data ?? []).map((x) => x.id));

      return {
        franchise,
        classes: cl.data ?? [],
        batches: ba.data ?? [],
        students: st.data ?? [],
        teachers: te.data ?? [],
        enquiries: en.data ?? [],
        payments: pa.data ?? [],
        fees: fe.data ?? [],
        ...extra,
      };
    },
  });

/** Enquiries routed to the franchise this account owns. */
export const franchiseEnquiriesQuery = (franchiseId: string) =>
  queryOptions({
    queryKey: ["franchise-enquiries", franchiseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquiries")
        .select("id, name, email, phone, subject, message, source, program, child_name, child_age, status, follow_up_date, created_at")
        .eq("franchise_id", franchiseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

/** Batch enrolments (for registers) and the last 30 days of attendance for an organisation's learners. */
async function orgLearningData(studentIds: string[]) {
  if (studentIds.length === 0) return { enrollments: [] as { student_id: string; batch_id: string | null }[], attendance: [] as AttendanceRow[] };
  const [en, at] = await Promise.all([
    supabase.from("enrollments").select("student_id, batch_id").in("student_id", studentIds).not("batch_id", "is", null),
    supabase.from("attendance").select(ATT_FIELDS).in("student_id", studentIds).gte("date", daysAgoIST(30)).order("date", { ascending: false }),
  ]);
  return { enrollments: en.data ?? [], attendance: (at.data ?? []) as AttendanceRow[] };
}

type AttendanceRow = { student_id: string; batch_id: string | null; class_id: string | null; date: string; status: string };
