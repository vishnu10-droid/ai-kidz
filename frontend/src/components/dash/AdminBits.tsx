import { Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { humanize } from "@/lib/admin-constants";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  new: "bg-premium-sky/10 text-premium-sky-deep",
  pending: "bg-premium-gold/15 text-premium-gold-deep",
  contacted: "bg-premium-sky/10 text-premium-sky-deep",
  follow_up: "bg-premium-sky/10 text-premium-sky-deep",
  scheduled: "bg-premium-sky/10 text-premium-sky-deep",
  placed: "bg-premium-sky/10 text-premium-sky-deep",
  confirmed: "bg-premium-sky/10 text-premium-sky-deep",
  packed: "bg-premium-sky/10 text-premium-sky-deep",
  shipped: "bg-premium-sky/10 text-premium-sky-deep",
  planned: "bg-premium-sky/10 text-premium-sky-deep",
  installing: "bg-premium-gold/15 text-premium-gold-deep",
  live: "bg-premium-emerald/15 text-premium-emerald-deep",
  present: "bg-premium-emerald/15 text-premium-emerald-deep",
  graded: "bg-premium-emerald/15 text-premium-emerald-deep",
  submitted: "bg-premium-sky/10 text-premium-sky-deep",
  late: "bg-premium-gold/15 text-premium-gold-deep",
  absent: "bg-premium-rose/10 text-premium-rose-deep",
  overdue: "bg-premium-rose/10 text-premium-rose-deep",
  attended: "bg-premium-emerald/15 text-premium-emerald-deep",
  converted: "bg-premium-emerald/15 text-premium-emerald-deep",
  approved: "bg-premium-emerald/15 text-premium-emerald-deep",
  active: "bg-premium-emerald/15 text-premium-emerald-deep",
  delivered: "bg-premium-emerald/15 text-premium-emerald-deep",
  paid: "bg-premium-emerald/15 text-premium-emerald-deep",
  cancelled: "bg-premium-rose/10 text-premium-rose-deep",
  rejected: "bg-premium-rose/10 text-premium-rose-deep",
  suspended: "bg-premium-rose/10 text-premium-rose-deep",
  failed: "bg-premium-rose/10 text-premium-rose-deep",
};

export function StatusBadge({ value, className, labels }: { value: string; className?: string; labels?: Record<string, string> }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", TONES[value] ?? "bg-muted text-muted-foreground", className)}>{humanize(value, labels)}</span>;
}

/** Search box plus status filter chips with counts. */
export function FilterBar({ search, onSearch, statuses, status, onStatus, counts, placeholder = "Search…", extra, labels }: {
  search: string;
  onSearch: (v: string) => void;
  statuses: readonly string[];
  status: string;
  onStatus: (v: string) => void;
  counts: Record<string, number>;
  placeholder?: string;
  extra?: ReactNode;
  labels?: Record<string, string>;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
        {["all", ...statuses].map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => onStatus(s)}
            className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition", status === s ? "border-transparent bg-gradient-premium text-white shadow-[0_8px_18px_-10px_rgba(14,165,233,0.8)]" : "bg-card hover:border-premium-sky/50")}
          >
            {s === "all" ? "All" : humanize(s, labels)} <span className="opacity-70">{s === "all" ? total : (counts[s] ?? 0)}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {extra}
        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} aria-label="Search" className="pl-9" />
        </div>
      </div>
    </div>
  );
}

export function countBy<T>(rows: T[], key: (r: T) => string) {
  const out: Record<string, number> = {};
  for (const r of rows) out[key(r)] = (out[key(r)] ?? 0) + 1;
  return out;
}

/** Notes box that saves when it loses focus (only if the text changed). */
export function NotesEditor({ value, onSave, label = "Notes", placeholder = "Add a note…" }: { value: string | null; onSave: (v: string | null) => Promise<void>; label?: string; placeholder?: string }) {
  const [text, setText] = useState(value ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <Textarea
      aria-label={label}
      value={text}
      placeholder={placeholder}
      disabled={busy}
      rows={2}
      maxLength={2000}
      onChange={(e) => setText(e.target.value)}
      onBlur={async () => {
        const next = text.trim() || null;
        if (next === (value ?? null)) return;
        setBusy(true);
        try {
          await onSave(next);
        } finally {
          setBusy(false);
        }
      }}
      className="min-h-[60px] text-sm"
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-words text-sm">{children}</div>
    </div>
  );
}
