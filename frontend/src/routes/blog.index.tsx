import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight, Clock3, Eye, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHero } from "@/components/site/Section";
import { Stagger, StaggerItem } from "@/components/site/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { img } from "@/lib/images";
import { blogsQuery } from "@/lib/queries";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: pageMeta(
      "AIKIDZ Blog",
      "Stories, ideas and guides from the AIKIDZ robotics and coding classroom.",
    ),
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(blogsQuery()),
  component: BlogIndex,
});

const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function BlogIndex() {
  const { data } = useSuspenseQuery(blogsQuery());
  const [category, setCategory] = useState("all");
  const [term, setTerm] = useState("");

  const posts = useMemo(() => {
    const q = term.trim().toLowerCase();
    return data.posts.filter((post) => {
      const inCategory = category === "all" || post.category === category;
      const matches =
        !q ||
        [post.title, post.excerpt, post.category, ...(post.tags ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return inCategory && matches;
    });
  }, [data.posts, category, term]);

  return (
    <>
      <PageHero
        eyebrow="The AIKIDZ Journal"
        title="Stories from the classroom"
        text="Ideas, experiments and parenting guides from India's most curious STEM learners."
        crumbs={[{ label: "Blog" }]}
      />

      <section className="container-page py-16 sm:py-20">
        <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            {["all", ...data.categories].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition",
                  category === item
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface/60 text-muted-foreground hover:border-primary/40 hover:text-primary",
                )}
              >
                {item === "all" ? "All stories" : item}
              </button>
            ))}
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search articles…"
              className="pl-9"
              aria-label="Search articles"
            />
            {term && (
              <button
                type="button"
                onClick={() => setTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-3xl border border-border bg-surface/60 p-12 text-center">
            <p className="text-lg font-semibold">No stories found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try another category or search term — new articles are added by the AIKIDZ team.
            </p>
            <Button
              variant="outline"
              className="mt-5 rounded-full"
              onClick={() => {
                setCategory("all");
                setTerm("");
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <Stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <StaggerItem key={post.id}>
                <Link to="/blog/$slug" params={{ slug: post.slug }} className="group block h-full">
                  <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-surface/70 shadow-soft transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lift">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img
                        src={post.cover_image || img.heroKidsRobotics}
                        alt=""
                        className="size-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <span className="absolute left-4 top-4 rounded-full bg-surface/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary backdrop-blur">
                        {post.category}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{dateLabel(post.published_at)}</span>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="size-3.5" /> {post.read_minutes} min read
                        </span>
                      </div>
                      <h2 className="mt-3 font-display text-xl font-bold leading-snug group-hover:text-primary">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="size-3.5" /> {post.views} views
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-primary">
                          Read story <ArrowUpRight className="size-3.5" />
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </>
  );
}
