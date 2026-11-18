import { useRouter, useRouterState } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, LogOut, Menu, Search, Globe } from "lucide-react";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { humanize } from "@/lib/admin-constants";
import { cn } from "@/lib/utils";
import type { AdminNavItem } from "./AdminSidebar";

function initials(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function useCrumbTrail(items: AdminNavItem[]) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    return {
      href,
      label: items.find((item) => item.href.split("?")[0] === href)?.label ?? humanize(segment),
    };
  });
}

/** Sticky glass topbar: breadcrumbs, ⌘K palette, notifications and the account menu. */
export function AdminTopbar({
  items,
  roleLabel,
  name,
  email,
  onOpenMenu,
  onSignOut,
  notifications,
  searchPlaceholder = "Search…",
}: {
  items: AdminNavItem[];
  roleLabel: string;
  name: string;
  email: string;
  onOpenMenu: () => void;
  onSignOut: () => void;
  notifications?: ReactNode;
  searchPlaceholder?: string | undefined;
}) {
  const router = useRouter();
  const crumbs = useCrumbTrail(items);
  const last = crumbs[crumbs.length - 1];
  const [paletteOpen, setPaletteOpen] = useState(false);
  const rootHref = items[0]?.href ?? "/";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = (href: string) => {
    setPaletteOpen(false);
    if (href.startsWith("/")) void router.navigate({ href });
    else window.location.assign(href);
  };

  const followCrumb = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    go(href);
  };

  return (
    <header className="glass-chrome sticky top-0 z-40 border-b">
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMenu}
          aria-label="Open navigation"
          className="glass-tile size-9 rounded-full border text-white/85 hover:bg-white/10 hover:text-white lg:hidden"
        >
          <Menu className="size-4" />
        </Button>

        <div className="min-w-0 flex-1">
          <nav
            aria-label="Breadcrumb"
            className="hidden items-center gap-1 text-xs text-white/65 sm:flex"
          >
            <a
              href={rootHref}
              onClick={(event) => followCrumb(event, rootHref)}
              className="rounded px-1 py-0.5 transition hover:text-white"
            >
              {roleLabel}
            </a>
            {crumbs.slice(1).map((crumb, index) => {
              const isLast = index === crumbs.length - 2;
              return (
                <span key={crumb.href} className="flex min-w-0 items-center gap-1">
                  <ChevronRight className="size-3 shrink-0 opacity-60" aria-hidden />
                  {isLast ? (
                    <span aria-current="page" className="truncate font-semibold text-white">
                      {crumb.label}
                    </span>
                  ) : (
                    <a
                      href={crumb.href}
                      onClick={(event) => followCrumb(event, crumb.href)}
                      className="truncate rounded px-1 py-0.5 transition hover:text-white"
                    >
                      {crumb.label}
                    </a>
                  )}
                </span>
              );
            })}
          </nav>
          <p className="truncate text-sm font-bold text-white sm:hidden">
            {last?.label ?? roleLabel}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="glass-tile hidden h-9 w-56 min-w-0 items-center gap-2 rounded-full border px-3 text-sm text-white/70 transition hover:border-white/30 hover:text-white sm:flex lg:w-72 xl:w-[25rem]"
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-left">{searchPlaceholder}</span>
          <kbd className="shrink-0 rounded-md border border-white/25 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white/80">
            ⌘K
          </kbd>
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPaletteOpen(true)}
          aria-label="Search dashboard"
          className="glass-tile size-9 rounded-full border text-white/85 hover:bg-white/10 hover:text-white sm:hidden"
        >
          <Search className="size-4" />
        </Button>

        {notifications}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="glass-tile flex items-center gap-2 rounded-full border p-1 pr-1.5 transition hover:border-white/30 sm:pr-2.5"
              aria-label="Open account menu"
            >
              <span className="grid size-7 place-items-center rounded-full bg-[linear-gradient(135deg,#55a8c2_0%,#127491_100%)] text-[11px] font-bold text-white">
                {initials(name, email)}
              </span>
              <span className="hidden max-w-32 truncate text-xs font-semibold text-white sm:inline">
                {name || "Account"}
              </span>
              <ChevronDown className="hidden size-3.5 text-white/70 sm:block" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-panel w-60 rounded-2xl">
            <DropdownMenuLabel className="font-normal">
              <div className="truncate text-sm font-semibold">{name || "Account"}</div>
              <div className="truncate text-xs text-muted-foreground">{email}</div>
              <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                {roleLabel}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/" className="cursor-pointer">
                <Globe className="size-4" aria-hidden /> Back to website
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onSignOut()}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" aria-hidden /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="Jump to a page…" aria-label="Search dashboard pages" />
        <CommandList>
          <CommandEmpty>No matching page.</CommandEmpty>
          <CommandGroup heading="Dashboard">
            {items.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.label} ${item.href}`}
                onSelect={() => go(item.href)}
              >
                <item.icon className={cn("size-4")} aria-hidden />
                {item.label}
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Website">
            <CommandItem value="Back to website home" onSelect={() => go("/")}>
              <Globe className="size-4" aria-hidden />
              Back to website
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
