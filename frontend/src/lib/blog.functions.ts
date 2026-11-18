import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Public blog reads go through the Express API so pages render on the server. */
const API_BASE = (
  process.env["API_URL"] ||
  process.env["VITE_API_URL"] ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Blog request failed (${response.status}) for ${path}`);
  return (await response.json()) as T;
}

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  category: string;
  author: string;
  tags: string[];
  published_at: string;
  read_minutes: number;
  views: number;
};

export type BlogPostDetail = BlogPost & { content: string };

export const listBlogs = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const data = await apiGet<{ posts: BlogPost[]; categories: string[] }>("/blogs");
    return { posts: data.posts ?? [], categories: data.categories ?? [] };
  } catch (error) {
    console.error("[blogs] listBlogs:", error);
    return { posts: [] as BlogPost[], categories: [] as string[] };
  }
});

export const getBlog = createServerFn({ method: "GET" })
  .validator((d) => z.object({ slug: z.string().min(1).max(160) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const result = await apiGet<{ post: BlogPostDetail | null; related: BlogPost[] }>(
        `/blogs/${encodeURIComponent(data.slug)}`,
      );
      return { post: result.post ?? null, related: result.related ?? [] };
    } catch (error) {
      console.error("[blogs] getBlog:", error);
      return { post: null as BlogPostDetail | null, related: [] as BlogPost[] };
    }
  });
