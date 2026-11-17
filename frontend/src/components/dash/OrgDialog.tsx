import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FormField, selectClass } from "@/components/site/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { humanize, SCHOOL_PACKAGES } from "@/lib/admin-constants";

export type OrgKind = "school" | "franchise";
export type OrgValues = { name: string; email: string; phone: string; address: string; city: string; state: string; package: string; ownerEmail: string };

const EMPTY: OrgValues = { name: "", email: "", phone: "", address: "", city: "", state: "", package: "starter", ownerEmail: "" };

/** Looks up a registered user by email (admins can read every profile). */
async function findUserId(email: string) {
  const { data } = await supabase.from("profiles").select("id").eq("email", email.trim().toLowerCase()).limit(1).maybeSingle();
  return data?.id ?? null;
}

/**
 * Create or edit a school / franchise centre. Linking an owner email also gives that account the
 * matching dashboard role, so they can sign in and manage it straight away.
 */
export function OrgDialog({ kind, trigger, initial, existingId, onSaved }: {
  kind: OrgKind;
  trigger: ReactNode;
  initial?: Partial<OrgValues>;
  existingId?: string;
  onSaved: (id: string) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<OrgValues>({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = kind === "school" ? "school" : "centre";
  const set = (k: keyof OrgValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (v.name.trim().length < 2) return setError(`Enter the ${label} name.`);
    setBusy(true);
    try {
      let ownerId: string | null = null;
      if (v.ownerEmail.trim()) {
        ownerId = await findUserId(v.ownerEmail);
        if (!ownerId) {
          setError("No account uses that email yet. Ask them to sign up first, or leave the owner blank for now.");
          return;
        }
      }
      const row = {
        name: v.name.trim(),
        email: v.email.trim() || null,
        phone: v.phone.trim() || null,
        address: v.address.trim() || null,
        city: v.city.trim() || null,
        state: v.state.trim() || null,
        ...(ownerId || !v.ownerEmail.trim() ? { owner_id: ownerId } : {}),
      };
      let id = existingId ?? null;
      if (kind === "school") {
        const payload = { ...row, package: v.package };
        const res = existingId
          ? await supabase.from("schools").update(payload).eq("id", existingId).select("id").single()
          : await supabase.from("schools").insert({ ...payload, status: "active" }).select("id").single();
        if (res.error) throw res.error;
        id = res.data.id;
      } else {
        const res = existingId
          ? await supabase.from("franchises").update(row).eq("id", existingId).select("id").single()
          : await supabase.from("franchises").insert({ ...row, status: "active" }).select("id").single();
        if (res.error) throw res.error;
        id = res.data.id;
      }
      if (ownerId) {
        const role = kind === "school" ? "school_admin" : "franchise";
        const { error: roleError } = await supabase.from("user_roles").insert({ user_id: ownerId, role });
        if (roleError && roleError.code !== "23505") throw roleError;
      }
      toast.success(existingId ? `${humanize(label)} updated` : `${humanize(label)} created`);
      setOpen(false);
      if (!existingId) setV({ ...EMPTY, ...initial });
      if (id) await onSaved(id);
    } catch (err) {
      console.error(err);
      setError(`We couldn't save this ${label}. Please try again.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setV({ ...EMPTY, ...initial }); setError(null); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existingId ? `Edit ${label}` : `Add a ${label}`}</DialogTitle>
          <DialogDescription>Link an owner by the email they signed up with to give them the {kind === "school" ? "School Admin" : "Franchise"} dashboard.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormField label={kind === "school" ? "School name" : "Centre name"} htmlFor="org-name"><Input id="org-name" value={v.name} onChange={set("name")} maxLength={200} /></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Email" htmlFor="org-email"><Input id="org-email" type="email" value={v.email} onChange={set("email")} maxLength={200} /></FormField>
            <FormField label="Phone" htmlFor="org-phone"><Input id="org-phone" type="tel" value={v.phone} onChange={set("phone")} maxLength={20} /></FormField>
          </div>
          <FormField label="Address" htmlFor="org-address"><Input id="org-address" value={v.address} onChange={set("address")} maxLength={300} /></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="City" htmlFor="org-city"><Input id="org-city" value={v.city} onChange={set("city")} maxLength={80} /></FormField>
            <FormField label="State" htmlFor="org-state"><Input id="org-state" value={v.state} onChange={set("state")} maxLength={80} /></FormField>
          </div>
          {kind === "school" && (
            <FormField label="Package" htmlFor="org-package">
              <select id="org-package" className={selectClass} value={v.package} onChange={set("package")}>
                {SCHOOL_PACKAGES.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}
              </select>
            </FormField>
          )}
          <FormField label="Owner's account email (optional)" htmlFor="org-owner"><Input id="org-owner" type="email" value={v.ownerEmail} onChange={set("ownerEmail")} placeholder="person@school.in" /></FormField>
          {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="brand" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : existingId ? "Save changes" : `Create ${label}`}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
