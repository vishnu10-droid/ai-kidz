import { createFileRoute } from "@tanstack/react-router";
import { OrgWorkspace } from "@/components/dash/OrgWorkspace";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/franchise/dashboard")({
  head: () => ({
    meta: [
      ...pageMeta(
        "Franchise Dashboard",
        "Your AIKIDZ centre: batches, teachers, enquiries and revenue.",
      ),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <OrgWorkspace kind="franchise" />,
});
