import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ forms */

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "number" | "date" | "textarea" | "select" | undefined;
  options?: { label: string; value: string }[] | undefined;
  required?: boolean | undefined;
  placeholder?: string | undefined;
  defaultValue?: string | undefined;
  generate?: boolean | undefined;
  hint?: string | undefined;
  min?: number | undefined;
  max?: number | undefined;
};

const randomPassword = () => {
  const words = ["Robot", "Coder", "Spark", "Build", "Learn", "Bright", "Maker", "Logic"];
  const word = words[Math.floor(Math.random() * words.length)] ?? "Robot";
  return `${word}@${Math.floor(1000 + Math.random() * 9000)}`;
};

export function FormDialog({
  trigger,
  title,
  description,
  fields,
  submitLabel = "Save",
  onSubmit,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: ReactNode | undefined;
  title: string;
  description?: string | undefined;
  fields: FieldDef[];
  submitLabel?: string | undefined;
  onSubmit: (values: Record<string, string>) => Promise<unknown>;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setValues(Object.fromEntries(fields.map((field) => [field.name, field.defaultValue ?? ""])));
    // Only reset when the dialog opens; fields are static per instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (name: string, value: string) =>
    setValues((previous) => ({ ...previous, [name]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    for (const field of fields) {
      if (field.required && !values[field.name]?.trim()) {
        toast.error(`${field.label} is required`);
        return;
      }
    }
    setBusy(true);
    try {
      await onSubmit(values);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="glass-panel max-h-[90vh] overflow-y-auto rounded-3xl border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor={`field-${field.name}`}
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {field.label}
                  {field.required ? " *" : ""}
                </Label>
                {field.generate ? (
                  <button
                    type="button"
                    onClick={() => set(field.name, randomPassword())}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    Generate random password
                  </button>
                ) : null}
              </div>
              {field.type === "textarea" ? (
                <Textarea
                  id={`field-${field.name}`}
                  value={values[field.name] ?? ""}
                  onChange={(event) => set(field.name, event.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                />
              ) : field.type === "select" ? (
                <select
                  id={`field-${field.name}`}
                  value={values[field.name] ?? ""}
                  onChange={(event) => set(field.name, event.target.value)}
                  className="glass-tile h-10 w-full rounded-xl border px-3 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <option value="">Select…</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={`field-${field.name}`}
                  type={field.type ?? "text"}
                  value={values[field.name] ?? ""}
                  onChange={(event) => set(field.name, event.target.value)}
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                  step={field.type === "number" ? "any" : undefined}
                />
              )}
              {field.hint ? (
                <p className="text-[11px] text-muted-foreground">{field.hint}</p>
              ) : null}
            </div>
          ))}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: ReactNode | undefined;
  title: string;
  description?: string | undefined;
  confirmLabel?: string | undefined;
  onConfirm: () => Promise<unknown>;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="glass-panel rounded-3xl border sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                setOpen(false);
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Could not complete the action",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------------- charts */

const SERIES_CONFIG: ChartConfig = {
  value: { label: "Amount", color: "var(--chart-1)" },
};

export function SimpleBarChart({
  data,
  height = 260,
  color = "var(--chart-1)",
}: {
  data: { label: string; value: number }[];
  height?: number | undefined;
  color?: string | undefined;
}) {
  return (
    <ChartContainer config={SERIES_CONFIG} className="w-full" style={{ height }}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -12 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.45} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          width={52}
        />
        <ChartTooltip
          cursor={{ fill: "var(--secondary)", opacity: 0.35 }}
          content={<ChartTooltipContent indicator="line" />}
        />
        <Bar dataKey="value" name="Amount" fill={color} radius={[6, 6, 0, 0]} barSize={28} />
      </BarChart>
    </ChartContainer>
  );
}

/* ------------------------------------------------------------------ misc */

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5 text-sm font-medium">{children}</div>
    </div>
  );
}

export function BusyButton({
  busy,
  children,
  ...props
}: { busy: boolean; children: ReactNode } & React.ComponentProps<typeof Button>) {
  return (
    <Button {...props} disabled={busy || props.disabled}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}

export function PercentBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-muted/70 ring-1 ring-inset ring-border/50",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
