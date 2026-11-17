import { useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { dashQuery, post } from "@/lib/dash.api";
import type { NotificationRow } from "@/lib/dash.api";

type NotificationFeed = { unread: number; notifications: NotificationRow[] };

/** Notification bell with an unread badge, fed by GET /api/notifications. */
export function NotificationsBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();

  const feed = useQuery({
    ...dashQuery<NotificationFeed>(["notifications", user?.id ?? ""], "/api/notifications"),
    enabled: Boolean(user),
    refetchInterval: 2 * 60_000,
  });

  const rows = feed.data?.notifications ?? [];
  const unread = feed.data?.unread ?? 0;
  const refresh = () => void qc.invalidateQueries({ queryKey: ["notifications"] });

  async function open(notification: NotificationRow) {
    try {
      if (!notification.read) {
        await post(`/api/notifications/${notification.id}/read`, {});
        refresh();
      }
      if (notification.link?.startsWith("/")) void router.navigate({ href: notification.link });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the notification");
    }
  }

  async function markAll() {
    try {
      await post("/api/notifications/read-all", {});
      refresh();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update notifications");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          className="glass-tile relative size-9 rounded-full border text-white/85 hover:bg-white/10 hover:text-white"
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-destructive px-1 py-0.5 text-[10px] font-bold leading-none text-destructive-foreground shadow-soft">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-panel w-80 rounded-2xl">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {unread > 0 && (
            <button
              type="button"
              onClick={() => void markAll()}
              className="text-xs font-medium text-primary"
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {feed.isLoading ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Loading notifications…</p>
        ) : feed.isError ? (
          <p className="p-4 text-center text-sm text-destructive">Could not load notifications.</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">You're all caught up.</p>
        ) : null}
        {rows.map((notification) => (
          <DropdownMenuItem
            key={notification.id}
            onSelect={() => void open(notification)}
            className="flex flex-col items-start gap-0.5 py-2"
          >
            <span className="flex w-full items-center gap-2 font-semibold">
              {!notification.read && <span className="size-2 rounded-full bg-primary" />}
              {notification.title}
            </span>
            {notification.message && (
              <span className="line-clamp-2 text-xs text-muted-foreground">
                {notification.message}
              </span>
            )}
            {notification.createdAt && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(notification.createdAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
