import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Mail, Phone } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { countBy, Field, FilterBar, NotesEditor, StatusBadge } from "@/components/dash/AdminBits";
import { DashboardShell, Empty } from "@/components/dash/DashboardShell";
import { StatusPicker } from "@/components/dash/StatusPicker";
import { selectClass } from "@/components/site/FormField";
import { Input } from "@/components/ui/input";
import { ENQUIRY_STATUSES, formatDate, humanize, matchesSearch } from "@/lib/admin-constants";
import { adminEnquiriesQuery } from "@/lib/admin.queries";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/enquiries")({
  head: () => ({ meta: [...pageMeta("Enquiries", "Contact and partnership enquiries sent to AIKIDZ."), { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(adminEnquiriesQuery()),
  component: AdminEnquiries,
});

type Patch = { status?: string; notes?: string | null; follow_up_date?: string | null; franchise_id?: string | null };

function AdminEnquiries() {
  const qc = useQueryClient();
  const { data: rows } = useSuspenseQuery(adminEnquiriesQuery());
  const { data: centres = [] } = useQuery({
    queryKey: ["admin-franchise-options"],
    queryFn: async () => (await supabase.from("franchises").select("id, name, city, status").order("name")).data ?? [],
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");

  const sources = useMemo(() => [...new Set(rows.map((r) => r.source))].sort(), [rows]);
  const bySource = rows.filter((r) => source === "all" || r.source === source);
  const counts = useMemo(() => countBy(bySource, (r) => r.status), [bySource]);
  const shown = bySource.filter((r) => (status === "all" || r.status === status) && matchesSearch(search, r.name, r.email, r.phone, r.subject, r.message, r.child_name));

  async function save(id: string, patch: Patch) {
    const { error } = await supabase.from("enquiries").update(patch).eq("id", id);
    if (error) return void toast.error("We couldn't save that change.");
    toast.success("Enquiry updated");
    await qc.invalidateQueries({ queryKey: ["admin-enquiries"] });
    void qc.invalidateQueries({ queryKey: ["admin-home"] });
  }

  return (
    <DashboardShell role="admin" title="Enquiries" subtitle="Contact form messages and partnership questions. Hand leads to a centre or follow up yourself.">
      <FilterBar
        search={search}
        onSearch={setSearch}
        statuses={ENQUIRY_STATUSES}
        status={status}
        onStatus={setStatus}
        counts={counts}
        placeholder="Search name, email, message…"
        extra={
          <select aria-label="Filter by source" className={cn(selectClass, "w-40")} value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">All sources</option>
            {sources.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
          </select>
        }
      />
      {shown.length === 0 ? <Empty>{rows.length ? "No enquiries match this filter." : "No enquiries yet. Messages from the contact and partnership forms appear here."}</Empty> : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id} className="rounded-3xl border bg-card p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">{r.name}</h2>
                    <StatusBadge value={r.status} />
                    <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{humanize(r.source)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.subject ?? "No subject"} · {formatDate(r.created_at, true)}</p>
                </div>
                <StatusPicker label={`Status for ${r.name}`} value={r.status} options={ENQUIRY_STATUSES} onSave={(v) => save(r.id, { status: v })} />
              </div>
              {r.message && <p className="mt-3 whitespace-pre-line rounded-2xl bg-muted/50 p-3 text-sm">{r.message}</p>}
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Phone">{r.phone ? <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline"><Phone className="size-3.5" />{r.phone}</a> : "—"}</Field>
                <Field label="Email">{r.email ? <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 text-primary hover:underline"><Mail className="size-3.5" />{r.email}</a> : "—"}</Field>
                <Field label="Follow up on">
                  <Input type="date" aria-label={`Follow-up date for ${r.name}`} className="h-8 w-44" defaultValue={r.follow_up_date ?? ""} onBlur={(e) => { const v = e.target.value || null; if (v !== r.follow_up_date) void save(r.id, { follow_up_date: v }); }} />
                </Field>
                <Field label="Assigned centre">
                  <select aria-label={`Assign ${r.name} to a centre`} className={cn(selectClass, "h-8 text-xs")} value={r.franchise_id ?? ""} onChange={(e) => void save(r.id, { franchise_id: e.target.value || null })}>
                    <option value="">Head office</option>
                    {centres.map((c) => <option key={c.id} value={c.id}>{c.name}{c.city ? ` (${c.city})` : ""}{c.status !== "active" ? ` · ${c.status}` : ""}</option>)}
                  </select>
                </Field>
              </div>
              {(r.child_name || r.program) && <p className="mt-3 text-sm text-muted-foreground">Child: {r.child_name ?? "—"}{r.child_age ? `, ${r.child_age} yrs` : ""}{r.program ? ` · interested in ${r.program}` : ""}</p>}
              <div className="mt-4"><NotesEditor value={r.notes} onSave={(v) => save(r.id, { notes: v })} label={`Notes for ${r.name}`} /></div>
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
