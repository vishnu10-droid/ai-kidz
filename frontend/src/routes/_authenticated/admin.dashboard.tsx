import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Activity, AlertCircle, Building2, CalendarCheck, GraduationCap, IndianRupee, Mail, Package, School, Store, TrendingUp, UserPlus, Users, type LucideIcon } from "lucide-react";
import { StatusBadge } from "@/components/dash/AdminBits";
import { DashboardShell, Empty, Panel, StatCard } from "@/components/dash/DashboardShell";
import { Button } from "@/components/ui/button";
import { formatDate, TRIAL_LABELS } from "@/lib/admin-constants";
import { adminHomeQuery } from "@/lib/admin.queries";
import { formatINR } from "@/lib/pricing";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({ meta: [...pageMeta("Admin Overview", "AIKIDZ platform overview: learners, partners, leads, orders and revenue."), { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(adminHomeQuery()),
  component: AdminHome,
});

function AdminHome() {
  const { data } = useSuspenseQuery(adminHomeQuery());
  const approvals = data.pendingSchools + data.pendingFranchises;
  type Item = { key: string; at: string; icon: LucideIcon; text: string; href: "/admin/users" | "/admin/trials" | "/admin/enquiries" | "/admin/orders" | "/admin/schools" | "/admin/franchises" };
  const activity: Item[] = [
    ...data.signups.map((u) => ({ key: `u${u.id}`, at: u.created_at, icon: UserPlus, text: `${u.full_name} created an account${u.city ? ` · ${u.city}` : ""}`, href: "/admin/users" as const })),
    ...data.trials.map((t) => ({ key: `t${t.id}`, at: t.created_at, icon: CalendarCheck, text: `Free trial booked for ${t.child_name} · ${t.preferred_program}`, href: "/admin/trials" as const })),
    ...data.enquiries.map((e) => ({ key: `e${e.id}`, at: e.created_at, icon: Mail, text: `Enquiry from ${e.name}${e.subject ? ` · ${e.subject}` : ""}`, href: "/admin/enquiries" as const })),
    ...data.recentOrders.map((o) => ({ key: `o${o.id}`, at: o.created_at, icon: Package, text: `Order ${o.order_number} · ${formatINR(o.total)}${o.customer_name ? ` · ${o.customer_name}` : ""}`, href: "/admin/orders" as const })),
    ...data.schoolApps.map((a) => ({ key: `s${a.id}`, at: a.created_at, icon: Building2, text: `School application: ${a.school_name}`, href: "/admin/schools" as const })),
    ...data.franchiseApps.map((a) => ({ key: `f${a.id}`, at: a.created_at, icon: Store, text: `Franchise application: ${a.applicant_name}${a.city ? ` · ${a.city}` : ""}`, href: "/admin/franchises" as const })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10);

  return (
    <DashboardShell role="admin" title="Platform overview" subtitle="Everything happening across AIKIDZ at a glance.">
      {approvals > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-3xl border border-sun/40 bg-sun/10 p-4">
          <AlertCircle className="size-5 text-sun-foreground" />
          <p className="flex-1 text-sm font-medium">
            {approvals} partner sign-up{approvals > 1 ? "s" : ""} waiting for approval
            {data.pendingSchools ? ` · ${data.pendingSchools} school${data.pendingSchools > 1 ? "s" : ""}` : ""}
            {data.pendingFranchises ? ` · ${data.pendingFranchises} centre${data.pendingFranchises > 1 ? "s" : ""}` : ""}
          </p>
          {data.pendingSchools > 0 && <Button asChild size="sm" variant="outline"><Link to="/admin/schools">Review schools</Link></Button>}
          {data.pendingFranchises > 0 && <Button asChild size="sm" variant="outline"><Link to="/admin/franchises">Review centres</Link></Button>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue collected" value={formatINR(data.revenue)} icon={IndianRupee} tone="mint" hint="All paid kit orders and course fees" />
        <StatCard label="Active students" value={data.activeStudents} icon={GraduationCap} hint={`${data.students} students · ${data.users} accounts`} />
        <StatCard label="Conversion rate" value={data.conversionRate === null ? "—" : `${data.conversionRate}%`} icon={TrendingUp} tone="violet" hint={`${data.converted} of ${data.leads} trials & enquiries converted`} />
        <StatCard label="Teachers" value={data.teachers} icon={Users} tone="sun" />
        <StatCard label="Partner schools" value={data.schools} icon={School} hint={data.pendingSchools ? `${data.pendingSchools} pending approval` : undefined} />
        <StatCard label="Franchise centres" value={data.franchises} icon={Store} tone="violet" hint={data.pendingFranchises ? `${data.pendingFranchises} pending approval` : undefined} />
        <StatCard label="Kit orders" value={data.orders} icon={Package} tone="sun" hint={data.openOrders ? `${data.openOrders} to fulfil` : "Nothing waiting"} />
        <StatCard label="New leads" value={data.newEnquiries + data.newTrials} icon={Mail} tone="mint" hint={`${data.newTrials} trials · ${data.newEnquiries} enquiries`} />
      </div>

      <Panel title="Recent activity" className="mt-6" action={<Activity className="size-4 text-muted-foreground" />}>
        {activity.length === 0 ? <Empty>Nothing yet. Sign-ups, bookings, enquiries and orders appear here as they happen.</Empty> : (
          <ol className="relative space-y-1 border-l pl-5">
            {activity.map((a) => (
              <li key={a.key} className="relative">
                <span className="absolute -left-[29px] top-2 grid size-6 place-items-center rounded-full border bg-card text-primary"><a.icon className="size-3.5" /></span>
                <Link to={a.href} className="flex flex-wrap items-baseline gap-x-3 rounded-xl px-2 py-1.5 text-sm hover:bg-muted/60">
                  <span className="min-w-0 flex-1">{a.text}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(a.at, true)}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Latest free trials" action={<Button asChild size="sm" variant="ghost"><Link to="/admin/trials">View all</Link></Button>}>
          {data.trials.length === 0 ? <Empty>No trial bookings yet.</Empty> : (
            <ul className="divide-y">
              {data.trials.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <CalendarCheck className="size-4 text-primary" />
                  <span className="min-w-0 flex-1 truncate"><strong>{t.child_name}</strong> ({t.child_age}) · {t.preferred_program}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(t.preferred_date)} · {t.preferred_time}</span>
                  <StatusBadge value={t.status} labels={TRIAL_LABELS} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Latest enquiries" action={<Button asChild size="sm" variant="ghost"><Link to="/admin/enquiries">View all</Link></Button>}>
          {data.enquiries.length === 0 ? <Empty>No enquiries yet.</Empty> : (
            <ul className="divide-y">
              {data.enquiries.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate"><strong>{e.name}</strong>{e.subject ? ` · ${e.subject}` : ""}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(e.created_at)}</span>
                  <StatusBadge value={e.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent orders" action={<Button asChild size="sm" variant="ghost"><Link to="/admin/orders">View all</Link></Button>}>
          {data.recentOrders.length === 0 ? <Empty>No orders yet.</Empty> : (
            <ul className="divide-y">
              {data.recentOrders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <span className="font-mono text-xs">{o.order_number}</span>
                  <span className="min-w-0 flex-1 truncate">{o.customer_name ?? "—"}</span>
                  <span className="font-semibold">{formatINR(o.total)}</span>
                  <StatusBadge value={o.status} />
                  <StatusBadge value={o.payment_status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Partnership applications">
          {data.schoolApps.length + data.franchiseApps.length === 0 ? <Empty>No school or franchise applications yet.</Empty> : (
            <ul className="divide-y">
              {data.schoolApps.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <Building2 className="size-4 text-primary" />
                  <Link to="/admin/schools" className="min-w-0 flex-1 truncate hover:underline"><strong>{a.school_name}</strong> · {[a.city, a.state].filter(Boolean).join(", ")}</Link>
                  <StatusBadge value={a.status} />
                </li>
              ))}
              {data.franchiseApps.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <Store className="size-4 text-violet" />
                  <Link to="/admin/franchises" className="min-w-0 flex-1 truncate hover:underline"><strong>{a.applicant_name}</strong> · {[a.city, a.state].filter(Boolean).join(", ")}</Link>
                  <StatusBadge value={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </DashboardShell>
  );
}
