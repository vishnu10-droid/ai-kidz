import { useId, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type Point = { label: string; value: number };

/** Accessible CSS/SVG chart used by the V2 overview without introducing a second chart theme. */
export function CommissionBarChart({ data }: { data: Point[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...data.map((point) => point.value), 1);

  return (
    <div
      className="mt-6 flex h-52 items-end gap-2 sm:gap-3"
      role="img"
      aria-label="Commission over time"
    >
      {data.map((point, index) => {
        const height = Math.max(9, (point.value / max) * 100);
        const selected = active === index;
        return (
          <button
            key={`${point.label}-${index}`}
            type="button"
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
            onBlur={() => setActive(null)}
            className="group relative flex h-full min-w-0 flex-1 flex-col justify-end focus:outline-none"
            aria-label={`${point.label}: ${point.value.toLocaleString()}`}
          >
            {selected ? (
              <span className="absolute bottom-[calc(var(--bar-height)+0.6rem)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#083d51] px-2 py-1 text-[10px] font-bold text-white shadow-lg">
                ${(point.value / 1000).toFixed(1)}K
              </span>
            ) : null}
            <span
              className={cn(
                "w-full rounded-t-lg bg-gradient-to-t from-[#08607b] to-[#5ec7da] transition-all duration-300",
                selected && "from-[#064b62] to-[#96e4ed] shadow-[0_0_18px_rgba(33,157,182,0.5)]",
              )}
              style={{ height: `${height}%`, "--bar-height": `${height}%` } as CSSProperties}
            />
            <span className="mt-2 truncate text-center text-[10px] font-medium text-[#477080]">
              {point.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const OFFICE_SPLITS = [
  { label: "North office", value: 46, color: "#0e7691" },
  { label: "Central office", value: 31, color: "#5ab8c9" },
  { label: "Coastal office", value: 23, color: "#a7d9df" },
];

export function OfficeDonut() {
  const gradientId = useId();
  let offset = 0;
  return (
    <div className="grid items-center gap-5 sm:grid-cols-[150px_1fr]">
      <div className="relative mx-auto size-36">
        <svg
          viewBox="0 0 42 42"
          className="size-full -rotate-90"
          role="img"
          aria-label="Commission by office"
        >
          <circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="#e8f2f4" strokeWidth="5" />
          <defs>
            <linearGradient id={gradientId}>
              <stop stopColor="#0c6f8a" />
              <stop offset="1" stopColor="#67cfdb" />
            </linearGradient>
          </defs>
          {OFFICE_SPLITS.map((office, index) => {
            const dash = `${office.value} ${100 - office.value}`;
            const dashOffset = -offset;
            offset += office.value;
            return (
              <circle
                key={office.label}
                cx="21"
                cy="21"
                r="15.9155"
                fill="transparent"
                stroke={index === 0 ? `url(#${gradientId})` : office.color}
                strokeWidth="5"
                strokeDasharray={dash}
                strokeDashoffset={dashOffset}
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <span className="block text-lg font-extrabold tracking-tight text-[#0b4054]">
            $236.7K
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#668691]">
            Total
          </span>
        </div>
      </div>
      <ul className="space-y-3">
        {OFFICE_SPLITS.map((office) => (
          <li key={office.label} className="flex items-center gap-2 text-xs text-[#537580]">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: office.color }} />
            <span className="flex-1 font-medium">{office.label}</span>
            <span className="font-bold text-[#174c5e]">{office.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
