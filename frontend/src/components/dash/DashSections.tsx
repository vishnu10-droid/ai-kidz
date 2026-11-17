import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

/** Scrollable tab bar used by every dashboard workspace. */
export function TabsNav({
  tabs,
}: {
  tabs: { value: string; label: string; badge?: number | undefined }[];
}) {
  return (
    <TabsList className="glass-panel mb-6 flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl border p-1.5">
      {tabs.map((tab) => (
        <TabsTrigger
          key={tab.value}
          value={tab.value}
          className="rounded-xl px-3.5 py-2 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-soft"
        >
          {tab.label}
          {tab.badge ? (
            <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
              {tab.badge}
            </span>
          ) : null}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}

export function LoadingGrid({
  cards = 4,
  rows = 1,
}: {
  cards?: number | undefined;
  rows?: number | undefined;
}) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="glass-panel h-32 animate-pulse rounded-3xl" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="glass-panel h-64 animate-pulse rounded-3xl" />
      ))}
    </div>
  );
}

export function LoadingRows({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"
      role="status"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden /> {label}…
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
      {message}
    </p>
  );
}

export function EmptyState({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode | undefined;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-card/30 p-8 text-center text-sm text-muted-foreground">
      <p>{children}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** Inline label/value used inside compact glass cards. */
export function InlineStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "mint" | "destructive" | "sun" | undefined;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-sm font-semibold",
          tone === "mint" && "text-mint",
          tone === "destructive" && "text-destructive",
          tone === "sun" && "text-sun-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** Read-only dialog used for "view students" style drills. */
export function InfoDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | undefined;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel max-h-[85vh] overflow-y-auto rounded-3xl border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
