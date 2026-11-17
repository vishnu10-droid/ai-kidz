import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authToken } from "@/lib/api";

// Signed-in area. Sessions live in browser storage, so this gate runs only in the browser.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (!authToken()) throw redirect({ to: "/login", search: { redirect: location.href } });
    return {};
  },
  component: () => <Outlet />,
});
