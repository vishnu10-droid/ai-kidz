import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Accent tones for the premium dashboard palette.
 * primary → sky, violet → rose, sun → gold, mint → emerald. The names are kept
 * stable because they are used across every role dashboard.
 */
export type GlassTone = "primary" | "violet" | "sun" | "mint";

export const TONE_CHIP: Record<GlassTone, string> = {
  primary: "border-premium-sky/20 bg-premium-sky/10 text-premium-sky-deep",
  violet: "border-premium-rose/20 bg-premium-rose/10 text-premium-rose-deep",
  sun: "border-premium-gold/25 bg-premium-gold/15 text-premium-gold-deep",
  mint: "border-premium-emerald/20 bg-premium-emerald/12 text-premium-emerald-deep",
};

export const TONE_BAR: Record<GlassTone, string> = {
  primary: "bg-premium-sky",
  violet: "bg-premium-rose",
  sun: "bg-premium-gold",
  mint: "bg-premium-emerald",
};

export function GlassCard({
  children,
  className,
  interactive = false,
  highlight = true,
}: {
  children: ReactNode;
  className?: string | undefined;
  interactive?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass-panel relative overflow-hidden rounded-3xl",
        highlight && "glass-highlight",
        interactive && "glass-hover",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type Trend = {
  /** Percentage change. `null` renders a neutral placeholder. */
  value: number | null;
  caption?: string | undefined;
};

export function TrendBadge({ trend, className }: { trend: Trend; className?: string }) {
  const { value, caption } = trend;
  const direction = value === null ? "flat" : value > 0 ? "up" : value < 0 ? "down" : "flat";
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const text = value === null ? "—" : `${value > 0 ? "+" : ""}${value}%`;

  return (
    <span className={cn("inline-flex items-center gap-2 text-xs", className)}>
      <span
        aria-label={value === null ? "No comparison data" : `${text} change`}
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold tabular-nums",
          direction === "up" && "bg-premium-emerald/15 text-premium-emerald-deep",
          direction === "down" && "bg-premium-rose/15 text-premium-rose-deep",
          direction === "flat" && "bg-muted/70 text-muted-foreground",
        )}
      >
        <Icon className="size-3.5" aria-hidden /> {text}
      </span>
      {caption ? <span className="text-muted-foreground">{caption}</span> : null}
    </span>
  );
}

export function GlassStatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  hint,
  trend,
  className,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: GlassTone;
  hint?: string | undefined;
  trend?: Trend | undefined;
  className?: string;
}) {
  return (
    <GlassCard interactive className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-3 truncate font-display text-3xl font-extrabold tracking-tight">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-2xl border shadow-soft",
            TONE_CHIP[tone],
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
      {(trend || hint) && (
        <div className="mt-4 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1">
          {trend ? <TrendBadge trend={trend} /> : null}
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      )}
    </GlassCard>
  );
}

export function GlassPanel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string | undefined;
  bodyClassName?: string | undefined;
}) {
  return (
    <GlassCard className={cn("p-5 sm:p-6", className)}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold leading-tight sm:text-lg">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </GlassCard>
  );
}

export function GlassEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-border/70 bg-card/30 p-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function GlassProgressBar({ value, tone = "primary" }: { value: number; tone?: GlassTone }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-muted/70 ring-1 ring-inset ring-border/50"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-700", TONE_BAR[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
