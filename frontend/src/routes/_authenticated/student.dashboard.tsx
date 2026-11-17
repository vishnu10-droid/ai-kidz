import { createFileRoute } from "@tanstack/react-router";
import { StudentHub } from "@/components/dash/StudentHub";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/student/dashboard")({
  head: () => ({
    meta: [
      ...pageMeta(
        "Student Dashboard",
        "Your gamified AIKIDZ robotics hub: XP, streaks, badges, live classes and DIY projects.",
      ),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <StudentHub />,
});
