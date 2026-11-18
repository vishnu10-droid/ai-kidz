import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw, UserPlus } from "lucide-react";
import { AdminOverview } from "@/components/dash/AdminOverview";
import { StatusBadge } from "@/components/dash/AdminBits";
import { DataTable } from "@/components/dash/DataTable";
import { DashboardShell, Panel } from "@/components/dash/DashboardShell";
import { ErrorNote, LoadingGrid } from "@/components/dash/DashSections";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { ADMIN_OVERVIEW } from "@/lib/admin-overview";
import { dashQuery, dateLabel } from "@/lib/dash.api";
import { pageMeta } from "@/lib/seo";

type ActivityRow = {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  at: string;
};
type AdminOverviewResponse = {
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
  const overview = useQuery(
    dashQuery<AdminOverviewResponse>(["admin", "overview"], "/api/admin/overview"),
  );
  const { profile, user } = useAuth();

  const displayName = (profile?.full_name ?? user?.full_name ?? "Admin").split(" ")[0] || "Admin";
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now);
  const activityRows = overview.data?.activity ?? [];

  return (
    <DashboardShell
      role="admin"
      title={`${greeting}, ${displayName}`}
      subtitle={today}
      headerVariant="plain"
      searchPlaceholder="Search people, clients, settings, requests..."
      actions={
        <>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl border-white/60 bg-white/15 text-white shadow-none backdrop-blur-md hover:border-white hover:bg-white/25 hover:text-white"
          >
            <a href="#activity">
              <Activity className="size-4" aria-hidden /> Activity log
            </a>
          </Button>
          <Button
            asChild
            size="sm"
            className="rounded-xl bg-white/90 text-[#0b3d50] shadow-[0_12px_28px_-18px_rgba(4,40,55,0.9)] hover:bg-white"
          >
            <Link to="/admin/users">
              <UserPlus className="size-4" aria-hidden /> Invite an agent
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
          <AdminOverview data={ADMIN_OVERVIEW} />

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
