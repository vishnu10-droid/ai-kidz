// Status vocabularies used by the admin screens. Keep values lowercase: they are stored as-is.
export const TRIAL_STATUSES = ["new", "scheduled", "attended", "converted", "cancelled"] as const;
export const ENQUIRY_STATUSES = ["new", "contacted", "follow_up", "converted", "closed"] as const;
export const APPLICATION_STATUSES = ["new", "contacted", "approved", "rejected"] as const;
export const ORG_STATUSES = ["pending", "active", "suspended"] as const;
export const SCHOOL_PACKAGES = ["starter", "standard", "premium"] as const;
export const ORDER_STATUSES = ["pending", "placed", "confirmed", "packed", "shipped", "delivered", "cancelled"] as const;
export const LAB_STATUSES = ["not_started", "planned", "installing", "live"] as const;
/** Display names that differ from the stored value (trials: "new" reads as Pending, "attended" as Completed). */
export const TRIAL_LABELS: Record<string, string> = { new: "Pending", attended: "Completed" };
export const LAB_LABELS: Record<string, string> = { not_started: "Lab not started", planned: "Lab planned", installing: "Lab installing", live: "Lab live" };
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;

export function humanize(value: string, labels?: Record<string, string>) {
  if (labels?.[value]) return labels[value];
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
}

/** Case-insensitive match of a search term against any of the given fields. */
export function matchesSearch(term: string, ...fields: (string | number | null | undefined)[]) {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f != null && String(f).toLowerCase().includes(q));
}
