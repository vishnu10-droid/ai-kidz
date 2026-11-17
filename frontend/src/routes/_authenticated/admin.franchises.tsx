import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IndianRupee, Pencil, Plus, RefreshCw, Store, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardShell, Panel, StatCard } from "@/components/dash/DashboardShell";
import { ConfirmDialog, FormDialog } from "@/components/dash/DashKit";
import { LoadingRows } from "@/components/dash/DashSections";
import { DataTable } from "@/components/dash/DataTable";
import { Button } from "@/components/ui/button";
import { dashQuery, money, patch, post, remove } from "@/lib/dash.api";
import type { FranchiseRow } from "@/lib/dash.api";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/franchises")({
  head: () => ({
    meta: [
      ...pageMeta("Franchises", "AIKIDZ partner centres and revenue shares."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminFranchises,
});

function AdminFranchises() {
  const qc = useQueryClient();
  const franchises = useQuery(
    dashQuery<FranchiseRow[]>(["admin", "franchises"], "/api/admin/franchises"),
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FranchiseRow | null>(null);
  const [deleting, setDeleting] = useState<FranchiseRow | null>(null);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin", "franchises"] });

  async function createFranchise(values: Record<string, string>) {
    await post("/api/admin/franchises", {
      name: values["name"],
      city: values["city"],
      state: values["state"],
      address: values["address"],
      territory: values["territory"],
      contact_email: values["contact_email"],
      contact_phone: values["contact_phone"],
      revenue_share: Number(values["revenue_share"] || 70),
      code: values["code"] || undefined,
    });
    toast.success("Centre added");
    refresh();
  }

  async function saveShare(values: Record<string, string>) {
    if (!editing) return;
    const share = Number(values["revenue_share"]);
    if (Number.isNaN(share) || share < 0 || share > 100) {
      toast.error("Revenue share must be between 0 and 100");
      return;
    }
    await patch(`/api/admin/franchises/${editing.id}`, { revenue_share: share });
    toast.success(`Revenue share updated to ${share}%`);
    setEditing(null);
    refresh();
  }

  const rows = franchises.data ?? [];
  const totalRevenue = rows.reduce((total, row) => total + row.revenue, 0);
  const totalStudents = rows.reduce((total, row) => total + row.students, 0);

  return (
    <DashboardShell
      role="admin"
      title="Franchises"
      subtitle="Centres, their learners and the revenue split with AIKIDZ."
      actions={
        <>
          <Button variant="outline" size="sm" className="rounded-full" onClick={refresh}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button variant="brand" size="sm" className="rounded-full" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Add centre
          </Button>
        </>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Centres" value={rows.length} icon={Store} />
        <StatCard label="Centre students" value={totalStudents} icon={Users} tone="violet" />
        <StatCard
          label="Centre revenue"
          value={money(totalRevenue)}
          icon={IndianRupee}
          tone="mint"
        />
        <StatCard
          label="Average share"
          value={`${rows.length ? Math.round(rows.reduce((total, row) => total + row.revenue_share, 0) / rows.length) : 0}%`}
          icon={Store}
          tone="sun"
        />
      </div>

      <Panel
        title="Partner centres"
        description="Edit revenue shares and monitor collections from one table."
      >
        {franchises.isLoading ? (
          <LoadingRows label="Loading centres" />
        ) : (
          <DataTable
            rows={rows}
            columns={[
              {
                id: "name",
                header: "Centre",
                cell: (row: FranchiseRow) => (
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{row.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.city ?? "City not set"} · {row.territory ?? row.code ?? "No territory"}
                    </p>
                  </div>
                ),
                sortValue: (row: FranchiseRow) => row.name,
              },
              {
                id: "students",
                header: "Students",
                align: "right" as const,
                cell: (row: FranchiseRow) => (
                  <span className="font-semibold tabular-nums">{row.students}</span>
                ),
                sortValue: (row: FranchiseRow) => row.students,
              },
              {
                id: "batches",
                header: "Batches",
                align: "right" as const,
                cell: (row: FranchiseRow) => <span className="tabular-nums">{row.batches}</span>,
                sortValue: (row: FranchiseRow) => row.batches,
              },
              {
                id: "revenue",
                header: "Collected",
                align: "right" as const,
                cell: (row: FranchiseRow) => (
                  <span className="font-semibold tabular-nums">{money(row.revenue)}</span>
                ),
                sortValue: (row: FranchiseRow) => row.revenue,
              },
              {
                id: "share",
                header: "Share",
                cell: (row: FranchiseRow) => (
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{row.revenue_share}% centre</p>
                    <p className="text-[11px] text-muted-foreground">
                      {money(row.franchiseShare)} · {money(row.aikidzShare)} AIKIDZ
                    </p>
                  </div>
                ),
                sortValue: (row: FranchiseRow) => row.revenue_share,
              },
            ]}
            rowKey={(row) => row.id}
            searchFields={(row) => [row.name, row.city, row.territory, row.code, row.contact_email]}
            searchPlaceholder="Search centres…"
            empty="No centres yet — add your first partner."
            actions={(row) => [
              { label: "Edit revenue share", icon: Pencil, onSelect: (item) => setEditing(item) },
              {
                label: "Delete centre",
                icon: Trash2,
                destructive: true,
                onSelect: (item) => setDeleting(item),
              },
            ]}
          />
        )}
      </Panel>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Add a centre"
        description="Centres can sign in once their owner account is created."
        fields={[
          { name: "name", label: "Centre name", required: true },
          { name: "code", label: "Centre code", placeholder: "FRN-NOI-01" },
          { name: "city", label: "City" },
          { name: "state", label: "State" },
          { name: "territory", label: "Territory", placeholder: "Noida & Greater Noida" },
          { name: "address", label: "Address", type: "textarea" },
          { name: "contact_email", label: "Contact email", type: "email" },
          { name: "contact_phone", label: "Contact phone" },
          {
            name: "revenue_share",
            label: "Revenue share (%)",
            type: "number",
            min: 0,
            max: 100,
            defaultValue: "70",
          },
        ]}
        submitLabel="Add centre"
        onSubmit={createFranchise}
      />

      <FormDialog
        open={Boolean(editing)}
        onOpenChange={(change) => !change && setEditing(null)}
        title={`Revenue share · ${editing?.name ?? "centre"}`}
        description="The centre keeps this percentage of every paid invoice; AIKIDZ keeps the rest."
        fields={[
          {
            name: "revenue_share",
            label: "Centre share (%)",
            type: "number",
            min: 0,
            max: 100,
            required: true,
            defaultValue: String(editing?.revenue_share ?? 70),
          },
        ]}
        submitLabel="Save share"
        onSubmit={saveShare}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(change) => !change && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "centre"}?`}
        description="Batches and students keep their records but lose this centre link."
        onConfirm={async () => {
          if (!deleting) return;
          await remove(`/api/admin/franchises/${deleting.id}`);
          toast.success("Centre deleted");
          setDeleting(null);
          refresh();
        }}
      />
    </DashboardShell>
  );
}
