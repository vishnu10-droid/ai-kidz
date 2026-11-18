import { useRouter, useRouterState } from "@tanstack/react-router";
import { ChevronsLeft, ChevronsRight, Home, LogOut, type LucideIcon } from "lucide-react";
import type { MouseEvent } from "react";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminNavItem = { label: string; href: string; icon: LucideIcon };

/** Split `?tab=` deep links so the sidebar can match pathname + active tab. */
function splitHref(href: string) {
  const [path = "", query = ""] = href.split("?");
  return { path, tab: new URLSearchParams(query).get("tab") };
}

function initials(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/**
 * Glass sidebar used by every role dashboard.
 * Collapses to an icon rail on desktop; the mobile drawer renders the same content expanded.
 */
export function AdminSidebar({
  items,
  pathname,
  roleLabel,
  roleIcon: RoleIcon,
  name,
  email,
  collapsed,
  compact = false,
  onToggleCollapsed,
  onNavigate,
  onSignOut,
}: {
  items: AdminNavItem[];
  pathname: string;
  roleLabel: string;
  roleIcon: LucideIcon;
  name: string;
  email: string;
  collapsed: boolean;
  compact?: boolean;
  onToggleCollapsed?: (() => void) | undefined;
  onNavigate?: (() => void) | undefined;
  onSignOut: () => void;
}) {
  const router = useRouter();
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });
  const activeTab = new URLSearchParams(searchStr).get("tab");

  // Default tab for each path, so a bare dashboard URL still highlights Overview.
  const firstTabByPath = new Map<string, string>();
  for (const item of items) {
    const { path, tab } = splitHref(item.href);
    if (tab && !firstTabByPath.has(path)) firstTabByPath.set(path, tab);
  }

  const go = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    onNavigate?.();
    void router.navigate({ href });
  };

  return (
    <div
      className={cn(
        "glass-sidebar-teal flex h-full flex-col gap-5 overflow-y-auto rounded-3xl border p-3 transition-[padding] duration-300",
        collapsed ? "items-center px-2" : "px-4",
      )}
    >
      <div
        className={cn(
          "flex w-full items-center gap-2 pt-1",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {collapsed ? (
          <span className="grid size-9 place-items-center rounded-xl bg-[linear-gradient(135deg,#55a8c2_0%,#127491_100%)] font-display text-sm font-extrabold text-white shadow-soft">
            A
          </span>
        ) : (
          <Logo light className="px-1" />
        )}
        {onToggleCollapsed ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "size-8 shrink-0 text-white/65 hover:bg-white/10 hover:text-white",
              collapsed && "hidden",
            )}
          >
            <ChevronsLeft className="size-4" />
          </Button>
        ) : null}
      </div>

      {collapsed && onToggleCollapsed ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapsed}
          aria-label="Expand sidebar"
          className="size-8 text-white/65 hover:bg-white/10 hover:text-white"
        >
          <ChevronsRight className="size-4" />
        </Button>
      ) : null}

      <div
        className={cn(
          "glass-tile flex w-full items-center gap-3 rounded-2xl p-2.5",
          collapsed && "justify-center p-2",
        )}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#55a8c2_0%,#127491_100%)] text-white shadow-soft">
          <RoleIcon className="size-5" aria-hidden />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-white">{name || email}</div>
            <div className="truncate text-[11px] font-medium uppercase tracking-wide text-white/60">
              {roleLabel}
            </div>
          </div>
        )}
      </div>

      <nav className="flex w-full flex-col gap-1" aria-label="Dashboard">
        {!collapsed && (
          <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
            {roleLabel} workspace
          </p>
        )}
        {items.map((item) => {
          const { path, tab } = splitHref(item.href);
          const samePath = pathname === path || pathname.startsWith(`${path}/`);
          const active =
            samePath &&
            (tab ? (activeTab ?? firstTabByPath.get(path)) === tab : !firstTabByPath.has(path));
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={(event) => go(event, item.href)}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 font-medium transition",
                compact ? "py-2 text-xs" : "py-2.5 text-sm",
                collapsed && "w-10 justify-center px-0",
                active ? "nav-teal-active" : "nav-teal",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#e6f4f8] shadow-[0_0_12px_rgba(230,244,248,0.9)]"
                />
              )}
              <item.icon
                className={cn("size-4 shrink-0", active ? "text-white" : "text-white/60")}
                aria-hidden
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </a>
          );
        })}
      </nav>

      <div className={cn("mt-auto flex w-full flex-col gap-2", collapsed && "items-center")}>
        <div
          className={cn(
            "glass-tile flex w-full items-center gap-2.5 rounded-2xl p-2",
            collapsed && "w-auto justify-center",
          )}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/12 text-xs font-bold text-white ring-1 ring-inset ring-white/20">
            {initials(name, email)}
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{name || "Account"}</div>
              <div className="truncate text-[11px] text-white/60">{email}</div>
            </div>
          )}
        </div>

        <div className={cn("flex w-full gap-2", collapsed && "flex-col items-center")}>
          <a
            href="/"
            title="Back to website"
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white",
              collapsed && "w-10 flex-none px-0",
            )}
          >
            <Home className="size-4" aria-hidden />
            {!collapsed && "Website"}
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            title="Sign out"
            className={cn(
              "flex-1 justify-center gap-2 rounded-xl px-3 text-xs font-semibold text-white/70 hover:bg-red-400/15 hover:text-red-100",
              collapsed && "w-10 flex-none px-0",
            )}
          >
            <LogOut className="size-4" aria-hidden />
            {!collapsed && "Sign out"}
          </Button>
        </div>
      </div>
    </div>
  );
}
