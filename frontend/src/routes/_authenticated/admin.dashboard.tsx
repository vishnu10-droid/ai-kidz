import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BadgeCheck,
  BookOpen,
  CircleDollarSign,
  Clock3,
  Mail,
  Plus,
  RefreshCw,
  School,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CommissionBarChart, OfficeDonut } from "@/components/dash/AdminV2Charts";
import { StatusBadge } from "@/components/dash/AdminBits";
import { DataTable } from "@/components/dash/DataTable";
import { DashboardShell, Panel, StatCard } from "@/components/dash/DashboardShell";
import { ErrorNote, LoadingGrid } from "@/components/dash/DashSections";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { dashQuery, dateLabel, money } from "@/lib/dash.api";
import { pageMeta } from "@/lib/seo";

type ActivityRow = {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  at: string;
};
type AdminOverview = {
  kpis: {
    revenue: number;
    feeRevenue: number;
    orderRevenue: number;
    activeSchools: number;
    batches: number;
    users: number;
    orders: number;
    pendingEnquiries: number;
    pendingSchools: number;
  };
  revenueSeries: { label: string; total: number }[];
  activity: ActivityRow[];
};

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      ...pageMeta("Admin Dashboard", "AIKIDZ platform overview."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const overview = useQuery(dashQuery<AdminOverview>(["admin", "overview"], "/api/admin/overview"));
  const { profile, user } = useAuth();
  const [range, setRange] = useState<"6M" | "1Y">("6M");
  const kpis = overview.data?.kpis;
  const displayName = (profile?.full_name ?? user?.full_name ?? "Admin").split(" ")[0] || "Admin";
  const chartData = useMemo(() => {
    const data = overview.data?.revenueSeries ?? [];
    return (range === "6M" ? data.slice(-6) : data).map((point) => ({
      label: point.label,
      value: point.total,
    }));
  }, [overview.data?.revenueSeries, range]);
  const activityRows = overview.data?.activity ?? [];

  const stats = [
    ["Active people", kpis?.users ?? 0, Users, "primary" as const, 8.2, "this month"],
    [
      "Waiting for review",
      (kpis?.pendingEnquiries ?? 0) + (kpis?.pendingSchools ?? 0),
      Clock3,
      "sun" as const,
      -12,
      "from last week",
    ],
    ["Open deals", kpis?.orders ?? 0, CircleDollarSign, "violet" as const, 5.6, "this month"],
    ["System uptime", "99.98%", Zap, "mint" as const, 0.02, "last 30 days"],
    ["Active schools", kpis?.activeSchools ?? 0, School, "primary" as const, 4.1, "this quarter"],
    ["Learning batches", kpis?.batches ?? 0, BookOpen, "violet" as const, 9.4, "this month"],
    ["Conversion rate", "18.6%", BadgeCheck, "mint" as const, 2.7, "vs. last month"],
    ["New enquiries", kpis?.pendingEnquiries ?? 0, Mail, "sun" as const, 6.3, "this week"],
  ] as const;

  return (
    <DashboardShell
      role="admin"
      title={`Good afternoon, ${displayName}`}
      subtitle="Here’s what’s happening across your agency today."
      actions={
        <>
          <Button
            asChild
            size="sm"
            className="rounded-xl bg-[#075b74] text-white shadow-[0_8px_18px_-8px_rgba(5,91,116,.8)] hover:bg-[#064d63]"
          >
            <Link to="/admin/orders">
              <Plus className="size-4" /> Record a deal
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl border-white/80 bg-white/45 text-[#174c5e] hover:bg-white/75"
          >
            <a href="#activity">
              <Activity className="size-4" /> Activity log
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl border-white/80 bg-white/45 text-[#174c5e] hover:bg-white/75"
          >
            <Link to="/admin/users">
              <UserPlus className="size-4" /> Invite an agent
            </Link>
          </Button>
        </>
      }
    >
      {overview.isLoading ? (
        <LoadingGrid rows={3} />
      ) : overview.isError ? (
        <ErrorNote message="Could not load the platform overview. Please refresh." />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1.4fr_.9fr]">
            <Panel
              title="Agency commission"
              description="Commission earned across the platform"
              className="min-h-[360px]"
              action={
                <div className="flex rounded-xl bg-[#e9f2f4] p-1">
                  {(["6M", "1Y"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRange(option)}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition ${range === option ? "bg-white text-[#075b74] shadow-sm" : "text-[#6b8790]"}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <StatPill label="This month" value={money(kpis?.revenue ?? 0)} />
                <StatPill label="Fee revenue" value={money(kpis?.feeRevenue ?? 0)} />
                <StatPill label="Store revenue" value={money(kpis?.orderRevenue ?? 0)} />
              </div>
              <CommissionBarChart
                data={chartData.length ? chartData : [{ label: "Now", value: 0 }]}
              />
            </Panel>
            <Panel
              title="Commission by office"
              description="Distribution of total commissions"
              className="min-h-[360px]"
              action={
                <button type="button" className="text-xs font-bold text-[#08637b] hover:underline">
                  View report
                </button>
              }
            >
              <OfficeDonut />
              <div className="mt-7 border-t border-[#d5e7eb] pt-4 text-center text-xs text-[#5e7e88]">
                Up <span className="font-bold text-[#167967]">12.5%</span> compared to the previous
                period
              </div>
            </Panel>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(([label, value, icon, tone, delta, hint]) => (
              <StatCard
                key={label}
                label={label}
                value={value}
                icon={icon}
                tone={tone}
                trend={{ value: delta, caption: hint }}
              />
            ))}
          </div>

          <section id="activity" className="scroll-mt-24">
            <Panel
              title="Activity management"
              description="Review the most recent platform activity"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-[#bdd6dc] bg-white/40 text-[#175166]"
                  onClick={() => void overview.refetch()}
                >
                  <RefreshCw className="size-3.5" /> Refresh
                </Button>
              }
            >
              <DataTable
                rows={activityRows}
                rowKey={(row) => row.id}
                searchFields={(row) => [row.title, row.description, row.type]}
                searchPlaceholder="Search activity…"
                pageSize={5}
                filters={[
                  {
                    id: "type",
                    label: "Type",
                    options: [...new Set(activityRows.map((row) => row.type))].map((value) => ({
                      value,
                      label: value,
                    })),
                    match: (row, value) => row.type === value,
                  },
                ]}
                columns={[
                  {
                    id: "activity",
                    header: "Activity",
                    cell: (row) => (
                      <div>
                        <p className="font-semibold text-[#174656]">{row.title}</p>
                        <p className="max-w-md truncate text-xs text-[#6b858d]">
                          {row.description || "Platform update"}
                        </p>
                      </div>
                    ),
                    sortValue: (row) => row.title,
                  },
                  {
                    id: "type",
                    header: "Status",
                    cell: (row) => (
                      <StatusBadge value={row.type === "payment" ? "paid" : "active"} />
                    ),
                    sortValue: (row) => row.type,
                  },
                  {
                    id: "when",
                    header: "Updated",
                    cell: (row) => (
                      <span className="text-xs text-[#66818a]">{dateLabel(row.at, true)}</span>
                    ),
                    sortValue: (row) => new Date(row.at).getTime(),
                  },
                ]}
                initialSort={{ columnId: "when", direction: "desc" }}
                empty="There is no activity to review yet."
              />
            </Panel>
          </section>
        </div>
      )}
    </DashboardShell>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#d9eaed] bg-white/55 px-3.5 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[.11em] text-[#6b8991]">{label}</p>
      <p className="mt-1 text-lg font-extrabold tracking-tight text-[#12495d]">{value}</p>
    </div>
  );
}
