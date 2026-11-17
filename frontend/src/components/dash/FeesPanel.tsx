import { Download, IndianRupee, Loader2, Plus, ReceiptText, TriangleAlert, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { countBy, FilterBar, StatusBadge } from "@/components/dash/AdminBits";
import { Empty, Panel, StatCard } from "@/components/dash/DashboardShell";
import { FormField, selectClass } from "@/components/site/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDate, humanize, matchesSearch } from "@/lib/admin-constants";
import { feeStatus, PAYMENT_METHODS, summarizeFees, todayIST } from "@/lib/fees";
import { downloadReceiptPdf } from "@/lib/pdf";
import { formatINR } from "@/lib/pricing";

export type FeeStudent = { id: string; full_name: string; student_code: string };
export type FeeInvoice = {
  id: string; receipt_number: string; description: string | null; amount: number; status: string; method: string | null;
  due_date: string | null; paid_at: string | null; created_at: string; student_id: string | null;
  students: { full_name: string; student_code: string } | null;
};

const FEE_FILTERS = ["pending", "overdue", "paid"] as const;

/** Fee invoices for one school or centre: raise invoices, record offline payments, download receipts. */
export function FeesPanel({ org, students, fees, onChange }: {
  org: { kind: "school" | "franchise"; id: string; name: string };
  students: FeeStudent[];
  fees: FeeInvoice[];
  onChange: () => Promise<void>;
}) {
  const today = todayIST();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [methods, setMethods] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const sum = summarizeFees(fees, today);
  const counts = useMemo(() => countBy(fees, (f) => feeStatus(f, today)), [fees, today]);
  const shown = fees.filter((f) => (status === "all" || feeStatus(f, today) === status) && matchesSearch(search, f.students?.full_name, f.students?.student_code, f.description, f.receipt_number));

  async function markPaid(f: FeeInvoice) {
    setBusy(f.id);
    const { error } = await supabase.from("payments").update({ status: "paid", paid_at: new Date().toISOString(), method: methods[f.id] ?? "cash" }).eq("id", f.id);
    setBusy(null);
    if (error) return void toast.error("We couldn't record that payment.");
    toast.success("Payment recorded · the family has been notified");
    await onChange();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Collected" value={formatINR(sum.collected)} icon={Wallet} tone="mint" />
        <StatCard label="Outstanding" value={formatINR(sum.outstanding)} icon={IndianRupee} tone="sun" hint={`${counts["pending"] ?? 0} unpaid invoice(s) not yet due`} />
        <StatCard label="Overdue" value={formatINR(sum.overdue)} icon={TriangleAlert} tone="violet" hint={`${sum.overdueCount} invoice(s) past due date`} />
      </div>
      <Panel title="Fee invoices" action={<NewInvoiceDialog org={org} students={students} onSaved={onChange} />}>
        <FilterBar search={search} onSearch={setSearch} statuses={FEE_FILTERS} status={status} onStatus={setStatus} counts={counts} placeholder="Search student, receipt no…" />
        {shown.length === 0 ? (
          <Empty>{fees.length ? "No invoices match this filter." : students.length ? "No fee invoices yet. Use New invoice to bill a student." : "Add students first, then you can raise fee invoices for them."}</Empty>
        ) : (
          <ul className="divide-y">
            {shown.map((f) => {
              const st = feeStatus(f, today);
              return (
                <li key={f.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <ReceiptText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{f.students?.full_name ?? "Student"} · {f.description ?? "Fee"}</div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-mono">{f.receipt_number}</span> · {st === "paid" ? `paid ${formatDate(f.paid_at)}${f.method ? ` by ${humanize(f.method)}` : ""}` : f.due_date ? `due ${formatDate(f.due_date)}` : "no due date"}
                    </div>
                  </div>
                  <span className="font-bold">{formatINR(f.amount)}</span>
                  <StatusBadge value={st} labels={{ pending: "Unpaid" }} />
                  {f.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <select aria-label={`Payment method for ${f.receipt_number}`} className={`${selectClass} h-8 w-auto text-xs`} value={methods[f.id] ?? "cash"} onChange={(e) => setMethods((m) => ({ ...m, [f.id]: e.target.value }))}>
                        {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{humanize(m)}</option>)}
                      </select>
                      <Button size="sm" variant="brand" disabled={busy === f.id} onClick={() => void markPaid(f)}>{busy === f.id ? <Loader2 className="animate-spin" /> : null} Mark paid</Button>
                    </div>
                  )}
                  <Button size="sm" variant="outline" aria-label={`Download ${f.status === "paid" ? "receipt" : "invoice"} ${f.receipt_number}`} onClick={() => void downloadReceiptPdf({
                    receiptNumber: f.receipt_number, orgName: org.name, studentName: f.students?.full_name ?? "Student", studentCode: f.students?.student_code,
                    description: f.description ?? "Fee", amount: f.amount, status: f.status, method: f.method, paidAt: f.paid_at, dueDate: f.due_date, createdAt: f.created_at,
                  })}><Download /> PDF</Button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function NewInvoiceDialog({ org, students, onSaved }: { org: { kind: "school" | "franchise"; id: string }; students: FeeStudent[]; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [description, setDescription] = useState("Term fee");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    const amt = Number(amount);
    if (!studentId) return void toast.error("Choose a student");
    if (!Number.isFinite(amt) || amt <= 0 || amt > 1_000_000) return void toast.error("Enter an amount in ₹ between 1 and 10,00,000");
    if (description.trim().length < 2) return void toast.error("Describe what the fee is for");
    setBusy(true);
    const { error } = await supabase.from("payments").insert({
      ...(org.kind === "school" ? { school_id: org.id } : { franchise_id: org.id }),
      student_id: studentId, purpose: "fee", description: description.trim().slice(0, 200), amount: Math.round(amt * 100) / 100,
      due_date: due || null, provider: "offline", status: "pending",
    });
    setBusy(false);
    if (error) return void toast.error("We couldn't create that invoice.");
    toast.success("Invoice created · the family has been notified");
    setOpen(false);
    setStudentId("");
    setAmount("");
    setDue("");
    await onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="brand" disabled={students.length === 0}><Plus /> New invoice</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New fee invoice</DialogTitle>
          <DialogDescription>The student and their parent see it on their dashboard straight away.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FormField label="Student" htmlFor="fee-student">
            <select id="fee-student" className={selectClass} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Choose a student…</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.student_code})</option>)}
            </select>
          </FormField>
          <FormField label="What is it for?" htmlFor="fee-desc"><Input id="fee-desc" value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} placeholder="Term 2 robotics fee" /></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Amount (₹)" htmlFor="fee-amt"><Input id="fee-amt" type="number" min={1} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="4500" /></FormField>
            <FormField label="Due date" htmlFor="fee-due"><Input id="fee-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="brand" disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="animate-spin" />} Create invoice</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
