import { createFileRoute, redirect } from "@tanstack/react-router";

/** Enquiries now live inside the centre workspace as a deep-linked tab. */
export const Route = createFileRoute("/_authenticated/franchise/enquiries")({
  beforeLoad: () => {
    throw redirect({ href: "/franchise/dashboard?tab=enquiries" });
  },
  component: () => null,
});
