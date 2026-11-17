import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Plus, ShieldCheck, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FilterBar } from "@/components/dash/AdminBits";
import { DashboardShell, Empty, StatCard } from "@/components/dash/DashboardShell";
import { selectClass } from "@/components/site/FormField";
import { formatDate, matchesSearch } from "@/lib/admin-constants";
import { adminUsersQuery } from "@/lib/admin.queries";
import { useAuth } from "@/lib/auth";
import { ROLE_LABEL, ROLE_PRIORITY, type AppRole } from "@/lib/roles";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [...pageMeta("Users & Roles", "AIKIDZ user directory and role assignments."), { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(adminUsersQuery()),
  component: AdminUsers,
});

const ROLE_TONE: Record<AppRole, string> = {
  admin: "bg-destructive/10 text-destructive",
  school_admin: "bg-primary/10 text-primary",
  franchise: "bg-violet/10 text-violet",
  teacher: "bg-sun/15 text-sun-foreground",
  parent: "bg-mint/15 text-mint",
  student: "bg-muted text-foreground",
};

function AdminUsers() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const { data } = useSuspenseQuery(adminUsersQuery());
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const u of data.users) for (const r of u.roles) c[r] = (c[r] ?? 0) + 1;
    return c;
  }, [data.users]);
  const shown = data.users.filter((u) => (role === "all" || u.roles.includes(role)) && matchesSearch(search, u.full_name, u.email, u.phone, u.city));

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function addRole(userId: string, r: AppRole) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: r });
    if (error && error.code !== "23505") return void toast.error("We couldn't add that role.");
    toast.success(`${ROLE_LABEL[r]} role added`);
    await refresh();
  }

  async function removeRole(userId: string, r: AppRole) {
    if (userId === me?.id && r === "admin") return void toast.error("You can't remove your own admin role.");
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", r);
    if (error) return void toast.error("We couldn't remove that role.");
    toast.success(`${ROLE_LABEL[r]} role removed`);
    await refresh();
  }

  return (
    <DashboardShell role="admin" title="Users & roles" subtitle="Everyone with an AIKIDZ account. Roles decide which dashboards a person can open.">
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Accounts" value={data.users.length} icon={Users} />
        <StatCard label="Admins" value={counts["admin"] ?? 0} icon={ShieldCheck} tone="violet" />
        <StatCard label="Partners (schools + centres)" value={(counts["school_admin"] ?? 0) + (counts["franchise"] ?? 0)} icon={Users} tone="mint" />
      </div>
      {data.rolesError && <p role="alert" className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">Roles couldn't be loaded. Refresh the page to try again.</p>}
      <FilterBar search={search} onSearch={setSearch} statuses={ROLE_PRIORITY} status={role} onStatus={setRole} counts={counts} placeholder="Search name, email, phone…" />
      <p className="-mt-2 mb-4 text-xs text-muted-foreground">Role counts include people with more than one role. Giving someone School Admin or Franchise doesn't link them to a school or centre — do that from the Schools or Franchises page.</p>
      {shown.length === 0 ? <Empty>No users match this filter.</Empty> : (
        <div className="overflow-x-auto rounded-3xl border bg-card shadow-soft">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="p-4 font-semibold">Person</th><th className="p-4 font-semibold">Contact</th><th className="p-4 font-semibold">Joined</th><th className="p-4 font-semibold">Roles</th></tr>
            </thead>
            <tbody className="divide-y">
              {shown.map((u) => {
                const missing = ROLE_PRIORITY.filter((r) => !u.roles.includes(r));
                return (
                  <tr key={u.id} className="align-top">
                    <td className="p-4"><div className="font-semibold">{u.full_name}{u.id === me?.id && <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>}</div><div className="text-xs text-muted-foreground">{[u.city, u.state].filter(Boolean).join(", ")}</div></td>
                    <td className="p-4"><div>{u.email ?? "—"}</div><div className="text-xs text-muted-foreground">{u.phone}</div></td>
                    <td className="whitespace-nowrap p-4 text-muted-foreground">{formatDate(u.created_at)}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {u.roles.length === 0 && <span className="text-xs text-muted-foreground">No role</span>}
                        {(u.roles as AppRole[]).map((r) => (
                          <span key={r} className={cn("inline-flex items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1 text-xs font-semibold", ROLE_TONE[r])}>
                            {ROLE_LABEL[r]}
                            <button type="button" aria-label={`Remove ${ROLE_LABEL[r]} role from ${u.full_name}`} onClick={() => void removeRole(u.id, r)} disabled={u.id === me?.id && r === "admin"} className="grid size-4 place-items-center rounded-full hover:bg-foreground/10 disabled:opacity-30">
                              <X className="size-3" />
                            </button>
                          </span>
                        ))}
                        {missing.length > 0 && (
                          <label className="relative inline-flex items-center">
                            <span className="sr-only">Add a role for {u.full_name}</span>
                            <Plus className="pointer-events-none absolute left-2 size-3 text-muted-foreground" />
                            <select
                              className={cn(selectClass, "h-7 w-auto pl-6 pr-2 text-xs")}
                              value=""
                              onChange={(e) => { const v = e.target.value as AppRole; if (v) void addRole(u.id, v); }}
                            >
                              <option value="">Add role</option>
                              {missing.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                            </select>
                          </label>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
