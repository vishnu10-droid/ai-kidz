import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Building2, GraduationCap, Loader2, MailCheck, Store, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/site/AuthShell";
import { FormField } from "@/components/site/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { destinationAfterLogin } from "@/lib/post-login";
import { isOrgSignupRole } from "@/lib/roles";
import { registerSchema } from "@/lib/schemas";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { register, saveAuthToken } from "@/lib/api";

export const Route = createFileRoute("/register")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => (typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {}),
  head: () => ({ meta: pageMeta("Create an Account", "Join AIKIDZ as a student, parent, partner school or franchise centre to access courses, dashboards, progress tracking and certificates.") }),
  component: Register,
});

type Values = z.infer<typeof registerSchema>;

function Register() {
  const search = Route.useSearch();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(registerSchema), defaultValues: { full_name: "", email: "", phone: "", role: "student", org_name: "", city: "", state: "", password: "", confirm: "" } });
  const role = form.watch("role");
  const isOrg = isOrgSignupRole(role);

  async function onSubmit(v: Values) {
    setBusy(true);
    try {
      const data = await register({
        email: v.email, password: v.password, full_name: v.full_name, phone: v.phone || null,
        role: v.role, organization_name: v.org_name, city: v.city, state: v.state,
      });
      saveAuthToken(data.token);
      toast.success("Welcome to AIKIDZ!");
      const href = await destinationAfterLogin(data.user.id, search.redirect);
      await router.navigate({ href, replace: true });
    } catch (error) {
      setBusy(false);
      toast.error(error instanceof Error ? error.message : "Unable to create your account.");
      return;
    }
  }

  if (sentTo) {
    return (
      <AuthShell title="Check your email">
        <div className="text-center">
          <MailCheck className="mx-auto size-14 text-mint" />
          <p className="mt-4 text-muted-foreground">We sent a confirmation link to <strong className="text-foreground">{sentTo}</strong>. Click it to activate your account, then sign in.</p>
          {isOrg && <p className="mt-3 text-sm text-muted-foreground">Your {role === "school_admin" ? "school" : "centre"} is already set up and live. Once you've confirmed your email, sign in to go straight to your dashboard.</p>}
          <Button asChild variant="outline" className="mt-6"><Link to="/login">Back to sign in</Link></Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" text="Students, parents, partner schools and franchise centres can sign up here. Teacher accounts are created by their school or centre.">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">I am a</legend>
          <div className="grid grid-cols-2 gap-3">
            {([["student", "Student", GraduationCap], ["parent", "Parent", Users], ["school_admin", "School Admin", Building2], ["franchise", "Franchise Partner", Store]] as const).map(([val, label, Icon]) => (
              <button
                key={val}
                type="button"
                aria-pressed={role === val}
                onClick={() => form.setValue("role", val, { shouldValidate: form.formState.isSubmitted })}
                className={cn("flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border-2 p-3 text-sm font-semibold transition", role === val ? "border-primary bg-primary/5 text-primary" : "hover:border-primary/50")}
              >
                <Icon className="size-5" /> {label}
              </button>
            ))}
          </div>
        </fieldset>
        {isOrg && (
          <div className="space-y-4 rounded-2xl border bg-secondary/40 p-4">
            <FormField label={role === "school_admin" ? "School name" : "Centre name"} htmlFor="org_name" error={form.formState.errors.org_name?.message}>
              <Input id="org_name" autoComplete="organization" placeholder={role === "school_admin" ? "e.g. Delhi Public School, Pune" : "e.g. AIKIDZ Koramangala"} {...form.register("org_name")} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="City" htmlFor="city" error={form.formState.errors.city?.message}>
                <Input id="city" autoComplete="address-level2" {...form.register("city")} />
              </FormField>
              <FormField label="State" htmlFor="state" error={form.formState.errors.state?.message}>
                <Input id="state" autoComplete="address-level1" {...form.register("state")} />
              </FormField>
            </div>
            <p className="text-xs text-muted-foreground">We create your {role === "school_admin" ? "school" : "centre"} with this account as its admin. It's live as soon as you sign in.</p>
          </div>
        )}
        <FormField label={isOrg ? "Your full name" : "Full name"} htmlFor="full_name" error={form.formState.errors.full_name?.message}>
          <Input id="full_name" autoComplete="name" {...form.register("full_name")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
          </FormField>
          <FormField label={isOrg ? "Phone" : "Phone (optional)"} htmlFor="phone" error={form.formState.errors.phone?.message}>
            <Input id="phone" type="tel" autoComplete="tel" {...form.register("phone")} />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Password" htmlFor="password" error={form.formState.errors.password?.message}>
            <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
          </FormField>
          <FormField label="Confirm password" htmlFor="confirm" error={form.formState.errors.confirm?.message}>
            <Input id="confirm" type="password" autoComplete="new-password" {...form.register("confirm")} />
          </FormField>
        </div>
        <Button type="submit" variant="brand" size="lg" className="w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : "Create account"}</Button>
        <p className="text-center text-xs text-muted-foreground">By signing up you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy-policy" className="underline">Privacy Policy</Link>.</p>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account? <Link to="/login" search={search.redirect ? { redirect: search.redirect } : {}} className="font-semibold text-primary hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
