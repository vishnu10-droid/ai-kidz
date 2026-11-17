import { createFileRoute } from "@tanstack/react-router";
import { OrgWorkspace } from "@/components/dash/OrgWorkspace";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/school/dashboard")({
  head: () => ({
    meta: [
      ...pageMeta("School Dashboard", "Your school's AIKIDZ classes, batches and learners."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <OrgWorkspace kind="school" />,
});
