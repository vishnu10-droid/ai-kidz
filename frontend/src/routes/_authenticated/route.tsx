import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authToken } from "@/lib/api";

/** Read the `id` claim from our JWT payload; the API verifies the signature on every request. */
function userIdFromToken(token: string): string {
  try {
    const payload = token.split(".")[1];
    if (!payload) return "";
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const parsed = JSON.parse(atob(padded)) as { id?: unknown };
    return typeof parsed.id === "string" ? parsed.id : "";
  } catch {
    return "";
  }
}

// Signed-in area. Sessions live in browser storage, so this gate runs only in the browser.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const token = authToken();
    if (!token) throw redirect({ to: "/login", search: { redirect: location.href } });
    return { userId: userIdFromToken(token) };
  },
  component: () => <Outlet />,
});
