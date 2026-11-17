import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public catalogue reads, served by the AIKIDZ Express API.
 * Server-side requests use API_URL (see frontend/.env); VITE_API_URL is the
 * fallback for local development.
 */
const API_BASE = (
  process.env["API_URL"] ||
  process.env["VITE_API_URL"] ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Catalog request failed (${response.status}) for ${path}`);
  return (await response.json()) as T;
}

export type CatalogCategory = { name: string; slug: string };

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  price: number;
  mrp: number;
  rating: number;
  reviews_count: number;
  age_group: string | null;
  image_url: string | null;
  is_featured: boolean;
  created_at: string;
  product_categories: CatalogCategory | null;
};

export type CatalogProductDetail = CatalogProduct & {
  description: string | null;
  specifications: Record<string, string>;
  box_contents: string[];
  product_images: { url: string; position: number }[];
  inventory: { stock: number };
};

export type CatalogCourse = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  image_url: string | null;
  age_group: string | null;
  duration: string | null;
  level: string;
  price: number;
  course_categories: CatalogCategory | null;
};

export type CatalogCourseDetail = CatalogCourse & {
  description: string | null;
  course_modules: {
    id: string;
    title: string;
    position: number;
    lessons: { id: string; title: string; duration_minutes: number | null; position: number }[];
  }[];
};

export const listProducts = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const data = await apiGet<{ products: CatalogProduct[]; categories: CatalogCategory[] }>("/products");
    return { products: data.products ?? [], categories: data.categories ?? [] };
  } catch (error) {
    console.error("[catalog] listProducts:", error);
    return { products: [], categories: [] };
  }
});

export const getProduct = createServerFn({ method: "GET" })
  .validator((d) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const result = await apiGet<{ product: CatalogProductDetail | null; related: CatalogProduct[] }>(
        `/products/${encodeURIComponent(data.slug)}`,
      );
      return { product: result.product ?? null, related: result.related ?? [] };
    } catch (error) {
      console.error("[catalog] getProduct:", error);
      return { product: null, related: [] };
    }
  });

export const listCourses = createServerFn({ method: "GET" })
  .validator((d) => z.object({ category: z.string().max(60).optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    try {
      const query = data.category ? `?category=${encodeURIComponent(data.category)}` : "";
      return await apiGet<CatalogCourse[]>(`/courses${query}`);
    } catch (error) {
      console.error("[catalog] listCourses:", error);
      return [] as CatalogCourse[];
    }
  });

export const getCourse = createServerFn({ method: "GET" })
  .validator((d) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    try {
      return await apiGet<CatalogCourseDetail>(`/courses/${encodeURIComponent(data.slug)}`);
    } catch (error) {
      console.error("[catalog] getCourse:", error);
      return null;
    }
  });
