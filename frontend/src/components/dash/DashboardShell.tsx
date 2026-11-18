import { useRouterState } from "@tanstack/react-router";
import {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  CircleHelp,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  ListTodo,
  Mail,
  NotebookPen,
  Network,
  Package,
  School,
  ShoppingBag,
  Store,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { homeForRoles, ROLE_LABEL, type AppRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { AdminSidebar, type AdminNavItem } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import {
  GlassEmpty,
  GlassPanel,
  GlassProgressBar,
  GlassStatCard,
  type GlassTone,
  type Trend,
} from "./Glass";
import { NotificationsBell } from "./NotificationsBell";

export const DASH_NAV: Record<AppRole, AdminNavItem[]> = {
  student: [
    { label: "Overview", href: "/student/dashboard", icon: LayoutDashboard },
    { label: "My Courses", href: "/student/courses", icon: BookOpen },
    { label: "Assignments", href: "/student/assignments", icon: NotebookPen },
    { label: "Quizzes", href: "/student/quizzes", icon: ClipboardList },
    { label: "Certificates", href: "/student/certificates", icon: Award },
    { label: "My Orders", href: "/orders", icon: ShoppingBag },
  ],
  parent: [
    { label: "Child overview", href: "/parent/dashboard?tab=overview", icon: LayoutDashboard },
    { label: "Attendance", href: "/parent/dashboard?tab=attendance", icon: CalendarCheck },
    { label: "Fees & receipts", href: "/parent/dashboard?tab=fees", icon: Wallet },
    { label: "Progress", href: "/parent/dashboard?tab=progress", icon: Award },
    { label: "My Orders", href: "/orders", icon: ShoppingBag },
  ],
  teacher: [
    { label: "My batches", href: "/teacher/dashboard?tab=batches", icon: BookOpen },
    { label: "Attendance", href: "/teacher/dashboard?tab=attendance", icon: CalendarCheck },
    { label: "Assignments", href: "/teacher/dashboard?tab=assignments", icon: NotebookPen },
    { label: "Grading", href: "/teacher/dashboard?tab=grading", icon: ClipboardList },
  ],
  school_admin: [
    { label: "Overview", href: "/school/dashboard?tab=overview", icon: LayoutDashboard },
    { label: "Batches", href: "/school/dashboard?tab=batches", icon: BookOpen },
    { label: "Teachers", href: "/school/dashboard?tab=teachers", icon: GraduationCap },
    { label: "Students", href: "/school/dashboard?tab=students", icon: Users },
    { label: "Fees & invoices", href: "/school/dashboard?tab=fees", icon: Wallet },
    { label: "Attendance", href: "/school/dashboard?tab=attendance", icon: CalendarCheck },
  ],
  franchise: [
    { label: "Overview", href: "/franchise/dashboard?tab=overview", icon: LayoutDashboard },
    { label: "Centre batches", href: "/franchise/dashboard?tab=batches", icon: BookOpen },
    { label: "Teachers", href: "/franchise/dashboard?tab=teachers", icon: GraduationCap },
    { label: "Students", href: "/franchise/dashboard?tab=students", icon: Users },
    { label: "Fees & invoices", href: "/franchise/dashboard?tab=fees", icon: Wallet },
    { label: "Attendance", href: "/franchise/dashboard?tab=attendance", icon: CalendarCheck },
    { label: "Local enquiries", href: "/franchise/dashboard?tab=enquiries", icon: Mail },
    { label: "Revenue", href: "/franchise/dashboard?tab=revenue", icon: BarChart3 },
  ],
  admin: [
    { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Reports", href: "/admin/orders", icon: BarChart3 },
    { label: "Tasks", href: "/admin/enquiries", icon: ListTodo },
    { label: "Node & events", href: "/admin/schools", icon: Network },
    { label: "Clients", href: "/admin/users", icon: Users },
    { label: "Support", href: "/admin/enquiries", icon: CircleHelp },
    { label: "Monetization", href: "/admin/orders", icon: Package },
    { label: "Settings", href: "/admin/users", icon: Settings },
  ],
};

const ROLE_ICON: Record<AppRole, LucideIcon> = {
  student: GraduationCap,
  parent: Users,
  teacher: BookOpen,
  school_admin: Building2,
  franchise: Store,
  admin: BarChart3,
};

const COLLAPSE_KEY = "aikidz-dashboard-collapsed";

/**
 * App shell for every role dashboard: glass sidebar, sticky topbar and an
 * ambient primary/violet/sun mesh behind the content.
 */
export function DashboardShell({
  role,
  title,
  displayTitle,
  subtitle,
  displaySubtitle,
  actions,
  children,
  searchPlaceholder,
  headerVariant = "glass",
}: {
  role: AppRole;
  title: string;
  /** Optional presentation title while retaining a stable semantic page title. */
  displayTitle?: ReactNode;
  subtitle?: ReactNode;
  displaySubtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Overrides the topbar's search hint (e.g. admin's broader command search). */
  searchPlaceholder?: string | undefined;
  /** `plain` drops the glass title card and sits the heading directly on the mesh. */
  headerVariant?: "glass" | "plain";
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { roles, profile, user, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* storage can be unavailable in private mode */
    }
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });

  const items = DASH_NAV[role];
  const RoleIcon = ROLE_ICON[role];
  const allowed = roles.includes(role) || roles.includes("admin");
  const name = profile?.full_name ?? user?.full_name ?? "";
  const email = profile?.email ?? user?.email ?? "";

  const renderSidebar = (
    isCollapsed: boolean,
    options?: { onToggle?: (() => void) | undefined; onNavigate?: (() => void) | undefined },
  ) => (
    <AdminSidebar
      items={items}
      pathname={pathname}
      roleLabel={ROLE_LABEL[role]}
      roleIcon={RoleIcon}
      name={name}
      email={email}
      collapsed={isCollapsed}
      compact={role === "student"}
      onToggleCollapsed={options?.onToggle}
      onNavigate={options?.onNavigate}
      onSignOut={() => void signOut()}
    />
  );

  return (
    <div className="relative min-h-screen text-foreground">
      {/* Ambient backdrop so the translucent surfaces read as glass. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-20 bg-background" />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 admin-mesh" />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-grid opacity-25" />

      <div
        className={cn(
          "min-h-screen transition-[grid-template-columns] duration-300 lg:grid",
          collapsed ? "lg:grid-cols-[92px_1fr]" : "lg:grid-cols-[276px_1fr]",
        )}
      >
        <aside className="sticky top-0 hidden h-screen p-3 lg:block">
          {renderSidebar(collapsed, { onToggle: toggleCollapsed })}
        </aside>

        <div className="min-w-0">
          <AdminTopbar
            items={items}
            roleLabel={ROLE_LABEL[role]}
            name={name}
            email={email}
            onOpenMenu={() => setMobileOpen(true)}
            onSignOut={() => void signOut()}
            notifications={<NotificationsBell />}
            searchPlaceholder={searchPlaceholder}
          />

          <main className="mx-auto w-full max-w-[1560px] px-3 pb-10 pt-4 sm:px-5 lg:px-6 lg:pt-6">
            {loading ? (
              <div className="space-y-4">
                <div className="glass-panel h-28 animate-pulse rounded-3xl" />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[0, 1, 2, 3].map((key) => (
                    <div key={key} className="glass-panel h-32 animate-pulse rounded-3xl" />
                  ))}
                </div>
                <div className="glass-panel h-72 animate-pulse rounded-3xl" />
              </div>
            ) : !allowed ? (
              <div className="glass-panel mx-auto max-w-md rounded-3xl p-8 text-center">
                <h1 className="text-xl font-bold">This area is for {ROLE_LABEL[role]} accounts</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your account doesn't have access here. If you think it should, ask an AIKIDZ
                  admin.
                </p>
                <Button asChild className="mt-5">
                  <a href={homeForRoles(roles)}>Go to my dashboard</a>
                </Button>
              </div>
            ) : (
              <>
                {headerVariant === "plain" ? (
                  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div className="min-w-0">
                      <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_16px_rgba(4,40,55,0.45)] sm:text-[32px]">
                        {displayTitle ?? title}
                      </h1>
                      {(displaySubtitle ?? subtitle) && (
                        <p className="mt-1.5 text-sm font-medium text-white/75">{displaySubtitle ?? subtitle}</p>
                      )}
                    </div>
                    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
                  </div>
                ) : (
                  <div className="glass-panel glass-highlight mb-6 flex flex-wrap items-end justify-between gap-4 rounded-3xl border px-5 py-4">
                    <div className="min-w-0">
                      <h1 className="text-2xl font-extrabold sm:text-3xl">{displayTitle ?? title}</h1>
                      {(displaySubtitle ?? subtitle) && <p className="mt-1 text-muted-foreground">{displaySubtitle ?? subtitle}</p>}
                    </div>
                    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
                  </div>
                )}
                {children}
              </>
            )}
          </main>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[288px] border-r-0 bg-[#0b384a]/85 p-2 backdrop-blur-xl sm:max-w-[288px]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          {renderSidebar(false, { onNavigate: () => setMobileOpen(false) })}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tone = "primary",
  hint,
  trend,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: GlassTone;
  hint?: string | undefined;
  trend?: Trend | undefined;
}) {
  return (
    <GlassStatCard label={label} value={value} icon={icon} tone={tone} hint={hint} trend={trend} />
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <GlassPanel title={title} description={description} action={action} className={className}>
      {children}
    </GlassPanel>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <GlassEmpty>{children}</GlassEmpty>;
}

export function ProgressBar({ value }: { value: number }) {
  return <GlassProgressBar value={value} />;
}

/** Shown on school / centre dashboards while AIKIDZ hasn't approved a self-registered partner yet. */
export function PendingApprovalNotice({
  kind,
  status,
}: {
  kind: "school" | "centre";
  status: string;
}) {
  if (status === "active") return null;
  const suspended = status === "suspended";
  return (
    <div
      role="status"
      className={cn(
        "glass-panel mb-6 rounded-3xl border p-4 text-sm",
        suspended ? "border-destructive/40 bg-destructive/10" : "border-sun/40 bg-sun/10",
      )}
    >
      <strong className="font-semibold">
        {suspended ? `This ${kind} is suspended.` : `Your ${kind} is waiting for approval.`}
      </strong>{" "}
      {suspended
        ? "Contact the AIKIDZ team to restore access."
        : `You can sign in and use this dashboard meanwhile. Our partnerships team will verify your ${kind} and switch it live, usually within 2 working days.`}
    </div>
  );
}
