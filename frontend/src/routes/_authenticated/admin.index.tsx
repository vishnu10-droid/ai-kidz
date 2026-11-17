import { createFileRoute, redirect } from "@tanstack/react-router";

/** `/admin` opens the overview dashboard. */
export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/dashboard" });
  },
});
