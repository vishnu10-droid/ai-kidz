import { createFileRoute } from "@tanstack/react-router";
import { TeacherWorkspace } from "@/components/dash/TeacherWorkspace";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/teacher/dashboard")({
  head: () => ({
    meta: [
      ...pageMeta("Teacher Dashboard", "Your AIKIDZ batches, attendance, assignments and grading."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <TeacherWorkspace />,
});
