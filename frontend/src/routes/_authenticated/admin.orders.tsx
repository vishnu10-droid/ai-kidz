import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronDown, IndianRupee, Package, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { countBy, Field, FilterBar, StatusBadge } from "@/components/dash/AdminBits";
import { DashboardShell, Empty, StatCard } from "@/components/dash/DashboardShell";
import { StatusPicker } from "@/components/dash/StatusPicker";
import { formatDate, matchesSearch, ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/admin-constants";
import { adminOrdersQuery } from "@/lib/admin.queries";
import { formatINR } from "@/lib/pricing";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({ meta: [...pageMeta("Kit Orders", "Track and fulfil AIKIDZ kit orders."), { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(adminOrdersQuery()),
  component: AdminOrders,
});

function AdminOrders() {
  const qc = useQueryClient();
  const { data: rows } = useSuspenseQuery(adminOrdersQuery());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState<string | null>(null);

  const counts = useMemo(() => countBy(rows, (r) => r.status), [rows]);
  const toFulfil = rows.filter((r) => r.status === "placed" || r.status === "confirmed" || r.status === "packed").length;
  const collected = rows.filter((r) => r.payment_status === "paid").reduce((n, r) => n + Number(r.total), 0);
  const shown = rows.filter((r) => (status === "all" || r.status === status) && matchesSearch(search, r.order_number, r.customer_name, r.customer_email, r.customer_phone, r.city, r.pincode));

  async function save(id: string, patch: { status?: string; payment_status?: string }) {
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) return void toast.error("We couldn't update that order.");
    toast.success("Order updated · the customer has been notified");
    await qc.invalidateQueries({ queryKey: ["admin-orders"] });
    void qc.invalidateQueries({ queryKey: ["admin-home"] });
  }

  return (
    <DashboardShell role="admin" title="Kit orders" subtitle="Pending → Packed → Shipped → Delivered. Customers get a notification on every change.">
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="To fulfil" value={toFulfil} icon={Package} tone="sun" hint="Placed, confirmed or packed, not yet shipped" />
        <StatCard label="In transit" value={counts["shipped"] ?? 0} icon={Truck} />
        <StatCard label="Paid order value" value={formatINR(collected)} icon={IndianRupee} tone="mint" />
      </div>
      <FilterBar search={search} onSearch={setSearch} statuses={ORDER_STATUSES} status={status} onStatus={setStatus} counts={counts} placeholder="Search order no., customer, PIN…" />
      {shown.length === 0 ? <Empty>{rows.length ? "No orders match this filter." : "No orders yet."}</Empty> : (
        <ul className="space-y-3">
          {shown.map((o) => {
            const expanded = open === o.id;
            const items = o.order_items ?? [];
            return (
              <li key={o.id} className="rounded-3xl border bg-card shadow-soft">
                <div className="flex flex-wrap items-center gap-3 p-5">
                  <button type="button" onClick={() => setOpen(expanded ? null : o.id)} aria-expanded={expanded} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <ChevronDown className={cn("size-4 shrink-0 transition", expanded && "rotate-180")} />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-bold">{o.order_number}</span><StatusBadge value={o.status} /><StatusBadge value={o.payment_status} /></span>
                      <span className="block truncate text-sm text-muted-foreground">{o.customer_name ?? "—"} · {items.reduce((n, i) => n + i.quantity, 0)} item(s) · {formatDate(o.created_at, true)}</span>
                    </span>
                  </button>
                  <span className="font-display text-lg font-extrabold">{formatINR(o.total)}</span>
                  <div className="flex flex-wrap gap-2">
                    <StatusPicker label={`Order status for ${o.order_number}`} value={o.status} options={ORDER_STATUSES} onSave={(v) => save(o.id, { status: v })} />
                    <StatusPicker label={`Payment status for ${o.order_number}`} value={o.payment_status} options={PAYMENT_STATUSES} onSave={(v) => save(o.id, { payment_status: v })} />
                  </div>
                </div>
                {expanded && (
                  <div className="grid gap-6 border-t p-5 lg:grid-cols-[1.4fr_1fr]">
                    <ul className="divide-y">
                      {items.map((i) => (
                        <li key={i.id} className="flex items-center gap-3 py-2 text-sm">
                          {i.image_url ? <img src={i.image_url} alt="" className="size-12 rounded-xl object-cover" loading="lazy" /> : <span className="size-12 rounded-xl bg-muted" />}
                          <span className="min-w-0 flex-1 truncate">{i.product_name}</span>
                          <span className="text-muted-foreground">× {i.quantity}</span>
                          <span className="w-20 text-right font-semibold">{formatINR(Number(i.price) * i.quantity)}</span>
                        </li>
                      ))}
                      <li className="flex justify-between py-2 text-sm text-muted-foreground"><span>Subtotal</span><span>{formatINR(o.subtotal)}</span></li>
                      <li className="flex justify-between py-2 text-sm text-muted-foreground"><span>Shipping</span><span>{Number(o.shipping) ? formatINR(o.shipping) : "Free"}</span></li>
                    </ul>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                      <Field label="Ship to">{o.customer_name}<span className="block text-muted-foreground">{[o.address_line, o.city, o.state, o.pincode].filter(Boolean).join(", ")}</span></Field>
                      <Field label="Contact">{o.customer_phone ?? "—"}<span className="block text-muted-foreground">{o.customer_email}</span></Field>
                      <Field label="Payment">{o.payment_method === "cod" ? "Cash on delivery" : "Online (Razorpay)"}{o.razorpay_order_id && <span className="block font-mono text-xs text-muted-foreground">{o.razorpay_order_id}</span>}</Field>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </DashboardShell>
  );
}
