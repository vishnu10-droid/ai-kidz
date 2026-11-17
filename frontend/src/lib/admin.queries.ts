import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const count = async (
  table:
    "students" | "teachers" | "schools" | "franchises" | "orders" | "enquiries" | "trial_bookings",
) => {
  const { count: n } = await supabase.from(table).select("*", { count: "exact", head: true });
  return n ?? 0;
};

async function ownerNames(ids: (string | null)[]) {
  const unique = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  const map = new Map<string, { full_name: string; email: string | null }>();
  if (!unique.length) return map;
  const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", unique);
  for (const p of data ?? []) map.set(p.id, { full_name: p.full_name, email: p.email });
  return map;
}

/** Student and teacher counts per school or centre. */
async function orgHeadcounts(col: "school_id" | "franchise_id") {
  const [st, te] = await Promise.all([
    supabase.from("students").select(col).not(col, "is", null),
    supabase.from("teachers").select(col).not(col, "is", null),
  ]);
  const tally = (rows: Record<string, unknown>[] | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) {
      const id = r[col] as string | null;
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  };
  return {
    students: tally(st.data as Record<string, unknown>[] | null),
    teachers: tally(te.data as Record<string, unknown>[] | null),
  };
}

/** Percentage change between two 30-day windows. `null` when there is nothing to compare. */
const percentChange = (current: number, previous: number): number | null => {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

const isWithin = (value: string, startMs: number) => new Date(value).getTime() >= startMs;

/** Admin overview: headline numbers plus the freshest leads and orders. */
export const adminHomeQuery = () =>
  queryOptions({
    queryKey: ["admin-home"],
    queryFn: async () => {
      const [
        students,
        teachers,
        schools,
        franchises,
        orders,
        newEnquiries,
        newTrials,
        paid,
        enq,
        trials,
        fapps,
        sapps,
        recent,
        pendingSchools,
        pendingFranchises,
        openOrders,
        users,
        allTrials,
        allEnquiries,
        convTrials,
        convEnquiries,
        signups,
        activeStudents,
      ] = await Promise.all([
        count("students"),
        count("teachers"),
        count("schools"),
        count("franchises"),
        count("orders"),
        supabase
          .from("enquiries")
          .select("id", { count: "exact", head: true })
          .eq("status", "new")
          .then((r) => r.count ?? 0),
        supabase
          .from("trial_bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", "new")
          .then((r) => r.count ?? 0),
        supabase.from("payments").select("amount").eq("status", "paid"),
        supabase
          .from("enquiries")
          .select("id, name, email, phone, subject, source, status, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("trial_bookings")
          .select(
            "id, parent_name, child_name, child_age, preferred_program, preferred_date, preferred_time, status, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("franchise_applications")
          .select("id, applicant_name, city, state, investment_capacity, status, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("school_applications")
          .select("id, school_name, city, state, contact_person, status, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("orders")
          .select("id, order_number, customer_name, status, payment_status, total, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("schools")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .then((r) => r.count ?? 0),
        supabase
          .from("franchises")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .then((r) => r.count ?? 0),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .in("status", ["placed", "confirmed", "packed"])
          .then((r) => r.count ?? 0),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .then((r) => r.count ?? 0),
        count("trial_bookings"),
        count("enquiries"),
        supabase
          .from("trial_bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", "converted")
          .then((r) => r.count ?? 0),
        supabase
          .from("enquiries")
          .select("id", { count: "exact", head: true })
          .eq("status", "converted")
          .then((r) => r.count ?? 0),
        supabase
          .from("profiles")
          .select("id, full_name, city, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .then((r) => r.count ?? 0),
      ]);
      const leads = allTrials + allEnquiries;

      // 30-day trend windows for the KPI badges. Missing tables/columns resolve to
      // empty arrays, so a fresh project still renders (badges show "—").
      const nowMs = Date.now();
      const dayMs = 86_400_000;
      const currentStartMs = nowMs - 30 * dayMs;
      const comparisonStart = new Date(nowMs - 60 * dayMs).toISOString();

      const [recentPayments, recentOrderRows, recentTrials, recentEnquiries, recentStudents] =
        await Promise.all([
          supabase
            .from("payments")
            .select("amount, created_at")
            .eq("status", "paid")
            .gte("created_at", comparisonStart),
          supabase.from("orders").select("created_at").gte("created_at", comparisonStart),
          supabase.from("trial_bookings").select("created_at").gte("created_at", comparisonStart),
          supabase.from("enquiries").select("created_at").gte("created_at", comparisonStart),
          supabase.from("students").select("created_at").gte("created_at", comparisonStart),
        ]);

      const sumWindows = (rows: { amount: number; created_at: string }[] | null) => {
        let current = 0;
        let previous = 0;
        for (const row of rows ?? []) {
          const target = isWithin(row.created_at, currentStartMs) ? "current" : "previous";
          if (target === "current") current += Number(row.amount);
          else previous += Number(row.amount);
        }
        return { current, previous };
      };

      const countWindows = (rows: { created_at: string }[] | null) => {
        let current = 0;
        let previous = 0;
        for (const row of rows ?? []) {
          if (isWithin(row.created_at, currentStartMs)) current += 1;
          else previous += 1;
        }
        return { current, previous };
      };

      const revenueWindows = sumWindows(recentPayments.data);
      const orderWindows = countWindows(recentOrderRows.data);
      const leadWindows = countWindows([
        ...(recentTrials.data ?? []),
        ...(recentEnquiries.data ?? []),
      ]);
      const studentWindows = countWindows(recentStudents.data);

      return {
        pendingSchools,
        pendingFranchises,
        openOrders,
        users,
        students,
        teachers,
        schools,
        franchises,
        orders,
        newEnquiries,
        newTrials,
        revenue: (paid.data ?? []).reduce((n, p) => n + Number(p.amount), 0),
        activeStudents,
        leads,
        converted: convTrials + convEnquiries,
        conversionRate: leads
          ? Math.round(((convTrials + convEnquiries) / leads) * 1000) / 10
          : null,
        signups: signups.data ?? [],
        enquiries: enq.data ?? [],
        trials: trials.data ?? [],
        franchiseApps: fapps.data ?? [],
        schoolApps: sapps.data ?? [],
        recentOrders: recent.data ?? [],
        trends: {
          revenue: percentChange(revenueWindows.current, revenueWindows.previous),
          orders: percentChange(orderWindows.current, orderWindows.previous),
          leads: percentChange(leadWindows.current, leadWindows.previous),
          students: percentChange(studentWindows.current, studentWindows.previous),
        },
      };
    },
  });

export const adminTrialsQuery = () =>
  queryOptions({
    queryKey: ["admin-trials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trial_bookings")
        .select("*")
        .order("status", { ascending: true })
        .order("preferred_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const adminEnquiriesQuery = () =>
  queryOptions({
    queryKey: ["admin-enquiries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquiries")
        .select("*")
        .order("status", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const adminSchoolsQuery = () =>
  queryOptions({
    queryKey: ["admin-schools"],
    queryFn: async () => {
      const [apps, orgs, people] = await Promise.all([
        supabase
          .from("school_applications")
          .select("*")
          .order("status", { ascending: true })
          .order("created_at", { ascending: false }),
        supabase
          .from("schools")
          .select(
            "id, name, city, state, address, package, status, lab_status, email, phone, owner_id, created_at",
          )
          .order("created_at", { ascending: false }),
        orgHeadcounts("school_id"),
      ]);
      const owners = await ownerNames((orgs.data ?? []).map((o) => o.owner_id));
      return {
        applications: apps.data ?? [],
        schools: (orgs.data ?? []).map((o) => ({
          ...o,
          owner: o.owner_id ? (owners.get(o.owner_id) ?? null) : null,
          students: people.students.get(o.id) ?? 0,
          teachers: people.teachers.get(o.id) ?? 0,
        })),
      };
    },
  });

export const adminFranchisesQuery = () =>
  queryOptions({
    queryKey: ["admin-franchises"],
    queryFn: async () => {
      const [apps, orgs, people, paid] = await Promise.all([
        supabase
          .from("franchise_applications")
          .select("*")
          .order("status", { ascending: true })
          .order("created_at", { ascending: false }),
        supabase
          .from("franchises")
          .select(
            "id, name, city, state, address, status, revenue_share, email, phone, owner_id, created_at",
          )
          .order("created_at", { ascending: false }),
        orgHeadcounts("franchise_id"),
        supabase
          .from("payments")
          .select("franchise_id, amount")
          .eq("status", "paid")
          .not("franchise_id", "is", null),
      ]);
      const revenue = new Map<string, number>();
      for (const p of paid.data ?? [])
        if (p.franchise_id)
          revenue.set(p.franchise_id, (revenue.get(p.franchise_id) ?? 0) + Number(p.amount));
      const owners = await ownerNames((orgs.data ?? []).map((o) => o.owner_id));
      return {
        applications: apps.data ?? [],
        franchises: (orgs.data ?? []).map((o) => ({
          ...o,
          owner: o.owner_id ? (owners.get(o.owner_id) ?? null) : null,
          students: people.students.get(o.id) ?? 0,
          teachers: people.teachers.get(o.id) ?? 0,
          revenue: revenue.get(o.id) ?? 0,
        })),
      };
    },
  });

export const adminOrdersQuery = () =>
  queryOptions({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, customer_name, customer_email, customer_phone, address_line, city, state, pincode, status, payment_status, payment_method, razorpay_order_id, subtotal, shipping, total, created_at, order_items(id, product_name, quantity, price, image_url)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const adminUsersQuery = () =>
  queryOptions({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [people, roles] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, phone, city, state, is_active, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const byUser = new Map<string, string[]>();
      for (const r of roles.data ?? []) {
        const list = byUser.get(r.user_id) ?? [];
        list.push(r.role);
        byUser.set(r.user_id, list);
      }
      return {
        users: (people.data ?? []).map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] })),
        rolesError: roles.error?.message ?? null,
      };
    },
  });
