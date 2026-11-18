import {
  Activity,
  Briefcase,
  CircleDollarSign,
  Clock3,
  LifeBuoy,
  TrendingUp,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

export type CommissionPoint = { label: string; value: number };

export type OfficeSplit = {
  label: string;
  percent: number;
  amount: string;
  color: string;
};

export type AdminKpiTrendTone = "positive" | "negative" | "neutral";

export type AdminKpiTrend = { label: string; tone: AdminKpiTrendTone };

export type AdminKpi = {
  id: string;
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  trend?: AdminKpiTrend;
};

export type AdminCommissionSeries = {
  sixMonth: CommissionPoint[];
  year: CommissionPoint[];
};

export type AdminOverviewData = {
  kpis: AdminKpi[];
  commission: AdminCommissionSeries;
  office: { total: string; caption: string; splits: OfficeSplit[] };
};

/** Regional commission split used by the office donut. */
export const DEFAULT_OFFICE_SPLITS: OfficeSplit[] = [
  { label: "North office", percent: 46, amount: "$108.8K", color: "#2f86b0" },
  { label: "Central office", percent: 31, amount: "$73.4K", color: "#e7b45c" },
  { label: "Coastal office", percent: 23, amount: "$54.5K", color: "#4fae9b" },
];

/**
 * Reference snapshot for the `/admin/dashboard` Overview: the agency's headline
 * commission story, the office split and the eight KPI tiles. Live platform
 * activity is appended by the route itself.
 */
export const ADMIN_OVERVIEW: AdminOverviewData = {
  kpis: [
    {
      id: "active-people",
      label: "Active people",
      value: "11",
      icon: Users,
      trend: { label: "8.2%", tone: "positive" },
      hint: "vs. last month",
    },
    {
      id: "waiting-review",
      label: "Waiting for review",
      value: "6",
      icon: Clock3,
      trend: { label: "2", tone: "positive" },
      hint: "cleared this week",
    },
    {
      id: "open-deals",
      label: "Open deals",
      value: "49",
      icon: Briefcase,
      trend: { label: "12.4%", tone: "positive" },
      hint: "vs. last month",
    },
    {
      id: "agency-commission",
      label: "Agency commission",
      value: "$42,488",
      icon: CircleDollarSign,
      trend: { label: "6.1%", tone: "positive" },
      hint: "vs. last month",
    },
    {
      id: "new-leads",
      label: "New leads",
      value: "108",
      icon: UserPlus,
      trend: { label: "18.2%", tone: "positive" },
      hint: "this week",
    },
    {
      id: "lead-conversion",
      label: "Lead conversion",
      value: "2.8%",
      icon: TrendingUp,
      trend: { label: "0.4 pts", tone: "positive" },
      hint: "vs. last month",
    },
    {
      id: "support-requests",
      label: "Open support requests",
      value: "4",
      icon: LifeBuoy,
      trend: { label: "1", tone: "positive" },
      hint: "fewer than yesterday",
    },
    {
      id: "system-uptime",
      label: "System uptime",
      value: "99.61%",
      icon: Activity,
      trend: { label: "Stable", tone: "neutral" },
      hint: "last 30 days",
    },
  ],
  commission: {
    sixMonth: [
      { label: "Jun", value: 26400 },
      { label: "Jul", value: 33100 },
      { label: "Aug", value: 41800 },
      { label: "Sep", value: 38200 },
      { label: "Oct", value: 47600 },
      { label: "Nov", value: 49600 },
    ],
    year: [
      { label: "Dec", value: 18200 },
      { label: "Jan", value: 21400 },
      { label: "Feb", value: 24800 },
      { label: "Mar", value: 29600 },
      { label: "Apr", value: 32100 },
      { label: "May", value: 35400 },
      { label: "Jun", value: 26400 },
      { label: "Jul", value: 33100 },
      { label: "Aug", value: 41800 },
      { label: "Sep", value: 38200 },
      { label: "Oct", value: 47600 },
      { label: "Nov", value: 49600 },
    ],
  },
  office: {
    total: "$236.7K",
    caption: "Total commission",
    splits: DEFAULT_OFFICE_SPLITS,
  },
};
