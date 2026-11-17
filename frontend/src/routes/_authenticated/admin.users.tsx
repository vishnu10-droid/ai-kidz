import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, RefreshCw, ShieldCheck, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/dash/AdminBits";
import { DashboardShell, Panel } from "@/components/dash/DashboardShell";
import { FormDialog } from "@/components/dash/DashKit";
import { LoadingRows } from "@/components/dash/DashSections";
import { DataTable } from "@/components/dash/DataTable";
import { Button } from "@/components/ui/button";
import { dashQuery, dateLabel, patch } from "@/lib/dash.api";
import type { DashUser } from "@/lib/dash.api";
import { ROLE_LABEL, type AppRole } from "@/lib/roles";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      ...pageMeta("Users & Roles", "Manage AIKIDZ platform members."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUsers,
});

const ROLES = Object.keys(ROLE_LABEL) as AppRole[];

function AdminUsers() {
  const qc = useQueryClient();
  const users = useQuery(dashQuery<DashUser[]>(["admin", "users"], "/api/admin/users"));
  const [editing, setEditing] = useState<DashUser | null>(null);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin", "users"] });

  async function setRole(values: Record<string, string>) {
    if (!editing) return;
    await patch(`/api/admin/users/${editing.id}`, { role: values["role"] });
    toast.success(
      `${editing.full_name} is now ${ROLE_LABEL[values["role"] as AppRole] ?? values["role"]}`,
    );
    setEditing(null);
    refresh();
  }

  async function toggleActive(user: DashUser) {
    try {
      await patch(`/api/admin/users/${user.id}`, { is_active: !user.is_active });
      toast.success(`${user.full_name} ${user.is_active ? "deactivated" : "reactivated"}`);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the account");
    }
  }

  const roleCounts = ROLES.map((role) => ({
    role,
    count: (users.data ?? []).filter((user) => user.roles?.includes(role)).length,
  }));

  return (
    <DashboardShell
      role="admin"
      title="Users & roles"
      subtitle="Every account on AIKIDZ, with role switching and instant deactivation."
      actions={
        <Button variant="outline" size="sm" className="rounded-full" onClick={refresh}>
          <RefreshCw className="size-4" /> Refresh
        </Button>
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {roleCounts.map(({ role, count }) => (
          <span
            key={role}
            className="glass-tile inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
          >
            <span className="text-muted-foreground">{ROLE_LABEL[role]}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 tabular-nums text-primary">
              {count}
            </span>
          </span>
        ))}
      </div>

      <Panel
        title="All users"
        description="Search by name or email, then change a role or deactivate an account."
      >
        {users.isLoading ? (
          <LoadingRows label="Loading users" />
        ) : (
          <DataTable
            rows={users.data ?? []}
            columns={[
              {
                id: "name",
                header: "User",
                cell: (user: DashUser) => (
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{user.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                ),
                sortValue: (user: DashUser) => user.full_name,
              },
              {
                id: "roles",
                header: "Roles",
                cell: (user: DashUser) => (
                  <div className="flex flex-wrap gap-1">
                    {(user.roles ?? []).map((role) => (
                      <span
                        key={role}
                        className="rounded-full bg-violet/10 px-2 py-0.5 text-[11px] font-semibold capitalize text-violet"
                      >
                        {ROLE_LABEL[role as AppRole] ?? role}
                      </span>
                    ))}
                  </div>
                ),
                sortValue: (user: DashUser) => (user.roles ?? []).join(","),
              },
              {
                id: "status",
                header: "Status",
                cell: (user: DashUser) => (
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      user.is_active
                        ? "bg-mint/15 text-mint"
                        : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {user.is_active ? "Active" : "Deactivated"}
                  </span>
                ),
                sortValue: (user: DashUser) => (user.is_active ? 1 : 0),
              },
              {
                id: "joined",
                header: "Joined",
                cell: (user: DashUser) => (
                  <span className="text-xs text-muted-foreground">{dateLabel(user.createdAt)}</span>
                ),
                sortValue: (user: DashUser) => user.createdAt ?? "",
              },
            ]}
            rowKey={(user) => user.id}
            searchFields={(user) => [user.full_name, user.email, user.phone]}
            searchPlaceholder="Search users…"
            filters={[
              {
                id: "role",
                label: "Roles",
                options: ROLES.map((role) => ({ label: ROLE_LABEL[role], value: role })),
                match: (user, value) => (user.roles ?? []).includes(value),
              },
              {
                id: "status",
                label: "Status",
                options: [
                  { label: "Active", value: "active" },
                  { label: "Deactivated", value: "inactive" },
                ],
                match: (user, value) => (value === "active" ? user.is_active : !user.is_active),
              },
            ]}
            empty="No users match these filters."
            actions={(user) => [
              { label: "Change role", icon: Pencil, onSelect: (row) => setEditing(row) },
              {
                label: user.is_active ? "Deactivate" : "Reactivate",
                icon: user.is_active ? UserX : ShieldCheck,
                destructive: user.is_active,
                onSelect: (row) => void toggleActive(row),
              },
            ]}
          />
        )}
      </Panel>

      <FormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title={`Change role for ${editing?.full_name ?? "user"}`}
        description="The account keeps a single role and gains that dashboard immediately."
        fields={[
          {
            name: "role",
            label: "Role",
            type: "select",
            options: ROLES.map((role) => ({ label: ROLE_LABEL[role], value: role })),
            defaultValue: (editing?.roles?.[0] as AppRole | undefined) ?? "student",
          },
        ]}
        submitLabel="Update role"
        onSubmit={setRole}
      />
    </DashboardShell>
  );
}
