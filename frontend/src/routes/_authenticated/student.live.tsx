import { createFileRoute } from "@tanstack/react-router";
import { StudentLiveClasses } from "@/components/dash/StudentLive";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/student/live")({
  head: () => ({
    meta: [
      ...pageMeta(
        "Live Classes",
        "Join your AIKIDZ batch's live robotics and coding sessions with your mentors.",
      ),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <StudentLiveClasses />,
});
