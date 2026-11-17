import { createFileRoute } from "@tanstack/react-router";
import { ParentWorkspace } from "@/components/dash/ParentWorkspace";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/parent/dashboard")({
  head: () => ({
    meta: [
      ...pageMeta("Parent Dashboard", "Attendance, fees and progress for your AIKIDZ learner."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <ParentWorkspace />,
});
