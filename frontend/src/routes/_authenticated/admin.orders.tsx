import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, IndianRupee, Package, RefreshCw, ShoppingBag, Truck } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/dash/AdminBits";
import { DashboardShell, Panel, StatCard } from "@/components/dash/DashboardShell";
import { LoadingRows } from "@/components/dash/DashSections";
import { DataTable } from "@/components/dash/DataTable";
import { Button } from "@/components/ui/button";
import { dashQuery, dateLabel, money, patch } from "@/lib/dash.api";
import type { OrderRow } from "@/lib/dash.api";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({
    meta: [
      ...pageMeta("Store Orders", "AIKIDZ store orders and fulfilment."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOrders,
});

const ORDER_STATUSES = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
] as const;
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;

function AdminOrders() {
  const qc = useQueryClient();
  const orders = useQuery(dashQuery<OrderRow[]>(["admin", "orders"], "/api/admin/orders"));
  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin", "orders"] });

  async function update(order: OrderRow, body: Record<string, string>) {
    try {
      await patch(`/api/admin/orders/${order.id}`, body);
      toast.success(`Order ${order.order_number} updated`);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the order");
    }
  }

  const rows = orders.data ?? [];
  const paid = rows.filter((order) => order.payment_status === "paid");

  return (
    <DashboardShell
      role="admin"
      title="Store orders"
      subtitle="Track every STEM kit order from placement to delivery."
      actions={
        <Button variant="outline" size="sm" className="rounded-full" onClick={refresh}>
          <RefreshCw className="size-4" /> Refresh
        </Button>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Orders" value={rows.length} icon={ShoppingBag} />
        <StatCard
          label="Paid revenue"
          value={money(paid.reduce((total, order) => total + order.total, 0))}
          icon={IndianRupee}
          tone="mint"
        />
        <StatCard
          label="In fulfilment"
          value={
            rows.filter((order) => ["confirmed", "packed", "shipped"].includes(order.status)).length
          }
          icon={Truck}
          tone="violet"
        />
        <StatCard
          label="Delivered"
          value={rows.filter((order) => order.status === "delivered").length}
          icon={CheckCircle2}
          tone="sun"
        />
      </div>

      <Panel
        title="All orders"
        description="Update fulfilment and payment status from the row menu."
      >
        {orders.isLoading ? (
          <LoadingRows label="Loading orders" />
        ) : (
          <DataTable
            rows={rows}
            columns={[
              {
                id: "order",
                header: "Order",
                cell: (order: OrderRow) => (
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-semibold">{order.order_number}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {dateLabel(order.placed_at ?? order.createdAt)}
                    </p>
                  </div>
                ),
                sortValue: (order: OrderRow) => order.order_number,
              },
              {
                id: "customer",
                header: "Customer",
                cell: (order: OrderRow) => (
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{order.customer_name ?? "Guest"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {order.customer_email ?? "—"}
                    </p>
                  </div>
                ),
                sortValue: (order: OrderRow) => order.customer_name ?? "",
              },
              {
                id: "items",
                header: "Items",
                cell: (order: OrderRow) => (
                  <span className="text-xs text-muted-foreground">
                    {order.items
                      ?.map((item) => item.name)
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </span>
                ),
              },
              {
                id: "total",
                header: "Total",
                align: "right" as const,
                cell: (order: OrderRow) => (
                  <span className="font-semibold tabular-nums">{money(order.total)}</span>
                ),
                sortValue: (order: OrderRow) => order.total,
              },
              {
                id: "payment",
                header: "Payment",
                cell: (order: OrderRow) => <StatusBadge value={order.payment_status} />,
                sortValue: (order: OrderRow) => order.payment_status,
              },
              {
                id: "status",
                header: "Fulfilment",
                cell: (order: OrderRow) => <StatusBadge value={order.status} />,
                sortValue: (order: OrderRow) => order.status,
              },
            ]}
            rowKey={(order) => order.id}
            searchFields={(order) => [
              order.order_number,
              order.customer_name,
              order.customer_email,
            ]}
            searchPlaceholder="Search orders…"
            filters={[
              {
                id: "status",
                label: "Fulfilment",
                options: ORDER_STATUSES.map((status) => ({ label: status, value: status })),
                match: (order, value) => order.status === value,
              },
              {
                id: "payment",
                label: "Payment",
                options: PAYMENT_STATUSES.map((status) => ({ label: status, value: status })),
                match: (order, value) => order.payment_status === value,
              },
            ]}
            empty="No orders match these filters."
            actions={(order) => [
              ...ORDER_STATUSES.filter((status) => status !== order.status).map((status) => ({
                label: `Mark ${status}`,
                icon: Package,
                onSelect: () => void update(order, { status }),
              })),
              ...(order.payment_status !== "paid"
                ? [
                    {
                      label: "Mark payment received",
                      icon: CheckCircle2,
                      onSelect: () => void update(order, { payment_status: "paid" }),
                    },
                  ]
                : []),
            ]}
          />
        )}
      </Panel>
    </DashboardShell>
  );
}
