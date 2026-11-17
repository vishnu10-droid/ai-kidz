import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Mail, RefreshCw, Store } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/dash/AdminBits";
import { DashboardShell, Panel, StatCard } from "@/components/dash/DashboardShell";
import { LoadingRows } from "@/components/dash/DashSections";
import { DataTable } from "@/components/dash/DataTable";
import { Button } from "@/components/ui/button";
import { dashQuery, dateLabel, patch } from "@/lib/dash.api";
import type { EnquiryRow } from "@/lib/dash.api";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/enquiries")({
  head: () => ({
    meta: [
      ...pageMeta("Enquiries", "Website, school and franchise enquiries."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminEnquiries,
});

const ENQUIRY_STATUSES = ["new", "contacted", "follow_up", "converted", "closed"] as const;

function AdminEnquiries() {
  const qc = useQueryClient();
  const enquiries = useQuery(
    dashQuery<EnquiryRow[]>(["admin", "enquiries"], "/api/admin/enquiries"),
  );
  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin", "enquiries"] });

  async function update(enquiry: EnquiryRow, status: string) {
    try {
      await patch(`/api/admin/enquiries/${enquiry.id}`, { status });
      toast.success(`Enquiry marked ${status.replace("_", " ")}`);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the enquiry");
    }
  }

  const rows = enquiries.data ?? [];
  const pending = rows.filter((enquiry) => enquiry.status === "new").length;

  return (
    <DashboardShell
      role="admin"
      title="Enquiries"
      subtitle="Every lead from the website, partner schools and franchise forms."
      actions={
        <Button variant="outline" size="sm" className="rounded-full" onClick={refresh}>
          <RefreshCw className="size-4" /> Refresh
        </Button>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total enquiries" value={rows.length} icon={Mail} />
        <StatCard label="New" value={pending} icon={Mail} tone="sun" />
        <StatCard
          label="Converted"
          value={rows.filter((enquiry) => enquiry.status === "converted").length}
          icon={CheckCircle2}
          tone="mint"
        />
        <StatCard
          label="Franchise routed"
          value={rows.filter((enquiry) => enquiry.franchise_id).length}
          icon={Store}
          tone="violet"
        />
      </div>

      <Panel
        title="All enquiries"
        description="Update the pipeline status as your team follows up."
      >
        {enquiries.isLoading ? (
          <LoadingRows label="Loading enquiries" />
        ) : (
          <DataTable
            rows={rows}
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
                id: "message",
                header: "Message",
                cell: (row: EnquiryRow) => (
                  <div className="min-w-0 max-w-md">
                    <p className="truncate text-sm font-medium">
                      {row.subject ?? "General enquiry"}
                    </p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {row.message ?? ""}
                    </p>
                  </div>
                ),
              },
              {
                id: "route",
                header: "Routed to",
                cell: (row: EnquiryRow) => (
                  <span className="text-xs text-muted-foreground">
                    {row.franchise_id?.name ?? (row.city ? `${row.city} · HQ` : "HQ")}
                  </span>
                ),
              },
              {
                id: "received",
                header: "Received",
                cell: (row: EnquiryRow) => (
                  <span className="text-xs text-muted-foreground">{dateLabel(row.createdAt)}</span>
                ),
                sortValue: (row: EnquiryRow) => row.createdAt ?? "",
              },
              {
                id: "status",
                header: "Status",
                cell: (row: EnquiryRow) => <StatusBadge value={row.status} />,
                sortValue: (row: EnquiryRow) => row.status,
              },
            ]}
            rowKey={(row) => row.id}
            searchFields={(row) => [
              row.name,
              row.email,
              row.phone,
              row.subject,
              row.message,
              row.city,
            ]}
            searchPlaceholder="Search enquiries…"
            filters={[
              {
                id: "status",
                label: "Status",
                options: ENQUIRY_STATUSES.map((status) => ({ label: status, value: status })),
                match: (row, value) => row.status === value,
              },
            ]}
            empty="No enquiries match these filters."
            actions={(row) => [
              ...ENQUIRY_STATUSES.filter((status) => status !== row.status).map((status) => ({
                label: `Mark ${status.replace("_", " ")}`,
                icon: CheckCircle2,
                onSelect: () => void update(row, status),
              })),
            ]}
          />
        )}
      </Panel>
    </DashboardShell>
  );
}
