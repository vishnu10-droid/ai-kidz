import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/dash/DashboardShell";
import { OrgAdmin } from "@/components/dash/OrgAdmin";
import { adminFranchisesQuery } from "@/lib/admin.queries";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/franchises")({
  head: () => ({ meta: [...pageMeta("Franchise Centres", "Approve and manage AIKIDZ franchise centres and applications."), { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(adminFranchisesQuery()),
  component: AdminFranchises,
});

function AdminFranchises() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(adminFranchisesQuery());

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["admin-franchises"] });
    void qc.invalidateQueries({ queryKey: ["admin-home"] });
    void qc.invalidateQueries({ queryKey: ["admin-franchise-options"] });
  }

  return (
    <DashboardShell role="admin" title="Franchise centres" subtitle="Centres, applications, revenue and AIKIDZ revenue share.">
      <OrgAdmin
        kind="franchise"
        orgs={data.franchises}
        refresh={refresh}
        saveOrg={async (id, patch) => {
          const { error } = await supabase.from("franchises").update({ ...(patch.status ? { status: patch.status } : {}), ...(patch.revenue_share !== undefined ? { revenue_share: patch.revenue_share } : {}) }).eq("id", id);
          if (error) return void toast.error("We couldn't update that centre.");
          toast.success("Centre updated");
          await refresh();
        }}
        saveApp={async (id, patch) => {
          const { error } = await supabase.from("franchise_applications").update(patch).eq("id", id);
          if (error) return void toast.error("We couldn't update that application.");
          toast.success("Application updated");
          await refresh();
        }}
        apps={data.applications.map((a) => ({
          id: a.id,
          title: a.applicant_name,
          subtitle: "Franchise application",
          status: a.status,
          admin_notes: a.admin_notes,
          created_at: a.created_at,
          email: a.email,
          phone: a.phone,
          city: a.city,
          state: a.state,
          message: a.message,
          details: [["Investment", a.investment_capacity ?? "—"], ["Business experience", a.business_experience ?? "—"]],
          prefill: { name: `AIKIDZ ${a.city ?? ""}`.trim(), email: a.email, phone: a.phone, city: a.city ?? "", state: a.state ?? "", ownerEmail: a.email },
        }))}
      />
    </DashboardShell>
  );
}
