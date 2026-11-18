import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  IndianRupee,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardShell, Panel, StatCard } from "@/components/dash/DashboardShell";
import { ConfirmDialog, FormDialog } from "@/components/dash/DashKit";
import { LoadingRows } from "@/components/dash/DashSections";
import { DataTable } from "@/components/dash/DataTable";
import { Button } from "@/components/ui/button";
import { dashQuery, dateLabel, money, patch, post, remove } from "@/lib/dash.api";
import { img } from "@/lib/images";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/courses")({
  head: () => ({
    meta: [
      ...pageMeta("Courses", "Manage every AIKIDZ course, price and publishing state."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCourses,
});

/* ------------------------------------------------------------------ types */

type CourseCategory = { id: string; name: string; slug: string };

type AdminCourse = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  image_url: string | null;
  age_group: string | null;
  duration: string | null;
  level: string;
  price: number;
  syllabus: string[];
  is_published: boolean;
  category: CourseCategory | null;
  category_id: string | null;
  modules: number;
  lessons: number;
  createdAt: string | null;
};

const LEVELS = [
  { label: "Beginner", value: "Beginner" },
  { label: "Intermediate", value: "Intermediate" },
  { label: "Advanced", value: "Advanced" },
];

function coursePayload(values: Record<string, string>) {
  return {
    title: values["title"],
    slug: values["slug"] || undefined,
    short_description: values["short_description"] || undefined,
    description: values["description"] || undefined,
    category: values["category"] || undefined,
    price: Number(values["price"] || 0),
    level: values["level"] || "Beginner",
    age_group: values["age_group"] || undefined,
    duration: values["duration"] || undefined,
    image_url: values["image_url"] || img.programRobotics,
    syllabus: values["syllabus"] || "",
    is_published: values["is_published"] !== "draft",
  };
}

function courseFields(categories: CourseCategory[], course?: AdminCourse | null) {
  return [
    { name: "title", label: "Course title", required: true, placeholder: "e.g. Robotics Starter Kit", defaultValue: course?.title ?? "" },
    {
      name: "slug",
      label: "URL slug",
      placeholder: "auto-generated from the title",
      hint: "Leave blank to generate automatically.",
      defaultValue: course?.slug ?? "",
    },
    {
      name: "category",
      label: "Category",
      type: "select" as const,
      options: categories.map((c) => ({ label: c.name, value: c.slug })),
      defaultValue: course?.category?.slug ?? "",
    },
    { name: "price", label: "Price (₹)", type: "number" as const, min: 0, required: true, defaultValue: String(course?.price ?? 0) },
    {
      name: "level",
      label: "Level",
      type: "select" as const,
      options: LEVELS,
      defaultValue: course?.level ?? "Beginner",
    },
    { name: "age_group", label: "Age group", placeholder: "6-9 yrs", defaultValue: course?.age_group ?? "" },
    { name: "duration", label: "Duration", placeholder: "8 weeks", defaultValue: course?.duration ?? "" },
    { name: "short_description", label: "Short description", type: "textarea" as const, defaultValue: course?.short_description ?? "" },
    { name: "description", label: "Full description", type: "textarea" as const, defaultValue: course?.description ?? "" },
    { name: "image_url", label: "Cover image URL", defaultValue: course?.image_url ?? img.programRobotics },
    {
      name: "syllabus",
      label: "Syllabus",
      type: "textarea" as const,
      hint: "One topic per line — shown on the public course page.",
      defaultValue: course?.syllabus.join("\n") ?? "",
    },
    {
      name: "is_published",
      label: "Visibility",
      type: "select" as const,
      options: [
        { label: "Published — visible on the website", value: "published" },
        { label: "Draft — hidden from the website", value: "draft" },
      ],
      defaultValue: course?.is_published === false ? "draft" : "published",
    },
  ];
}

/* ------------------------------------------------------------------- page */

function AdminCourses() {
  const qc = useQueryClient();
  const courses = useQuery(dashQuery<AdminCourse[]>(["admin", "courses"], "/api/admin/courses"));
  const categories = useQuery(
    dashQuery<CourseCategory[]>(["admin", "course-categories"], "/api/admin/courses/categories"),
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCourse | null>(null);
  const [deleting, setDeleting] = useState<AdminCourse | null>(null);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "courses"] });
    void qc.invalidateQueries({ queryKey: ["admin", "overview"] });
  };

  async function createCourse(values: Record<string, string>) {
    await post("/api/admin/courses", coursePayload(values));
    toast.success("Course added — it's live in the catalogue");
    refresh();
  }

  async function saveCourse(values: Record<string, string>) {
    if (!editing) return;
    await patch(`/api/admin/courses/${editing.id}`, coursePayload(values));
    toast.success("Course updated");
    setEditing(null);
    refresh();
  }

  async function togglePublish(course: AdminCourse) {
    try {
      await patch(`/api/admin/courses/${course.id}`, { is_published: !course.is_published });
      toast.success(course.is_published ? "Course moved to draft" : "Course published");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the course");
    }
  }

  const rows = courses.data ?? [];
  const cats = categories.data ?? [];
  const published = rows.filter((course) => course.is_published).length;
  const lessons = rows.reduce((total, course) => total + course.lessons, 0);
  const avgPrice = rows.length
    ? Math.round(rows.reduce((total, course) => total + course.price, 0) / rows.length)
    : 0;

  return (
    <DashboardShell
      role="admin"
      title="Courses"
      subtitle="Every AIKIDZ programme — add, edit, publish or retire courses from one place."
      actions={
        <>
          <Button variant="outline" size="sm" className="rounded-full" onClick={refresh}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button variant="brand" size="sm" className="rounded-full" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Add course
          </Button>
        </>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total courses" value={rows.length} icon={BookOpen} />
        <StatCard label="Published" value={published} icon={Eye} tone="mint" />
        <StatCard label="Drafts" value={rows.length - published} icon={EyeOff} tone="sun" />
        <StatCard label="Average price" value={money(avgPrice)} icon={IndianRupee} tone="violet" />
      </div>

      <Panel
        title="Course catalogue"
        description="Changes here appear instantly on the public courses page."
      >
        {courses.isLoading || categories.isLoading ? (
          <LoadingRows label="Loading courses" />
        ) : (
          <DataTable
            rows={rows}
            columns={[
              {
                id: "course",
                header: "Course",
                cell: (course: AdminCourse) => (
                  <div className="flex min-w-0 items-center gap-3">
                    {course.image_url ? (
                      <img
                        src={course.image_url}
                        alt=""
                        className="size-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <BookOpen className="size-4" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{course.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        /{course.slug} · {course.category?.name ?? "Uncategorised"}
                      </p>
                    </div>
                  </div>
                ),
                sortValue: (course: AdminCourse) => course.title,
              },
              {
                id: "price",
                header: "Price",
                align: "right" as const,
                cell: (course: AdminCourse) => (
                  <span className="font-semibold tabular-nums">{money(course.price)}</span>
                ),
                sortValue: (course: AdminCourse) => course.price,
              },
              {
                id: "level",
                header: "Level",
                cell: (course: AdminCourse) => (
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{course.level}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {course.age_group ?? "All ages"} · {course.duration ?? "Self paced"}
                    </p>
                  </div>
                ),
                sortValue: (course: AdminCourse) => course.level,
              },
              {
                id: "content",
                header: "Content",
                align: "right" as const,
                cell: (course: AdminCourse) => (
                  <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                    <Layers className="size-3.5" /> {course.modules}
                    <GraduationCap className="ml-1 size-3.5" /> {course.lessons}
                  </div>
                ),
                sortValue: (course: AdminCourse) => course.lessons,
              },
              {
                id: "status",
                header: "Status",
                cell: (course: AdminCourse) => (
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      course.is_published
                        ? "bg-mint/15 text-[#177767]"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {course.is_published ? "Published" : "Draft"}
                  </span>
                ),
                sortValue: (course: AdminCourse) => (course.is_published ? "published" : "draft"),
              },
              {
                id: "created",
                header: "Added",
                cell: (course: AdminCourse) => (
                  <span className="text-xs text-muted-foreground">{dateLabel(course.createdAt)}</span>
                ),
                sortValue: (course: AdminCourse) => course.createdAt ?? "",
              },
            ]}
            rowKey={(course) => course.id}
            searchFields={(course) => [
              course.title,
              course.slug,
              course.short_description,
              course.category?.name,
              course.level,
            ]}
            searchPlaceholder="Search courses, slugs or categories…"
            filters={[
              {
                id: "status",
                label: "Status",
                options: [
                  { label: "Published", value: "published" },
                  { label: "Draft", value: "draft" },
                ],
                match: (course, value) =>
                  value === "published" ? course.is_published : !course.is_published,
              },
              {
                id: "category",
                label: "Category",
                options: cats.map((category) => ({ label: category.name, value: category.slug })),
                match: (course, value) => course.category?.slug === value,
              },
            ]}
            empty="No courses yet — add your first course."
            actions={(course) => [
              { label: "Edit course", icon: Pencil, onSelect: (row) => setEditing(row) },
              {
                label: course.is_published ? "Move to draft" : "Publish course",
                icon: course.is_published ? EyeOff : Eye,
                onSelect: (row) => void togglePublish(row),
              },
              {
                label: "Delete course",
                icon: Trash2,
                destructive: true,
                onSelect: (row) => setDeleting(row),
              },
            ]}
          />
        )}
      </Panel>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Add a course"
        description="It appears on the public courses page as soon as you save."
        fields={courseFields(cats)}
        submitLabel="Add course"
        onSubmit={createCourse}
      />

      <FormDialog
        open={Boolean(editing)}
        onOpenChange={(change) => !change && setEditing(null)}
        title={`Edit · ${editing?.title ?? "course"}`}
        description="Update the details, price or publishing state."
        fields={courseFields(cats, editing)}
        submitLabel="Save changes"
        onSubmit={saveCourse}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(change) => !change && setDeleting(null)}
        title={`Delete ${deleting?.title ?? "course"}?`}
        description="The course and its modules/lessons are removed. Existing enrolments stay in the database."
        onConfirm={async () => {
          if (!deleting) return;
          await remove(`/api/admin/courses/${deleting.id}`);
          toast.success("Course deleted");
          setDeleting(null);
          refresh();
        }}
      />
    </DashboardShell>
  );
}
