import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardShell, Panel, StatCard } from "@/components/dash/DashboardShell";
import { ConfirmDialog, FormDialog } from "@/components/dash/DashKit";
import { LoadingRows } from "@/components/dash/DashSections";
import { DataTable } from "@/components/dash/DataTable";
import { Button } from "@/components/ui/button";
import { dashQuery, dateLabel, patch, post, remove } from "@/lib/dash.api";
import { img } from "@/lib/images";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/blogs")({
  head: () => ({
    meta: [
      ...pageMeta("Blogs", "Write and publish AIKIDZ stories, guides and news."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminBlogs,
});

type BlogRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  category: string;
  author: string;
  tags: string[];
  is_published: boolean;
  published_at: string;
  read_minutes: number;
  views: number;
  createdAt: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);

function blogPayload(values: Record<string, string>) {
  return {
    title: values["title"],
    slug: values["slug"] || undefined,
    excerpt: values["excerpt"] || undefined,
    content: values["content"] || "",
    cover_image: values["cover_image"] || img.heroKidsRobotics,
    category: values["category"] || "News",
    author: values["author"] || "AIKIDZ Team",
    tags: values["tags"] || "",
    read_minutes: Number(values["read_minutes"] || 4),
    published_at: values["published_at"] ? new Date(values["published_at"]).toISOString() : undefined,
    is_published: values["is_published"] !== "draft",
  };
}

function blogFields(row?: BlogRow | null) {
  return [
    { name: "title", label: "Title", required: true, placeholder: "A catchy headline", defaultValue: row?.title ?? "" },
    {
      name: "slug",
      label: "URL slug",
      placeholder: "auto-generated from the title",
      hint: "Leave blank to generate automatically.",
      defaultValue: row?.slug ?? "",
    },
    { name: "category", label: "Category", required: true, placeholder: "e.g. Robotics", defaultValue: row?.category ?? "Robotics" },
    { name: "author", label: "Author", defaultValue: row?.author ?? "AIKIDZ Team" },
    { name: "excerpt", label: "Short summary", type: "textarea" as const, defaultValue: row?.excerpt ?? "" },
    { name: "content", label: "Article body", type: "textarea" as const, hint: "Separate paragraphs with a blank line.", defaultValue: row?.content ?? "" },
    { name: "cover_image", label: "Cover image URL", defaultValue: row?.cover_image ?? img.heroKidsRobotics },
    { name: "tags", label: "Tags", hint: "Comma separated — robotics, STEM, parents", defaultValue: row?.tags.join(", ") ?? "" },
    { name: "read_minutes", label: "Read time (minutes)", type: "number" as const, min: 1, defaultValue: String(row?.read_minutes ?? 4) },
    { name: "published_at", label: "Publish date", type: "date" as const, defaultValue: row?.published_at.slice(0, 10) ?? today() },
    {
      name: "is_published",
      label: "Visibility",
      type: "select" as const,
      options: [
        { label: "Published — visible on the blog", value: "published" },
        { label: "Draft — hidden from the blog", value: "draft" },
      ],
      defaultValue: row?.is_published === false ? "draft" : "published",
    },
  ];
}

function AdminBlogs() {
  const qc = useQueryClient();
  const blogs = useQuery(dashQuery<BlogRow[]>(["admin", "blogs"], "/api/admin/blogs"));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BlogRow | null>(null);
  const [deleting, setDeleting] = useState<BlogRow | null>(null);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin", "blogs"] });

  async function createBlog(values: Record<string, string>) {
    await post("/api/admin/blogs", blogPayload(values));
    toast.success("Blog post published");
    refresh();
  }

  async function saveBlog(values: Record<string, string>) {
    if (!editing) return;
    await patch(`/api/admin/blogs/${editing.id}`, blogPayload(values));
    toast.success("Blog post updated");
    setEditing(null);
    refresh();
  }

  async function togglePublish(row: BlogRow) {
    try {
      await patch(`/api/admin/blogs/${row.id}`, { is_published: !row.is_published });
      toast.success(row.is_published ? "Moved to draft" : "Post published");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the post");
    }
  }

  const rows = blogs.data ?? [];
  const published = rows.filter((row) => row.is_published).length;
  const views = rows.reduce((total, row) => total + row.views, 0);
  const categories = [...new Set(rows.map((row) => row.category))].sort();

  return (
    <DashboardShell
      role="admin"
      title="Blogs"
      subtitle="Stories, guides and news — published straight to the AIKIDZ journal."
      actions={
        <>
          <Button variant="outline" size="sm" className="rounded-full" onClick={refresh}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button variant="brand" size="sm" className="rounded-full" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Add blog
          </Button>
        </>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total posts" value={rows.length} icon={FileText} />
        <StatCard label="Published" value={published} icon={Eye} tone="mint" />
        <StatCard label="Drafts" value={rows.length - published} icon={EyeOff} tone="sun" />
        <StatCard label="Total views" value={views} icon={Users} tone="violet" />
      </div>

      <Panel title="Journal posts" description="Published posts appear instantly on the public blog.">
        {blogs.isLoading ? (
          <LoadingRows label="Loading blog posts" />
        ) : (
          <DataTable
            rows={rows}
            columns={[
              {
                id: "title",
                header: "Article",
                cell: (row: BlogRow) => (
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={row.cover_image || img.heroKidsRobotics}
                      alt=""
                      className="size-10 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{row.title}</p>
                      <p className="truncate text-xs text-muted-foreground">/{row.slug}</p>
                    </div>
                  </div>
                ),
                sortValue: (row: BlogRow) => row.title,
              },
              {
                id: "category",
                header: "Category",
                cell: (row: BlogRow) => (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {row.category}
                  </span>
                ),
                sortValue: (row: BlogRow) => row.category,
              },
              {
                id: "author",
                header: "Author / date",
                cell: (row: BlogRow) => (
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{row.author}</p>
                    <p className="text-[11px] text-muted-foreground">{dateLabel(row.published_at)}</p>
                  </div>
                ),
                sortValue: (row: BlogRow) => row.author,
              },
              {
                id: "views",
                header: "Views",
                align: "right" as const,
                cell: (row: BlogRow) => <span className="tabular-nums">{row.views}</span>,
                sortValue: (row: BlogRow) => row.views,
              },
              {
                id: "status",
                header: "Status",
                cell: (row: BlogRow) => (
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      row.is_published ? "bg-mint/15 text-[#177767]" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {row.is_published ? "Published" : "Draft"}
                  </span>
                ),
                sortValue: (row: BlogRow) => (row.is_published ? "published" : "draft"),
              },
            ]}
            rowKey={(row) => row.id}
            searchFields={(row) => [row.title, row.slug, row.excerpt, row.category, row.author, ...row.tags]}
            searchPlaceholder="Search posts, authors or tags…"
            filters={[
              {
                id: "status",
                label: "Status",
                options: [
                  { label: "Published", value: "published" },
                  { label: "Draft", value: "draft" },
                ],
                match: (row, value) => (value === "published" ? row.is_published : !row.is_published),
              },
              {
                id: "category",
                label: "Category",
                options: categories.map((category) => ({ label: category, value: category })),
                match: (row, value) => row.category === value,
              },
            ]}
            empty="No blog posts yet — write your first story."
            actions={(row) => [
              { label: "Edit post", icon: Pencil, onSelect: (item) => setEditing(item) },
              {
                label: row.is_published ? "Move to draft" : "Publish post",
                icon: row.is_published ? EyeOff : Eye,
                onSelect: (item) => void togglePublish(item),
              },
              {
                label: "Delete post",
                icon: Trash2,
                destructive: true,
                onSelect: (item) => setDeleting(item),
              },
            ]}
          />
        )}
      </Panel>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Write a blog post"
        description="It appears on the public journal as soon as you save."
        fields={blogFields()}
        submitLabel="Publish post"
        onSubmit={createBlog}
      />

      <FormDialog
        open={Boolean(editing)}
        onOpenChange={(change) => !change && setEditing(null)}
        title={`Edit · ${editing?.title ?? "post"}`}
        description="Update the story, image or publishing state."
        fields={blogFields(editing)}
        submitLabel="Save changes"
        onSubmit={saveBlog}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(change) => !change && setDeleting(null)}
        title={`Delete ${deleting?.title ?? "post"}?`}
        description="The article is permanently removed from the journal."
        onConfirm={async () => {
          if (!deleting) return;
          await remove(`/api/admin/blogs/${deleting.id}`);
          toast.success("Blog post deleted");
          setDeleting(null);
          refresh();
        }}
      />
    </DashboardShell>
  );
}
