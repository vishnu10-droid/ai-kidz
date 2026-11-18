import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Clock3, Eye } from "lucide-react";
import { PageHero } from "@/components/site/Section";
import { img } from "@/lib/images";
import { blogQuery } from "@/lib/queries";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/blog/$slug")({
  head: () => ({ meta: pageMeta("AIKIDZ Journal", "Stories from the AIKIDZ classroom.") }),
  loader: ({ params, context }) => context.queryClient.ensureQueryData(blogQuery(params.slug)),
  component: BlogDetail,
});

const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

function BlogDetail() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(blogQuery(slug));
  const post = data.post;
  if (!post) throw notFound();

  const paragraphs = post.content.split(/\n\s*\n/).filter(Boolean);

  return (
    <>
      <PageHero
        eyebrow={post.category}
        title={post.title}
        text={post.excerpt ?? undefined}
        crumbs={[
          { label: "Blog", to: "/blog" },
          { label: post.title },
        ]}
      />

      <article className="container-page py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="size-4" /> All stories
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{post.author}</span>
            <span aria-hidden>·</span>
            <span>{dateLabel(post.published_at)}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-4" /> {post.read_minutes} min read
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Eye className="size-4" /> {post.views} views
            </span>
          </div>

          <img
            src={post.cover_image || img.heroKidsRobotics}
            alt=""
            className="mt-8 aspect-[16/9] w-full rounded-3xl border border-border/70 object-cover shadow-lift"
          />

          <div className="mt-10 space-y-6 text-lg leading-[1.85] text-foreground/85">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {post.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-surface/60 px-3 py-1 text-xs font-semibold text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {data.related.length > 0 && (
          <section className="mx-auto mt-20 max-w-5xl border-t border-border/70 pt-12">
            <h2 className="font-display text-2xl font-bold">Keep reading</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {data.related.map((item) => (
                <Link
                  key={item.id}
                  to="/blog/$slug"
                  params={{ slug: item.slug }}
                  className="group rounded-2xl border border-border/70 bg-surface/60 p-5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
                    {item.category}
                  </span>
                  <h3 className="mt-2 font-semibold leading-snug group-hover:text-primary">
                    {item.title}
                  </h3>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    Read story <ArrowUpRight className="size-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
