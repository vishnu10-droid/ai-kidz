import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/dash/DashboardShell";
import { OrgAdmin } from "@/components/dash/OrgAdmin";
import { adminSchoolsQuery } from "@/lib/admin.queries";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/schools")({
  head: () => ({ meta: [...pageMeta("School Partners", "Approve and manage AIKIDZ partner schools."), { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(adminSchoolsQuery()),
  component: AdminSchools,
});

function AdminSchools() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(adminSchoolsQuery());

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["admin-schools"] });
    void qc.invalidateQueries({ queryKey: ["admin-home"] });
  }

  return (
    <DashboardShell role="admin" title="School partners" subtitle="Partner schools, lab setup, headcounts, packages and applications.">
      <OrgAdmin
        kind="school"
        orgs={data.schools}
        refresh={refresh}
        saveOrg={async (id, patch) => {
          const { status, package: pkg, lab_status } = patch;
          const { error } = await supabase.from("schools").update({ ...(status ? { status } : {}), ...(pkg ? { package: pkg } : {}), ...(lab_status ? { lab_status } : {}) }).eq("id", id);
          if (error) return void toast.error("We couldn't update that school.");
          toast.success("School updated");
          await refresh();
        }}
        saveApp={async (id, patch) => {
          const { error } = await supabase.from("school_applications").update(patch).eq("id", id);
          if (error) return void toast.error("We couldn't update that application.");
          toast.success("Application updated");
          await refresh();
        }}
        apps={data.applications.map((a) => ({
          id: a.id,
          title: a.school_name,
          subtitle: `Contact: ${a.contact_person}`,
          status: a.status,
          admin_notes: a.admin_notes,
          created_at: a.created_at,
          email: a.school_email,
          phone: a.phone,
          city: a.city,
          state: a.state,
          message: a.message,
          details: [["Address", a.address ?? "—"]],
          prefill: { name: a.school_name, email: a.school_email, phone: a.phone, address: a.address ?? "", city: a.city ?? "", state: a.state ?? "" },
        }))}
      />
    </DashboardShell>
  );
}
