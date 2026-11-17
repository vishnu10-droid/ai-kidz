import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { dashQuery, dateLabel, money } from "@/lib/dash.api";
import type { OrderRow } from "@/lib/dash.api";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  statusTone,
  TONE_CLASS,
} from "@/lib/order-status";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/orders/")({
  head: () => ({
    meta: [
      ...pageMeta("My Orders", "Track your AIKIDZ kit orders."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Orders,
});

function Orders() {
  const orders = useQuery(dashQuery<OrderRow[]>(["my-orders"], "/api/orders"));
  const rows = orders.data ?? [];

  return (
    <Section className="pt-10 sm:pt-12">
      <h1 className="text-3xl font-extrabold sm:text-4xl">My orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every AIKIDZ kit you've ordered, with live status.
      </p>

      {orders.isLoading ? (
        <div className="mt-8 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="glass-panel h-24 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : orders.isError ? (
        <p className="mt-8 rounded-3xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
          Could not load your orders. Please refresh.
        </p>
      ) : rows.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed p-12 text-center">
          <Package className="mx-auto size-12 text-muted-foreground" />
          <p className="mt-3 font-semibold">No orders yet</p>
          <Button asChild className="mt-4">
            <Link to="/shop">Shop kits</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {rows.map((order) => (
            <li key={order.id}>
              <Link
                to="/orders/$id"
                params={{ id: order.id }}
                className="glass-panel glass-hover flex flex-wrap items-center gap-4 rounded-3xl p-5"
              >
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Package className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{order.order_number}</div>
                  <div className="text-sm text-muted-foreground">
                    {dateLabel(order.placed_at ?? order.createdAt, true)} ·{" "}
                    {(order.items ?? []).reduce(
                      (total, item) => total + Number(item.quantity ?? 1),
                      0,
                    )}{" "}
                    items
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    TONE_CLASS[statusTone(order.status)],
                  )}
                >
                  {ORDER_STATUS_LABEL[order.status] ?? order.status}
                </span>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    TONE_CLASS[statusTone(order.payment_status)],
                  )}
                >
                  {PAYMENT_STATUS_LABEL[order.payment_status] ?? order.payment_status}
                </span>
                <span className="font-bold">{money(order.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
