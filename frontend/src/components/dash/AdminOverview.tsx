import { Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Plus,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ADMIN_OVERVIEW,
  type AdminCommissionSeries,
  type AdminKpi,
  type AdminKpiTrend,
  type AdminKpiTrendTone,
  type AdminOverviewData,
} from "@/lib/admin-overview";
import { cn } from "@/lib/utils";
import { CommissionBarChart, OfficeDonut } from "./AdminV2Charts";

const TREND_TONE: Record<AdminKpiTrendTone, string> = {
  positive: "bg-[#2d9a87]/12 text-[#177767]",
  negative: "bg-[#c9564a]/12 text-[#b13f34]",
  neutral: "bg-[#0b384a]/8 text-[#5b7c88]",
};

const TREND_ICON: Record<AdminKpiTrendTone, LucideIcon> = {
  positive: ArrowUpRight,
  negative: ArrowDownRight,
  neutral: Minus,
};

const compactMoney = (value: number) =>
  value >= 1000 ? `$${(value / 1000).toFixed(1)}K` : `$${Math.round(value)}`;

function TrendPill({ trend }: { trend: AdminKpiTrend }) {
  const Icon = TREND_ICON[trend.tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
        TREND_TONE[trend.tone],
      )}
    >
      <Icon className="size-3" aria-hidden />
      {trend.label}
    </span>
  );
}

function KpiCard({ kpi }: { kpi: AdminKpi }) {
  const Icon = kpi.icon;
  return (
    <div className="glass-panel glass-highlight group rounded-2xl border p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-24px_rgba(9,76,102,0.45)]">
      <div className="flex items-start justify-between gap-3">
        <p className="pt-0.5 text-xs font-semibold leading-snug text-[#5b7c88]">{kpi.label}</p>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#127491]/10 text-[#0e6a85] ring-1 ring-inset ring-[#127491]/15 transition group-hover:bg-[#127491]/15">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 font-display text-[26px] font-extrabold leading-none tracking-tight text-[#0b3d50] tabular-nums">
        {kpi.value}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#7b95a0]">
        {kpi.trend && <TrendPill trend={kpi.trend} />}
        {kpi.hint && <span className="truncate">{kpi.hint}</span>}
      </div>
    </div>
  );
}

function CommissionCard({ data }: { data: AdminCommissionSeries }) {
  const [range, setRange] = useState<"6M" | "1Y">("6M");
  const series = range === "6M" ? data.sixMonth : data.year;
  const total = series.reduce((sum, point) => sum + point.value, 0);

  return (
    <section className="glass-panel glass-highlight flex h-full flex-col rounded-3xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-[#0b3d50]">Agency commission</h2>
          <p className="mt-0.5 text-xs text-[#6b8790]">
            {range === "6M"
              ? "Commission earned in the last 6 months"
              : "Commission earned this year"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-white/70 p-0.5 ring-1 ring-inset ring-[#0b384a]/10">
            {(["6M", "1Y"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRange(option)}
                aria-pressed={range === option}
                className={cn(
                  "rounded-[10px] px-2.5 py-1 text-[11px] font-bold transition",
                  range === option
                    ? "bg-[#0c6f8a] text-white shadow-sm"
                    : "text-[#5b7c88] hover:text-[#0b3d50]",
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <Button
            asChild
            size="sm"
            className="h-9 rounded-xl bg-[#0c6f8a] px-3.5 text-xs font-bold text-white shadow-[0_12px_24px_-14px_rgba(9,76,102,0.95)] hover:bg-[#0a5d75]"
          >
            <Link to="/admin/orders">
              <Plus className="size-3.5" aria-hidden /> Record a deal
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
        <span className="font-display text-[30px] font-extrabold leading-none tracking-tight text-[#0b3d50] tabular-nums">
          {compactMoney(total)}
        </span>
        <span className="mb-0.5 inline-flex items-center gap-1 rounded-full bg-[#2d9a87]/12 px-2 py-0.5 text-[11px] font-bold text-[#177767]">
          <TrendingUp className="size-3" aria-hidden /> 12.5%
        </span>
        <span className="mb-0.5 text-[11px] text-[#7b95a0]">vs. previous period</span>
      </div>

      <CommissionBarChart data={series} className="mt-3 flex-1" />
    </section>
  );
}

function OfficeCard({ data }: { data: AdminOverviewData["office"] }) {
  return (
    <section className="glass-panel glass-highlight flex h-full flex-col rounded-3xl border p-5">
      <div className="min-w-0">
        <h2 className="text-base font-bold tracking-tight text-[#0b3d50]">Commission by office</h2>
        <p className="mt-0.5 text-xs text-[#6b8790]">Distribution of total commissions</p>
      </div>

      <div className="mt-5 flex-1">
        <OfficeDonut total={data.total} caption={data.caption} splits={data.splits} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#0b384a]/10 pt-3.5 text-[11px] text-[#5e7e88]">
        <span>
          Up <strong className="font-bold text-[#177767]">12.5%</strong> vs. previous period
        </span>
        <span className="rounded-full bg-[#0b384a]/8 px-2 py-0.5 font-semibold text-[#4b7280]">
          {data.splits.length} offices
        </span>
      </div>
    </section>
  );
}

/** Overview body for the admin dashboard: analytics row, then the 2×4 KPI grid. */
export function AdminOverview({
  data = ADMIN_OVERVIEW,
  className,
}: {
  data?: AdminOverviewData;
  className?: string;
}) {
  return (
    <div className={cn("space-y-5", className)}>
      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <CommissionCard data={data.commission} />
        <OfficeCard data={data.office} />
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>
    </div>
  );
}
