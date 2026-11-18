import { queryOptions } from "@tanstack/react-query";
import { getCourse, getProduct, listCourses, listProducts } from "./catalog.functions";
import { getBlog, listBlogs } from "./blog.functions";

export const productsQuery = () => queryOptions({ queryKey: ["products"], queryFn: () => listProducts(), staleTime: 60_000 });
export const productQuery = (slug: string) =>
  queryOptions({ queryKey: ["product", slug], queryFn: () => getProduct({ data: { slug } }), staleTime: 60_000 });
export const coursesQuery = (category?: string) =>
  queryOptions({ queryKey: ["courses", category ?? "all"], queryFn: () => listCourses({ data: { category } }), staleTime: 60_000 });
export const courseQuery = (slug: string) =>
  queryOptions({ queryKey: ["course", slug], queryFn: () => getCourse({ data: { slug } }), staleTime: 60_000 });
export const blogsQuery = () =>
  queryOptions({ queryKey: ["blogs"], queryFn: () => listBlogs(), staleTime: 60_000 });
export const blogQuery = (slug: string) =>
  queryOptions({ queryKey: ["blog", slug], queryFn: () => getBlog({ data: { slug } }), staleTime: 60_000 });
