import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight, Clock, Heart, ShoppingCart, Signal, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { discountPercent, formatINR } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export type ProductLite = {
  id: string;
  slug: string;
  name: string;
  short_description?: string | null;
  price: number;
  mrp: number;
  rating: number;
  reviews_count?: number;
  image_url: string | null;
  age_group?: string | null;
  product_categories?: { name: string; slug: string } | null;
};

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-3.5", i <= Math.round(value) ? "fill-sun text-sun" : "text-border")} />
      ))}
    </span>
  );
}

export function ProductCard({ product }: { product: ProductLite }) {
  const { add, wishlist, toggleWishlist } = useCart();
  const price = Number(product.price);
  const mrp = Number(product.mrp);
  const off = discountPercent(price, mrp);
  const saved = wishlist.includes(product.id);
  return (
    <motion.article whileHover={{ y: -6 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="glow-card group flex h-full flex-col overflow-hidden rounded-3xl border bg-card shadow-soft">
      <div className="relative m-2 aspect-square overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-secondary via-muted to-accent/60">
        <Link to="/shop/$slug" params={{ slug: product.slug }} aria-label={product.name}>
          <img src={product.image_url ?? ""} alt={product.name} loading="lazy" width={1024} height={1024} className="size-full object-cover mix-blend-multiply transition-transform duration-700 ease-out group-hover:scale-[1.06]" />
        </Link>
        {off > 0 && <span className="absolute left-3 top-3 rounded-full bg-sun px-2.5 py-1 text-[11px] font-bold tracking-wide text-sun-foreground shadow-soft">{off}% OFF</span>}
        <button
          type="button"
          onClick={() => toggleWishlist(product.id, product.name)}
          aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={saved}
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-surface/90 shadow-soft backdrop-blur transition hover:scale-110"
        >
          <Heart className={cn("size-4", saved ? "fill-destructive text-destructive" : "text-foreground")} />
        </button>
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-3">
        {product.product_categories && <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">{product.product_categories.name}</span>}
        <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug">
          <Link to="/shop/$slug" params={{ slug: product.slug }} className="hover:text-primary">{product.name}</Link>
        </h3>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Stars value={Number(product.rating)} />
          {Number(product.rating).toFixed(1)}
          {product.reviews_count ? <span>({product.reviews_count})</span> : null}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-display text-xl font-bold">{formatINR(price)}</span>
          {mrp > price && <span className="text-sm text-muted-foreground line-through">{formatINR(mrp)}</span>}
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
          <Button size="sm" className="h-9" onClick={() => add({ productId: product.id, slug: product.slug, name: product.name, price, mrp, image: product.image_url })}>
            <ShoppingCart /> Add to Cart
          </Button>
          <Button asChild size="sm" variant="outline" className="h-9">
            <Link to="/shop/$slug" params={{ slug: product.slug }}>Details</Link>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

export type CourseLite = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  image_url: string | null;
  age_group: string | null;
  duration: string | null;
  level: string;
  price?: number;
  course_categories?: { name: string; slug: string } | null;
};

export function CourseCard({ course, showFee = true }: { course: CourseLite; showFee?: boolean }) {
  return (
    <motion.article whileHover={{ y: -6 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="glow-card group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card shadow-soft">
      <div className="relative m-2 aspect-[16/10] overflow-hidden rounded-[1.25rem]">
        <img src={course.image_url ?? ""} alt="" loading="lazy" width={1280} height={960} className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/40 via-transparent to-transparent" aria-hidden />
        {course.course_categories?.name && <span className="absolute left-3 top-3 rounded-full bg-surface/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary shadow-soft backdrop-blur">{course.course_categories.name}</span>}
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-3">
        <h3 className="font-display text-lg font-semibold leading-snug">
          <Link to="/courses/$slug" params={{ slug: course.slug }} className="after:absolute after:inset-0 focus-visible:outline-none">{course.title}</Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{course.short_description}</p>
        <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
          {course.age_group && <span className="inline-flex items-center gap-1 rounded-full border bg-muted/60 px-2.5 py-1 font-medium text-foreground/80"><Users className="size-3 text-primary" />{course.age_group}</span>}
          {course.duration && <span className="inline-flex items-center gap-1 rounded-full border bg-muted/60 px-2.5 py-1 font-medium text-foreground/80"><Clock className="size-3 text-violet" />{course.duration}</span>}
          <span className="inline-flex items-center gap-1 rounded-full border bg-muted/60 px-2.5 py-1 font-medium capitalize text-foreground/80"><Signal className="size-3 text-sun" />{course.level}</span>
        </div>
        <div className={cn("mt-auto flex items-center border-t border-dashed pt-4", showFee ? "justify-between" : "justify-end")}>
          {showFee && (course.price === undefined || course.price === null ? (
            <span />
          ) : Number(course.price) > 0 ? (
            <span className="flex flex-col leading-tight"><span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Course fee</span><span className="font-display text-lg font-bold">{formatINR(Number(course.price))}</span></span>
          ) : (
            <span className="text-sm font-semibold text-mint">Free</span>
          ))}
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3.5 py-2 text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            View Course <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </motion.article>
  );
}
