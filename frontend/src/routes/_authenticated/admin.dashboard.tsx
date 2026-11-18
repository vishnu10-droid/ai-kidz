import {
  CalendarCheck,
  GraduationCap,
  Mail,
  Package,
  RefreshCw,
  School,
  Store,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DashboardShell, Panel } from "@/components/dash/DashboardShell";
import { GlassCard, GlassStatCard, type Trend } from "@/components/dash/Glass";
import { StatusBadge } from "@/components/dash/AdminBits";
import { dashQuery, money, dateLabel } from "@/lib/dash.api";
import { Link } from "@tanstack/react-router";
import { pageMeta } from "@/lib/seo";

/* ========================================================================
   Types (mirror the Express /api/admin/* payloads)
   ======================================================================== */

type AdminKpis = {
  revenue: number;
  feeRevenue: number;
  orderRevenue: number;
  schools: number;
  onboardedSchools: number;
  activeSchools: number;
  pendingSchools: number;
  franchises: number;
  activeFranchises: number;
  students: number;
  teachers: number;
  batches: number;
  users: number;
  orders: number;
  totalOrders: number;
  pendingEnquiries: number;
  activeTrials: number;
  pendingTrials: number;
  totalTrials: number;
  franchiseRevenue: number;
};

type AdminTrends = {
  revenue: number | null;
  orders: number | null;
  trials: number | null;
  enquiries: number | null;
};

type AdminRevenuePoint = { label: string; fees: number; orders: number; total: number };

type AdminActivityRow = {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  at: string;
};

type AdminNotificationRow = {
  id: string;
  title: string;
  message?: string | null;
  link?: string | null;
  read?: boolean;
  createdAt?: string;
};

type AdminOrderRow = {
  id: string;
  order_number?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  status?: string | null;
  payment_status?: string | null;
  total?: number | null;
  placed_at?: string | null;
  createdAt?: string;
};

type AdminEnquiryRow = {
  id: string;
  name: string;
  email?: string | null;
  city?: string | null;
  subject?: string | null;
  source?: string | null;
  status?: string | null;
  createdAt?: string;
};

type AdminTrialRow = {
  id: string;
  parent_name: string;
  child_name: string;
  child_age?: number | null;
  email?: string | null;
  phone?: string | null;
  preferred_program?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
  status?: string;
  notes?: string | null;
  source?: string | null;
  createdAt?: string;
};

type AdminPendingSchool = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  lab_status?: string | null;
  status?: string | null;
  createdAt?: string;
};

type AdminOverview = {
  kpis: AdminKpis;
  trends: AdminTrends;
  revenueSeries: AdminRevenuePoint[];
  activity: AdminActivityRow[];
  notifications: AdminNotificationRow[];
  recentOrders: AdminOrderRow[];
  recentEnquiries: AdminEnquiryRow[];
  recentTrials: AdminTrialRow[];
  pendingSchools: AdminPendingSchool[];
};

type AdminAnalyticsRange = "weekly" | "monthly";

type AdminAnalyticsPoint = {
  key: string;
  label: string;
  full: string;
  revenue: number;
  fees: number;
  orders: number;
  trials: number;
  enquiries: number;
};

type AdminAnalyticsTotals = { revenue: number; orders: number; trials: number; enquiries: number };

type AdminAnalytics = {
  range: AdminAnalyticsRange;
  generatedAt: string;
  points: AdminAnalyticsPoint[];
  totals: AdminAnalyticsTotals;
  previous: AdminAnalyticsTotals;
  change: Record<keyof AdminAnalyticsTotals, number | null>;
};

/* ========================================================================
   Query helpers
   ======================================================================== */

const adminOverviewQuery = () =>
  dashQuery<AdminOverview>(["admin", "overview"], "/admin/overview");

const adminAnalyticsQuery = (range: AdminAnalyticsRange) =>
  dashQuery<AdminAnalytics>(["admin", "analytics", range], `/admin/analytics?range=${range}`);

const toTrend = (value: number | null | undefined, caption = "vs previous period"): Trend => ({
  value: value ?? null,
  caption,
});

/* ========================================================================
   Hero Banner — "AIKIDZ Command Center"
   ======================================================================== */

function AdminHeroBanner({
  pendingSchools,
  pendingFranchises,
}: {
  pendingSchools: number;
  pendingFranchises: number;
}) {
  return (
    <GlassCard className="relative overflow-hidden rounded-3xl p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#0b384a]/60 to-transparent"
      />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#167894]/20 bg-[#167894]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0d617c]">
            <School className="size-3.5" aria-hidden /> AIKIDZ Command Center
          </span>
          <h2 className="mt-2 font-display text-2xl font-extrabold leading-tight text-[#0b384a] sm:text-3xl">
            Platform overview
          </h2>
          <p className="mt-1.5 text-sm text-[#5c7880]">
            Quick stats and one-click actions for onboarding partners and managing the network.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            className="rounded-xl bg-[#0b384a] text-white shadow-[0_16px_32px_-18px_rgba(4,40,55,0.9)] hover:bg-[#0d4a60]"
          >
            <Link to="/admin/schools">
              <School className="size-4" aria-hidden /> Manage Schools
            </Link>
          </Button>
          <Button
            asChild
            className="rounded-xl border-[#bdd6dc] bg-white/60 text-[#175166] hover:bg-white"
          >
            <Link to="/admin/franchises">
              <Store className="size-4" aria-hidden /> Manage Franchises
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
        <span
          className={`glass-tile inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[#175166] ${
            pendingSchools > 0 ? "border-[#e0a34a]/30 text-[#9c691f]" : "border-[#167894]/20 text-[#0d617c]"
          }`}
        >
          <span
            className={`size-2 rounded-full ${pendingSchools > 0 ? "bg-[#e0a34a] animate-pulse" : "bg-[#167894]"}`}
            aria-hidden
          />
          {pendingSchools} school{pendingSchools === 1 ? "" : "s"} awaiting approval
        </span>
        <span
          className={`glass-tile inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[#175166] ${
            pendingFranchises > 0 ? "border-[#597ab3]/30 text-[#456797]" : "border-[#167894]/20 text-[#0d617c]"
          }`}
        >
          <span
            className={`size-2 rounded-full ${pendingFranchises > 0 ? "bg-[#597ab3] animate-pulse" : "bg-[#167894]"}`}
            aria-hidden
          />
          {pendingFranchises} franchise{pendingFranchises === 1 ? "" : "s"} pending
        </span>
      </div>
    </GlassCard>
  );
}

/* ========================================================================
   Free Trials & Enquiries Card
   ======================================================================== */

function AdminTrialEnquiryCard({
  activeTrials,
  pendingTrials,
  pendingEnquiries,
}: {
  activeTrials: number;
  pendingTrials: number;
  pendingEnquiries: number;
}) {
  return (
    <GlassCard className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-sm font-bold text-[#0b384a]">Free Trials &amp; Enquiries</h3>
          <p className="mt-1 text-xs text-[#6b858d]">Bookings, leads and pipeline health.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <GlassStatCard
          label="Active trials"
          value={activeTrials}
          icon={CalendarCheck}
          tone="violet"
          hint={`${pendingTrials} awaiting scheduling`}
          trend={toTrend(100, "vs last 30 days")}
        />
        <GlassStatCard
          label="Pending enquiries"
          value={pendingEnquiries}
          icon={Mail}
          tone="sun"
          hint="Waiting for a first reply"
          trend={toTrend(100, "vs last 30 days")}
        />
      </div>
    </GlassCard>
  );
}

/* ========================================================================
   Schools & Franchises Card
   ======================================================================== */

function AdminSchoolFranchiseCard({
  schools,
  activeSchools,
  franchises,
  activeFranchises,
}: {
  schools: number;
  activeSchools: number;
  franchises: number;
  activeFranchises: number;
}) {
  return (
    <GlassCard className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-sm font-bold text-[#0b384a]">Schools &amp; Franchises</h3>
          <p className="mt-1 text-xs text-[#6b858d]">Partner onboarding and active network nodes.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <GlassStatCard
          label="Onboarded schools"
          value={activeSchools}
          icon={School}
          tone="mint"
          hint={`${schools - activeSchools} pending lab setup`}
          trend={toTrend(0, "vs last 30 days")}
        />
        <GlassStatCard
          label="Active franchises"
          value={activeFranchises}
          icon={Store}
          tone="primary"
          hint={`${franchises - activeFranchises} pending onboarding`}
          trend={toTrend(0, "vs last 30 days")}
        />
      </div>
    </GlassCard>
  );
}

/* ========================================================================
   Impact vs Engagement Card
   ======================================================================== */

function AdminImpactEngagementCard({
  students,
  teachers,
  batches,
}: {
  students: number;
  teachers: number;
  batches: number;
}) {
  const meter = (value: number, max = 100) => Math.max(0, Math.min(100, Math.round((value / max) * 100)));

  return (
    <GlassCard className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-sm font-bold text-[#0b384a]">Impact &amp; Engagement</h3>
          <p className="mt-1 text-xs text-[#6b858d]">Student participation and course completion.</p>
        </div>
      </div>

      <div className="space-y-4">
        {[
          { label: "Active learners", value: students, icon: GraduationCap, tone: "mint" },
          { label: "Teaching staff", value: teachers, icon: Video, tone: "primary" },
          { label: "Live batches", value: batches, icon: CalendarCheck, tone: "violet" },
        ].map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#174656]">{item.label}</span>
              <span className="text-xs font-bold tabular-nums text-[#0b384a]">{item.value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#0b384a]/10 ring-1 ring-inset ring-border/50">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  item.tone === "mint" ? "bg-mint" : item.tone === "primary" ? "bg-primary" : "bg-violet"
                }`}
                style={{ width: `${meter(item.value)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

/* ========================================================================
   Orders & Revenue — Weekly/Monthly toggle
   ======================================================================== */

function AdminOrdersRevenueCard({
  range,
  setRange,
  totals,
  change,
  points,
}: {
  range: AdminAnalyticsRange;
  setRange: (v: AdminAnalyticsRange) => void;
  totals: { revenue: number; orders: number };
  change: { revenue: number | null; orders: number | null };
  points: Array<{ label: string; revenue: number; orders: number }>;
}) {
  const maxOrders = Math.max(...points.map((p) => p.orders), 1);

  return (
    <GlassCard className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-sm font-bold text-[#0b384a]">Orders &amp; Revenue</h3>
          <p className="mt-1 text-xs text-[#6b858d]">Store payments and monetization counts.</p>
        </div>
        <div
          className="glass-tile flex items-center gap-1 rounded-full border p-1"
          role="group"
          aria-label="Analytics range"
        >
          {[
            { value: "weekly" as AdminAnalyticsRange, label: "Weekly" },
            { value: "monthly" as AdminAnalyticsRange, label: "Monthly" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setRange(item.value)}
              aria-pressed={range === item.value}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                range === item.value
                  ? "bg-[#0b384a] text-white shadow-soft"
                  : "text-[#3f6672] hover:bg-white/60"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        <div className="glass-tile rounded-2xl border p-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6b858d]">Total revenue</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-[#0b384a] tabular-nums">
              {money(totals.revenue)}
            </p>
          </div>
          <div className="text-right">
            <span className={`text-[10px] font-bold ${
              (change.revenue ?? 0) >= 0 ? "text-[#177767]" : "text-[#b42318]"
            }`}>
              {change.revenue != null ? `${change.revenue > 0 ? "+" : ""}${change.revenue}%` : "—"}
            </span>
            <span className="block text-[10px] text-[#6b858d] mt-0.5">vs previous period</span>
          </div>
        </div>
        <div className="glass-tile rounded-2xl border p-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6b858d]">Total orders</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-[#0b384a] tabular-nums">
              {totals.orders}
            </p>
          </div>
          <div className="text-right">
            <span className={`text-[10px] font-bold ${
              (change.orders ?? 0) >= 0 ? "text-[#177767]" : "text-[#b42318]"
            }`}>
              {change.orders != null ? `${change.orders > 0 ? "+" : ""}${change.orders}%` : "—"}
            </span>
            <span className="block text-[10px] text-[#6b858d] mt-0.5">vs previous period</span>
          </div>
        </div>
      </div>

      <div className="glass-tile rounded-2xl border p-4 h-56 flex flex-col">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6b858d] mb-3">
          Orders per period
        </p>
        <div className="flex items-end gap-1 flex-1">
          {points.map((point) => {
            const pct = Math.max(8, (point.orders / maxOrders) * 100);
            return (
              <div
                key={point.label}
                className="flex h-full w-full flex-col items-center justify-end gap-1.5"
                style={{ flex: "1 1 0%" }}
              >
                <div
                  className="w-full rounded-t-md bg-[#0f7c99] shadow-[0_0_12px_rgba(15,124,153,0.35)] transition-all duration-500"
                  style={{ height: `${pct}%` }}
                />
                <span className="text-[10px] leading-none text-[#6b858d]">{point.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}

/* ========================================================================
   Pro / Upgrade Card
   ======================================================================== */

function AdminProUpgradeCard() {
  return (
    <GlassCard className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-sm font-bold text-[#0b384a]">System Status</h3>
          <p className="mt-1 text-xs text-[#6b858d]">Platform health and management shortcuts.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {["System health", "Sync status", "Backup", "Uptime"].map((label) => (
          <div
            key={label}
            className="glass-tile rounded-2xl border p-3 flex items-center gap-3 hover:bg-white/40 transition-colors"
          >
            <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#167894]/20 bg-[#167894]/10 text-[#0d617c]">
              <TrendingUp className="size-3.5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6b858d]">
                {label}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[#174656]">All systems operational</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 glass-tile rounded-2xl border p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6b858d] mb-2">
          Quick actions
        </p>
        <div className="grid gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl border-[#bdd6dc] bg-white/60 text-[#175166] w-full justify-start text-sm"
          >
            <Link to="/admin/users">
              <Users className="size-3.5 mr-2" aria-hidden /> Invite staff
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl border-[#bdd6dc] bg-white/60 text-[#175166] w-full justify-start text-sm"
          >
            <Link to="/admin/orders">
              <Package className="size-3.5 mr-2" aria-hidden /> Review orders
            </Link>
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}

/* ========================================================================
   Mini Calendar Strip (right rail)
   ======================================================================== */

function AdminMiniCalendar() {
  const now = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const month = now.toLocaleString("en-IN", { month: "long", year: "numeric" });
  const day = now.getDate();
  const weekday = days[now.getDay()];

  return (
    <GlassCard className="p-4 sm:p-5">
      <h3 className="font-display text-sm font-bold text-[#0b384a] mb-3">Mini Calendar</h3>
      <div className="glass-tile rounded-2xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6b858d]">{month}</p>
            <p className="mt-0.5 font-display text-2xl font-extrabold tabular-nums text-[#0b384a]">
              {day}
            </p>
          </div>
          <span className="grid size-8 place-items-center rounded-full border border-[#167894]/20 bg-[#167894]/10 text-[10px] font-bold text-[#0d617c]">
            {weekday}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => (
            <div
              key={d}
              className={`text-[10px] text-center font-semibold ${
                d === weekday ? "text-[#0b384a] bg-[#0b384a]/10 rounded-lg" : "text-[#6b858d]"
              }`}
            >
              {d}
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

/* ========================================================================
   Recent Orders & Enquiries Feed (right rail)
   ======================================================================== */

function AdminRecentOrdersEnquiries({
  orders,
  enquiries,
}: {
  orders: AdminOrderRow[];
  enquiries: AdminEnquiryRow[];
}) {
  return (
    <GlassCard className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-display text-sm font-bold text-[#0b384a]">Recent Orders &amp; Enquiries</h3>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
        {orders.length === 0 && enquiries.length === 0 && (
          <p className="text-center text-xs text-[#6b858d]">No recent CRM activity.</p>
        )}

        {orders.slice(0, 3).map((order) => (
          <div
            key={order.id}
            className="glass-tile rounded-2xl border p-3 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#174656]">
                {order.order_number || "Order"}
              </p>
              <p className="truncate text-xs text-[#6b858d]">
                {order.customer_name || "Customer"} · {dateLabel(order.placed_at ?? order.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums text-[#0b384a]">{money(order.total)}</p>
              <StatusBadge value={order.payment_status ?? "pending"} />
            </div>
          </div>
        ))}
        {enquiries.slice(0, 3).map((enquiry) => (
          <div
            key={enquiry.id}
            className="glass-tile rounded-2xl border p-3 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#174656]">{enquiry.name}</p>
              <p className="truncate text-xs text-[#6b858d]">{enquiry.subject || "Website enquiry"}</p>
            </div>
            <div className="text-right">
              <StatusBadge value={enquiry.status ?? "new"} />
              <p className="mt-1 text-[10px] text-[#8aa1a8]">{dateLabel(enquiry.createdAt, true)}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

/* ========================================================================
   Notifications Feed (right rail)
   ======================================================================== */

function AdminNotificationsFeed({
  notifications,
  onRefresh,
}: {
  notifications: AdminNotificationRow[];
  onRefresh: () => void;
}) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <GlassCard className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-display text-sm font-bold text-[#0b384a]">Notifications</h3>
          <p className="mt-0.5 text-xs text-[#6b858d]">System alerts and platform activity.</p>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={onRefresh}
          className="text-[10px] font-bold text-[#0d617c] hover:underline"
          aria-label="Refresh notifications"
        >
          <RefreshCw className="size-3 inline" aria-hidden /> Refresh
        </button>
        {unreadCount > 0 && (
          <span className="rounded-full bg-[#e07a5f]/20 px-2 py-0.5 text-[10px] font-bold text-[#b42318]">
            {unreadCount} unread
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2 max-h-[210px] overflow-y-auto pr-1">
        {notifications.length === 0 ? (
          <p className="text-center text-xs text-[#6b858d]">You're all caught up.</p>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="glass-tile rounded-2xl border p-3 text-left transition hover:border-[#167894]/40 hover:bg-white/60"
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-1 size-2 shrink-0 rounded-full ${
                    notification.read ? "bg-[#0b384a]/15" : "bg-[#127491]"
                  }`}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#174656] truncate">{notification.title}</p>
                  {notification.message && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-[#6b858d]">{notification.message}</p>
                  )}
                  <p className="mt-1 text-[10px] text-[#8aa1a8]">{dateLabel(notification.createdAt, true)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
}

/* ========================================================================
   Loading state
   ======================================================================== */

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="glass-panel h-[200px] animate-pulse rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="glass-panel h-[150px] animate-pulse rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="glass-panel h-[240px] animate-pulse rounded-3xl" />
        <div className="glass-panel h-[420px] animate-pulse rounded-3xl" />
      </div>
    </div>
  );
}

/* ========================================================================
   Main route component — 8-col left workspace, 4-col right activity rail
   ======================================================================== */

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      ...pageMeta("Admin Dashboard", "AIKIDZ platform overview."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const overview = useQuery(adminOverviewQuery());
  const [range, setRange] = useState<AdminAnalyticsRange>("weekly");
  const analytics = useQuery({
    ...adminAnalyticsQuery(range),
    placeholderData: (previous: AdminAnalytics | undefined) => previous,
  });

  const data = overview.data;
  const kpis = data?.kpis;
  const analyticsData = analytics.data;

  const chartPoints =
    analyticsData?.points.map((p) => ({
      label: p.label,
      revenue: Number(String(p.revenue).replace(/[^0-9.]/g, "")),
      orders: p.orders,
    })) ?? [];

  const pendingFranchises = kpis ? kpis.franchises - kpis.activeFranchises : 0;

  return (
    <DashboardShell
      role="admin"
      title="Admin Dashboard"
      subtitle="AIKIDZ platform overview"
      headerVariant="plain"
      searchPlaceholder="Search people, clients, settings, requests..."
    >
      {overview.isPending || analytics.isPending ? (
        <AdminDashboardSkeleton />
      ) : overview.isError || analytics.isError || !kpis || !analyticsData ? (
        <Panel
          title="Unable to load dashboard"
          description="Check your API connection and refresh the page."
          action={
            <Button
              variant="outline"
              size="sm"
              disabled={overview.isFetching || analytics.isFetching}
              onClick={() => {
                void overview.refetch();
                void analytics.refetch();
              }}
            >
              <RefreshCw className="size-3.5" aria-hidden /> Retry
            </Button>
          }
        >
          {overview.isError && <p className="text-sm text-destructive">{String(overview.error)}</p>}
          {analytics.isError && <p className="text-sm text-destructive">{String(analytics.error)}</p>}
        </Panel>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[8fr_4fr]">
          {/* ===== Left Main Workspace (8 columns) ===== */}
          <div className="min-w-0 space-y-6">
            {/* Hero banner */}
            <AdminHeroBanner
              pendingSchools={kpis.pendingSchools}
              pendingFranchises={pendingFranchises}
            />

            {/* Middle row: 3 stat cards stacked */}
            <div className="grid gap-4">
              <AdminTrialEnquiryCard
                activeTrials={kpis.activeTrials}
                pendingTrials={kpis.pendingTrials}
                pendingEnquiries={kpis.pendingEnquiries}
              />
              <AdminSchoolFranchiseCard
                schools={kpis.schools}
                activeSchools={kpis.activeSchools}
                franchises={kpis.franchises}
                activeFranchises={kpis.activeFranchises}
              />
              <AdminImpactEngagementCard
                students={kpis.students}
                teachers={kpis.teachers}
                batches={kpis.batches}
              />
            </div>

            {/* Bottom row: Orders & Revenue | Pro/Upgrade */}
            <div className="grid gap-4 lg:grid-cols-2">
              <AdminOrdersRevenueCard
                range={range}
                setRange={setRange}
                totals={{
                  revenue: Number(String(analyticsData.totals.revenue).replace(/[^0-9.]/g, "")),
                  orders: analyticsData.totals.orders,
                }}
                change={analyticsData.change}
                points={chartPoints}
              />
              <AdminProUpgradeCard />
            </div>
          </div>

          {/* ===== Right Activity Rail (4 columns) ===== */}
          <div className="min-w-0 space-y-6">
            <AdminMiniCalendar />
            <AdminRecentOrdersEnquiries
              orders={data.recentOrders}
              enquiries={data.recentEnquiries}
            />
            <AdminNotificationsFeed
              notifications={data.notifications}
              onRefresh={() => void overview.refetch()}
            />
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
