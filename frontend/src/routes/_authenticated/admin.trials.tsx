import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarCheck, Mail, Phone } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { patch } from "@/lib/dash.api";
import { countBy, Field, FilterBar, NotesEditor, StatusBadge } from "@/components/dash/AdminBits";
import { DashboardShell, Empty, StatCard } from "@/components/dash/DashboardShell";
import { StatusPicker } from "@/components/dash/StatusPicker";
import { formatDate, matchesSearch, TRIAL_LABELS, TRIAL_STATUSES } from "@/lib/admin-constants";
import { adminTrialsQuery } from "@/lib/admin.queries";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/trials")({
  head: () => ({
    meta: [
      ...pageMeta("Free Trial Bookings", "Manage AIKIDZ free trial class bookings."),
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(adminTrialsQuery()),
  component: AdminTrials,
});

function AdminTrials() {
  const qc = useQueryClient();
  const { data: rows } = useSuspenseQuery(adminTrialsQuery());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const counts = useMemo(() => countBy(rows, (r) => r.status), [rows]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = rows.filter(
    (r) => (r.preferred_date ?? "") >= today && !["cancelled", "converted", "attended"].includes(r.status),
  ).length;
  const shown = rows.filter(
    (r) =>
      (status === "all" || r.status === status) &&
      matchesSearch(search, r.parent_name, r.child_name, r.email, r.phone, r.preferred_program),
  );

  async function save(id: string, changes: { status?: string; notes?: string | null }) {
    try {
      await patch(`/admin/trials/${id}`, changes);
      toast.success("Trial booking updated");
      await qc.invalidateQueries({ queryKey: ["admin", "trials"] });
      void qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    } catch {
      toast.error("We couldn't save that change.");
    }
  }

  return (
    <DashboardShell
      role="admin"
      title="Free trial bookings"
      subtitle="Pending → Scheduled → Completed → Converted. Call new bookings, schedule the class and record how it went."
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending, not contacted"
          value={counts["new"] ?? 0}
          icon={CalendarCheck}
          tone="sun"
        />
        <StatCard label="Upcoming trials" value={upcoming} icon={CalendarCheck} />
        <StatCard
          label="Converted to students"
          value={counts["converted"] ?? 0}
          icon={CalendarCheck}
          tone="mint"
        />
      </div>
      <FilterBar
        search={search}
        onSearch={setSearch}
        statuses={TRIAL_STATUSES}
        status={status}
        onStatus={setStatus}
        counts={counts}
        labels={TRIAL_LABELS}
        placeholder="Search parent, child, phone…"
      />
      {shown.length === 0 ? (
        <Empty>
          {rows.length
            ? "No bookings match this filter."
            : "No trial bookings yet. They appear here when parents use the free trial form."}
        </Empty>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id} className="glass-panel glass-hover rounded-3xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">
                      {r.child_name}, {r.child_age} yrs
                    </h2>
                    <StatusBadge value={r.status} labels={TRIAL_LABELS} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Parent: {r.parent_name} · booked {formatDate(r.createdAt, true)}
                  </p>
                </div>
                <StatusPicker
                  label={`Status for ${r.child_name}`}
                  value={r.status}
                  options={TRIAL_STATUSES}
                  labels={TRIAL_LABELS}
                  onSave={(v) => save(r.id, { status: v })}
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Program">{r.preferred_program}</Field>
                <Field label="Preferred slot">
                  {formatDate(r.preferred_date)} · {r.preferred_time}
                </Field>
                <Field label="Phone">
                  <a
                    href={`tel:${r.phone}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Phone className="size-3.5" />
                    {r.phone}
                  </a>
                </Field>
                <Field label="Email">
                  <a
                    href={`mailto:${r.email}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Mail className="size-3.5" />
                    {r.email}
                  </a>
                </Field>
              </div>
              <div className="mt-4">
                <NotesEditor
                  value={r.notes ?? null}
                  onSave={(v) => save(r.id, { notes: v })}
                  label={`Notes for ${r.child_name}`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
