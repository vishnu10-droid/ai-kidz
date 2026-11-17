import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/site/AuthShell";
import { FormField } from "@/components/site/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { destinationAfterLogin, takeRememberedRedirect } from "@/lib/post-login";
import { login, saveAuthToken } from "@/lib/api";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => (typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {}),
  head: () => ({ meta: pageMeta("Sign In", "Sign in to your AIKIDZ account to continue learning, track progress and manage orders.") }),
  component: Login,
});

const schema = z.object({ email: z.string().trim().email("Enter a valid email"), password: z.string().min(1, "Enter your password") });

function Login() {
  const search = Route.useSearch();
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  // Already signed in (or just came back from Google): send them on.
  useEffect(() => {
    if (loading || !user) return;
    const requested = search.redirect ?? takeRememberedRedirect();
    void destinationAfterLogin(user.id, requested).then((href) => router.navigate({ href, replace: true }));
  }, [user, loading, search.redirect, router]);

  async function onSubmit(v: z.infer<typeof schema>) {
    setBusy(true);
    try {
      const result = await login(v.email, v.password);
      saveAuthToken(result.token);
      await refresh();
      toast.success("Welcome back!");
    } catch {
      toast.error("Wrong email or password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" text="Sign in to continue learning.">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        </FormField>
        <FormField label="Password" htmlFor="password" error={form.formState.errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
        </FormField>
        <div className="text-right text-sm"><Link to="/forgot-password" className="font-medium text-primary hover:underline">Forgot password?</Link></div>
        <Button type="submit" variant="brand" size="lg" className="w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : "Sign in"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to AIKIDZ? <Link to="/register" search={search.redirect ? { redirect: search.redirect } : {}} className="font-semibold text-primary hover:underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}
