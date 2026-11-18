import { useId, useState, type ReactNode } from "react";
import {
  DEFAULT_OFFICE_SPLITS,
  type CommissionPoint,
  type OfficeSplit,
} from "@/lib/admin-overview";
import { cn } from "@/lib/utils";

export type { CommissionPoint, OfficeSplit };

const compact = (value: number) =>
  value >= 1000 ? `$${(value / 1000).toFixed(1)}K` : `$${Math.round(value)}`;

const axisLabel = (value: number) =>
  value >= 1000 ? `$${Math.round(value / 1000)}K` : `$${Math.round(value)}`;

/**
 * Frosted-glass vertical bar chart with dashed grid lines and hover tooltips.
 * Values are raw currency units; labels are compacted to `$2.6K` style.
 */
export function CommissionBarChart({
  data,
  className,
  children,
}: {
  data: CommissionPoint[];
  className?: string | undefined;
  children?: ReactNode;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...data.map((point) => point.value), 1);
  const step = max > 4000 ? 1000 : 500;
  const ceiling = Math.ceil(max / step) * step || step;
  const ticks = [1, 0.66, 0.33, 0];

  return (
    <div className={cn("relative mt-6", className)}>
      <div className="relative h-56 pl-9" role="img" aria-label="Commission over time">
        {ticks.map((ratio) => (
          <div
            key={ratio}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 flex translate-y-1/2 items-center gap-2"
            style={{ bottom: `${ratio * 100}%` }}
          >
            <span className="w-8 shrink-0 text-right text-[10px] font-medium tabular-nums text-[#4b7280]">
              {axisLabel(ceiling * ratio)}
            </span>
            <span className="h-px flex-1 border-t border-dashed border-[#0b384a]/12" />
          </div>
        ))}

        <div className="absolute inset-y-0 left-9 right-0 flex items-end gap-2 sm:gap-4">
          {data.map((point, index) => {
            const height = Math.max(4, (point.value / ceiling) * 100);
            const selected = active === index;
            return (
              <button
                key={`${point.label}-${index}`}
                type="button"
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onBlur={() => setActive(null)}
                className="group relative flex h-full min-w-0 flex-1 items-end justify-center focus:outline-none"
                aria-label={`${point.label}: ${compact(point.value)}`}
              >
                {selected ? (
                  <span
                    className="absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#083d51] px-2 py-1 text-[10px] font-bold text-white shadow-lg"
                    style={{ bottom: `calc(${height}% + 0.375rem)` }}
                  >
                    {compact(point.value)}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "w-full rounded-t-md bg-gradient-to-t from-[#2b8ba4] via-[#63c3d4] to-[#a5e4ec] transition-all duration-300",
                    selected
                      ? "from-[#0d617c] to-[#c4f0f5] shadow-[0_0_20px_rgba(80,190,210,0.55)]"
                      : "group-hover:brightness-105",
                  )}
                  style={{ height: `${height}%` }}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex gap-2 pl-9 sm:gap-4">
        {data.map((point, index) => (
          <span
            key={`${point.label}-${index}`}
            className="min-w-0 flex-1 truncate text-center text-[10px] font-semibold text-[#456d7a]"
          >
            {point.label}
          </span>
        ))}
      </div>

      {children}
    </div>
  );
}

/** Conic donut built from SVG dashes, with a centred total and a value legend. */
export function OfficeDonut({
  total = "$236.7K",
  caption = "Total commission",
  splits = DEFAULT_OFFICE_SPLITS,
}: {
  total?: string;
  caption?: string;
  splits?: OfficeSplit[];
}) {
  const gradientId = useId();
  let offset = 0;

  return (
    <div className="grid items-center gap-5 sm:grid-cols-[148px_1fr]">
      <div className="relative mx-auto size-36">
        <svg
          viewBox="0 0 42 42"
          className="size-full -rotate-90 drop-shadow-[0_10px_18px_rgba(9,76,102,0.18)]"
          role="img"
          aria-label="Commission by office"
        >
          <circle
            cx="21"
            cy="21"
            r="15.9155"
            fill="transparent"
            stroke="#e8f2f4"
            strokeWidth="5.5"
          />
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#0c6f8a" />
              <stop offset="1" stopColor="#67cfdb" />
            </linearGradient>
          </defs>
          {splits.map((office, index) => {
            const gap = 1.4;
            const dash = `${Math.max(0, office.percent - gap)} ${100 - Math.max(0, office.percent - gap)}`;
            const dashOffset = -offset;
            offset += office.percent;
            return (
              <circle
                key={office.label}
                cx="21"
                cy="21"
                r="15.9155"
                fill="transparent"
                stroke={index === 0 ? `url(#${gradientId})` : office.color}
                strokeWidth="5.5"
                strokeDasharray={dash}
                strokeDashoffset={dashOffset}
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
          <span className="font-display text-lg font-extrabold leading-none tracking-tight text-[#0b4054] tabular-nums">
            {total}
          </span>
          <span className="mt-1 max-w-[76px] text-[8px] font-bold uppercase leading-[1.2] tracking-[0.1em] text-[#668691]">
            {caption}
          </span>
        </div>
      </div>

      <ul className="space-y-3">
        {splits.map((office) => (
          <li key={office.label} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full ring-2 ring-white/70"
              style={{ backgroundColor: office.color }}
            />
            <span className="flex-1 whitespace-nowrap font-medium text-[#4b7280]">
              {office.label}
            </span>
            <span className="font-bold tabular-nums text-[#174c5e]">{office.amount}</span>
            <span className="w-8 text-right text-[10px] font-semibold tabular-nums text-[#6b8991]">
              {office.percent}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
