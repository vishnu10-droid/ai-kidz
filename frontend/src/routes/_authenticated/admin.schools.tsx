import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Beaker,
  Building2,
  CheckCircle2,
  Plus,
  RefreshCw,
  School,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/dash/AdminBits";
import { DashboardShell, Panel, StatCard } from "@/components/dash/DashboardShell";
import { ConfirmDialog, FormDialog } from "@/components/dash/DashKit";
import { LoadingRows } from "@/components/dash/DashSections";
import { DataTable } from "@/components/dash/DataTable";
import { Button } from "@/components/ui/button";
import { dashQuery, patch, post, remove } from "@/lib/dash.api";
import type { SchoolRow } from "@/lib/dash.api";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/schools")({
  head: () => ({
    meta: [
      ...pageMeta("Schools", "AIKIDZ partner schools and lab approvals."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSchools,
});

function AdminSchools() {
  const qc = useQueryClient();
  const schools = useQuery(dashQuery<SchoolRow[]>(["admin", "schools"], "/api/admin/schools"));
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<SchoolRow | null>(null);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin", "schools"] });

  async function createSchool(values: Record<string, string>) {
    await post("/api/admin/schools", {
      name: values["name"],
      city: values["city"],
      state: values["state"],
      address: values["address"],
      contact_email: values["contact_email"],
      contact_phone: values["contact_phone"],
      lab_status: values["lab_status"] || "pending",
      code: values["code"] || undefined,
    });
    toast.success("School added");
    refresh();
  }

  async function toggleLab(school: SchoolRow) {
    const next = school.lab_status === "active" ? "pending" : "active";
    try {
      await patch(`/api/admin/schools/${school.id}`, { lab_status: next });
      toast.success(`${school.name} lab is now ${next}`);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the lab status");
    }
  }

  const rows = schools.data ?? [];
  const activeLabs = rows.filter((school) => school.lab_status === "active").length;

  return (
    <DashboardShell
      role="admin"
      title="Schools"
      subtitle="Approve labs and keep an eye on every partner school."
      actions={
        <>
          <Button variant="outline" size="sm" className="rounded-full" onClick={refresh}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button variant="brand" size="sm" className="rounded-full" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Add school
          </Button>
        </>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Schools" value={rows.length} icon={School} />
        <StatCard label="Active labs" value={activeLabs} icon={Beaker} tone="mint" />
        <StatCard
          label="Awaiting approval"
          value={rows.length - activeLabs}
          icon={CheckCircle2}
          tone="sun"
        />
        <StatCard
          label="Students"
          value={rows.reduce((total, school) => total + (school.students ?? 0), 0)}
          icon={Users}
          tone="violet"
        />
      </div>

      <Panel
        title="Partner schools"
        description="Toggle a lab between pending and active as soon as it's installed."
      >
        {schools.isLoading ? (
          <LoadingRows label="Loading schools" />
        ) : (
          <DataTable
            rows={rows}
            columns={[
              {
                id: "name",
                header: "School",
                cell: (school: SchoolRow) => (
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{school.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {school.city ?? "City not set"} · {school.code ?? "No code"}
                    </p>
                  </div>
                ),
                sortValue: (school: SchoolRow) => school.name,
              },
              {
                id: "students",
                header: "Students",
                align: "right" as const,
                cell: (school: SchoolRow) => (
                  <span className="font-semibold tabular-nums">{school.students}</span>
                ),
                sortValue: (school: SchoolRow) => school.students,
              },
              {
                id: "teachers",
                header: "Teachers",
                align: "right" as const,
                cell: (school: SchoolRow) => (
                  <span className="tabular-nums">{school.teachers}</span>
                ),
                sortValue: (school: SchoolRow) => school.teachers,
              },
              {
                id: "batches",
                header: "Batches",
                align: "right" as const,
                cell: (school: SchoolRow) => <span className="tabular-nums">{school.batches}</span>,
                sortValue: (school: SchoolRow) => school.batches,
              },
              {
                id: "lab",
                header: "Lab",
                cell: (school: SchoolRow) => <StatusBadge value={school.lab_status} />,
                sortValue: (school: SchoolRow) => school.lab_status,
              },
            ]}
            rowKey={(school) => school.id}
            searchFields={(school) => [school.name, school.city, school.code, school.contact_email]}
            searchPlaceholder="Search schools…"
            filters={[
              {
                id: "lab",
                label: "Lab status",
                options: [
                  { label: "Active", value: "active" },
                  { label: "Pending", value: "pending" },
                ],
                match: (school, value) => school.lab_status === value,
              },
            ]}
            empty="No schools yet — add your first partner school."
            actions={(school) => [
              {
                label: school.lab_status === "active" ? "Mark lab pending" : "Activate lab",
                icon: Beaker,
                onSelect: (row) => void toggleLab(row),
              },
              {
                label: "Delete school",
                icon: Trash2,
                destructive: true,
                onSelect: (row) => setDeleting(row),
              },
            ]}
          />
        )}
      </Panel>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Add a school"
        description="The school appears in the partner list immediately."
        fields={[
          { name: "name", label: "School name", required: true },
          { name: "code", label: "School code", placeholder: "DPS-AI-01" },
          { name: "city", label: "City" },
          { name: "state", label: "State" },
          { name: "address", label: "Address", type: "textarea" },
          { name: "contact_email", label: "Contact email", type: "email" },
          { name: "contact_phone", label: "Contact phone" },
          {
            name: "lab_status",
            label: "Lab status",
            type: "select",
            options: [
              { label: "Pending", value: "pending" },
              { label: "Active", value: "active" },
            ],
            defaultValue: "pending",
          },
        ]}
        submitLabel="Add school"
        onSubmit={createSchool}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "school"}?`}
        description="Students, batches and invoices stay in the database but lose this school link."
        onConfirm={async () => {
          if (!deleting) return;
          await remove(`/api/admin/schools/${deleting.id}`);
          toast.success("School deleted");
          setDeleting(null);
          refresh();
        }}
      />
    </DashboardShell>
  );
}
