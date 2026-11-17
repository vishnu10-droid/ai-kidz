import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, CheckCircle2, Package } from "lucide-react";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { dashQuery, dateLabel, money } from "@/lib/dash.api";
import type { OrderRow } from "@/lib/dash.api";
import {
  ORDER_STATUS_LABEL,
  ORDER_STEPS,
  PAYMENT_STATUS_LABEL,
  statusTone,
  TONE_CLASS,
} from "@/lib/order-status";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  validateSearch: (s: Record<string, unknown>): { placed?: boolean } =>
    s["placed"] === true || s["placed"] === "true" ? { placed: true } : {},
  head: () => ({
    meta: [
      ...pageMeta("Order Details", "Status and details of your AIKIDZ order."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { placed } = Route.useSearch();
  const order = useQuery(dashQuery<OrderRow>(["my-order", id], `/api/orders/${id}`));
  const data = order.data;
  const stepIndex = data ? ORDER_STEPS.indexOf(data.status as (typeof ORDER_STEPS)[number]) : -1;
  const items = data?.items ?? [];

  return (
    <Section className="pt-10 sm:pt-12">
      {placed ? (
        <div className="mb-8 flex items-center gap-3 rounded-3xl bg-mint/15 p-5">
          <CheckCircle2 className="size-8 text-mint" />
          <div>
            <div className="font-bold">Thank you! Your order is in.</div>
            <div className="text-sm text-muted-foreground">We'll notify you as it moves along.</div>
          </div>
        </div>
      ) : null}

      {order.isLoading ? (
        <div className="space-y-4">
          <div className="glass-panel h-16 animate-pulse rounded-3xl" />
          <div className="glass-panel h-64 animate-pulse rounded-3xl" />
        </div>
      ) : order.isError || !data ? (
        <div className="rounded-3xl border border-dashed p-12 text-center">
          <Package className="mx-auto size-12 text-muted-foreground" />
          <p className="mt-3 font-semibold">We couldn't find that order.</p>
          <Button asChild className="mt-4">
            <Link to="/orders">My orders</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold">Order {data.order_number}</h1>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                TONE_CLASS[statusTone(data.status)],
              )}
            >
              {ORDER_STATUS_LABEL[data.status] ?? data.status}
            </span>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                TONE_CLASS[statusTone(data.payment_status)],
              )}
            >
              {PAYMENT_STATUS_LABEL[data.payment_status] ?? data.payment_status}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed {dateLabel(data.placed_at ?? data.createdAt, true)}
          </p>

          {data.status !== "cancelled" ? (
            <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="Order progress">
              {ORDER_STEPS.map((step, index) => {
                const done = stepIndex >= index;
                return (
                  <li key={step} className="flex flex-col items-center text-center">
                    <span
                      className={cn(
                        "grid size-10 place-items-center rounded-full border-2 transition",
                        done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="size-5" /> : index + 1}
                    </span>
                    <span
                      className={cn(
                        "mt-2 text-xs font-semibold sm:text-sm",
                        done ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {ORDER_STATUS_LABEL[step]}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : null}

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className="glass-tile flex items-center gap-4 rounded-3xl p-4">
                  <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-secondary/60">
                    <Package className="size-6 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{item.name ?? "STEM kit"}</div>
                    <div className="text-sm text-muted-foreground">
                      {money(item.price ?? 0)} × {item.quantity ?? 1}
                    </div>
                  </div>
                  <span className="font-bold">
                    {money(Number(item.price ?? 0) * Number(item.quantity ?? 1))}
                  </span>
                </li>
              ))}
              {items.length === 0 ? (
                <li className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Line items are not available for this order.
                </li>
              ) : null}
            </ul>

            <aside className="space-y-4">
              <div className="glass-panel rounded-3xl p-5">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between border-t pt-2 text-base font-bold">
                    <dt>Total</dt>
                    <dd>{money(data.total)}</dd>
                  </div>
                </dl>
                {data.shipping_address ? (
                  <div className="mt-4 border-t pt-4 text-sm">
                    <p className="font-semibold">Delivery address</p>
                    <p className="mt-1 whitespace-pre-line text-muted-foreground">
                      {data.shipping_address}
                    </p>
                  </div>
                ) : null}
              </div>

              <Button asChild variant="outline" className="w-full rounded-full">
                <Link to="/orders">Back to my orders</Link>
              </Button>
              <Button asChild variant="brand" className="w-full rounded-full">
                <Link to="/shop">Shop more kits</Link>
              </Button>
            </aside>
          </div>
        </>
      )}
    </Section>
  );
}
