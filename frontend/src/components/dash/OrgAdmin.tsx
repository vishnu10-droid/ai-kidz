import { Mail, Pencil, Phone, Plus } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { countBy, Field, FilterBar, NotesEditor, StatusBadge } from "@/components/dash/AdminBits";
import { Empty } from "@/components/dash/DashboardShell";
import { OrgDialog, type OrgKind, type OrgValues } from "@/components/dash/OrgDialog";
import { StatusPicker } from "@/components/dash/StatusPicker";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  APPLICATION_STATUSES,
  formatDate,
  humanize,
  LAB_LABELS,
  LAB_STATUSES,
  matchesSearch,
  ORG_STATUSES,
  SCHOOL_PACKAGES,
} from "@/lib/admin-constants";
import { formatINR } from "@/lib/pricing";

export type OrgRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  package?: string;
  created_at: string;
  owner: { full_name: string; email: string | null } | null;
  students?: number;
  teachers?: number;
  lab_status?: string;
  revenue_share?: number;
  revenue?: number;
};
export type AppRow = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  email: string;
  phone: string;
  city: string | null;
  state: string | null;
  message: string | null;
  details: [string, ReactNode][];
  prefill: Partial<OrgValues>;
};

/** Shared admin screen for partner schools and franchise centres: live organisations + incoming applications. */
export function OrgAdmin({
  kind,
  orgs,
  apps,
  saveOrg,
  saveApp,
  refresh,
}: {
  kind: OrgKind;
  orgs: OrgRow[];
  apps: AppRow[];
  saveOrg: (
    id: string,
    patch: { status?: string; package?: string; lab_status?: string; revenue_share?: number },
  ) => Promise<void>;
  saveApp: (id: string, patch: { status?: string; admin_notes?: string | null }) => Promise<void>;
  refresh: () => Promise<void>;
}) {
  const noun = kind === "school" ? "school" : "centre";
  const [orgSearch, setOrgSearch] = useState("");
  const [orgStatus, setOrgStatus] = useState("all");
  const [appSearch, setAppSearch] = useState("");
  const [appStatus, setAppStatus] = useState("all");
  const orgCounts = useMemo(() => countBy(orgs, (o) => o.status), [orgs]);
  const appCounts = useMemo(() => countBy(apps, (a) => a.status), [apps]);
  const shownOrgs = orgs.filter(
    (o) =>
      (orgStatus === "all" || o.status === orgStatus) &&
      matchesSearch(
        orgSearch,
        o.name,
        o.city,
        o.state,
        o.email,
        o.owner?.full_name,
        o.owner?.email,
      ),
  );
  const shownApps = apps.filter(
    (a) =>
      (appStatus === "all" || a.status === appStatus) &&
      matchesSearch(appSearch, a.title, a.subtitle, a.email, a.phone, a.city),
  );

  return (
    <Tabs
      defaultValue={
        (orgCounts["pending"] ?? 0) === 0 && (appCounts["new"] ?? 0) > 0 ? "apps" : "orgs"
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="orgs">
            {kind === "school" ? "Partner schools" : "Centres"} ({orgs.length})
            {orgCounts["pending"] ? ` · ${orgCounts["pending"]} pending` : ""}
          </TabsTrigger>
          <TabsTrigger value="apps">
            Applications ({apps.length}){appCounts["new"] ? ` · ${appCounts["new"]} new` : ""}
          </TabsTrigger>
        </TabsList>
        <OrgDialog
          kind={kind}
          onSaved={refresh}
          trigger={
            <Button variant="brand">
              <Plus /> Add {noun}
            </Button>
          }
        />
      </div>

      <TabsContent value="orgs">
        <FilterBar
          search={orgSearch}
          onSearch={setOrgSearch}
          statuses={ORG_STATUSES}
          status={orgStatus}
          onStatus={setOrgStatus}
          counts={orgCounts}
          placeholder={`Search ${noun}, city, owner…`}
        />
        {shownOrgs.length === 0 ? (
          <Empty>
            {orgs.length
              ? `No ${noun}s match this filter.`
              : `No ${noun}s yet. Add one, approve an application, or wait for a partner to sign up.`}
          </Empty>
        ) : (
          <ul className="space-y-3">
            {shownOrgs.map((o) => (
              <li key={o.id} className="glass-panel glass-hover rounded-3xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold">{o.name}</h2>
                      <StatusBadge value={o.status} />
                      {o.package && (
                        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                          {humanize(o.package)} package
                        </span>
                      )}
                      {o.lab_status && <StatusBadge value={o.lab_status} labels={LAB_LABELS} />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[o.city, o.state].filter(Boolean).join(", ") || "Location not set"} · added{" "}
                      {formatDate(o.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {o.status === "pending" && (
                      <Button
                        size="sm"
                        variant="brand"
                        onClick={() => void saveOrg(o.id, { status: "active" })}
                      >
                        Approve
                      </Button>
                    )}
                    <StatusPicker
                      label={`Status for ${o.name}`}
                      value={o.status}
                      options={ORG_STATUSES}
                      onSave={(v) => saveOrg(o.id, { status: v })}
                    />
                    {kind === "school" && o.package && (
                      <StatusPicker
                        label={`Package for ${o.name}`}
                        value={o.package}
                        options={SCHOOL_PACKAGES}
                        onSave={(v) => saveOrg(o.id, { package: v })}
                      />
                    )}
                    {kind === "school" && o.lab_status && (
                      <StatusPicker
                        label={`Lab setup for ${o.name}`}
                        value={o.lab_status}
                        options={LAB_STATUSES}
                        labels={LAB_LABELS}
                        onSave={(v) => saveOrg(o.id, { lab_status: v })}
                      />
                    )}
                    <OrgDialog
                      kind={kind}
                      existingId={o.id}
                      onSaved={refresh}
                      initial={{
                        name: o.name,
                        email: o.email ?? "",
                        phone: o.phone ?? "",
                        address: o.address ?? "",
                        city: o.city ?? "",
                        state: o.state ?? "",
                        package: o.package ?? "starter",
                        ownerEmail: o.owner?.email ?? "",
                      }}
                      trigger={
                        <Button size="sm" variant="outline" aria-label={`Edit ${o.name}`}>
                          <Pencil /> Edit
                        </Button>
                      }
                    />
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  <Field label="People">
                    {o.students ?? 0} students · {o.teachers ?? 0} teachers
                  </Field>
                  {kind === "franchise" && (
                    <Field label="Revenue · share">
                      {formatINR(o.revenue ?? 0)}
                      <RevenueShare
                        value={o.revenue_share ?? 20}
                        revenue={o.revenue ?? 0}
                        name={o.name}
                        onSave={(v) => saveOrg(o.id, { revenue_share: v })}
                      />
                    </Field>
                  )}
                  <Field label="Owner account">
                    {o.owner ? (
                      <>
                        {o.owner.full_name}
                        <span className="block text-xs text-muted-foreground">{o.owner.email}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Not linked</span>
                    )}
                  </Field>
                  <Field label="Phone">
                    {o.phone ? (
                      <a
                        href={`tel:${o.phone}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Phone className="size-3.5" />
                        {o.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </Field>
                  <Field label="Email">
                    {o.email ? (
                      <a
                        href={`mailto:${o.email}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Mail className="size-3.5" />
                        {o.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </Field>
                </div>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="apps">
        <FilterBar
          search={appSearch}
          onSearch={setAppSearch}
          statuses={APPLICATION_STATUSES}
          status={appStatus}
          onStatus={setAppStatus}
          counts={appCounts}
          placeholder="Search name, city, phone…"
        />
        {shownApps.length === 0 ? (
          <Empty>
            {apps.length
              ? "No applications match this filter."
              : "No applications yet. They arrive from the partnership form on the website."}
          </Empty>
        ) : (
          <ul className="space-y-3">
            {shownApps.map((a) => (
              <li key={a.id} className="glass-panel glass-hover rounded-3xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold">{a.title}</h2>
                      <StatusBadge value={a.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {a.subtitle} · {formatDate(a.created_at, true)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.status !== "approved" && a.status !== "rejected" && (
                      <OrgDialog
                        kind={kind}
                        initial={a.prefill}
                        onSaved={async () => {
                          await saveApp(a.id, { status: "approved" });
                          await refresh();
                        }}
                        trigger={
                          <Button size="sm" variant="brand">
                            Approve &amp; create {noun}
                          </Button>
                        }
                      />
                    )}
                    <StatusPicker
                      label={`Status for ${a.title}`}
                      value={a.status}
                      options={APPLICATION_STATUSES}
                      onSave={(v) => saveApp(a.id, { status: v })}
                    />
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Phone">
                    <a
                      href={`tel:${a.phone}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Phone className="size-3.5" />
                      {a.phone}
                    </a>
                  </Field>
                  <Field label="Email">
                    <a
                      href={`mailto:${a.email}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Mail className="size-3.5" />
                      {a.email}
                    </a>
                  </Field>
                  <Field label="Location">
                    {[a.city, a.state].filter(Boolean).join(", ") || "—"}
                  </Field>
                  {a.details.map(([k, val]) => (
                    <Field key={k} label={k}>
                      {val}
                    </Field>
                  ))}
                </div>
                {a.message && (
                  <p className="mt-3 whitespace-pre-line rounded-2xl bg-muted/50 p-3 text-sm">
                    {a.message}
                  </p>
                )}
                <div className="mt-4">
                  <NotesEditor
                    value={a.admin_notes}
                    onSave={(v) => saveApp(a.id, { admin_notes: v })}
                    label={`Admin notes for ${a.title}`}
                    placeholder="Internal notes (not shared with the applicant)…"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}

/** AIKIDZ's revenue share for a centre, saved when the field loses focus. */
function RevenueShare({
  value,
  revenue,
  name,
  onSave,
}: {
  value: number;
  revenue: number;
  name: string;
  onSave: (v: number) => Promise<void>;
}) {
  const [text, setText] = useState(String(value));
  const pct = Number(text);
  return (
    <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Input
        aria-label={`AIKIDZ revenue share for ${name} (%)`}
        type="number"
        min={0}
        max={100}
        step={0.5}
        className="h-7 w-16 px-2 text-xs"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (!Number.isFinite(pct) || pct < 0 || pct > 100) return setText(String(value));
          if (pct !== Number(value)) void onSave(pct);
        }}
      />
      % to AIKIDZ{Number.isFinite(pct) ? ` · ${formatINR((revenue * pct) / 100)}` : ""}
    </span>
  );
}
