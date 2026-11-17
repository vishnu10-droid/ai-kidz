import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./motion";

type Tone = "default" | "white" | "navy" | "tint" | "mesh";

export function Section({ children, className, id, tone = "default" }: { children: ReactNode; className?: string; id?: string; tone?: Tone }) {
  return (
    <section
      id={id}
      className={cn(
        "relative py-20 sm:py-24 lg:py-28",
        tone === "white" && "bg-surface",
        tone === "navy" && "isolate overflow-hidden bg-mesh-dark text-navy-foreground",
        tone === "tint" && "isolate overflow-hidden bg-secondary/40",
        tone === "mesh" && "isolate overflow-hidden bg-mesh-light",
        className,
      )}
    >
      {tone === "navy" && <div className="absolute inset-0 -z-10 bg-grid-dark [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" aria-hidden />}
      {tone === "tint" && <div className="absolute inset-0 -z-10 bg-mesh-light opacity-80" aria-hidden />}
      <div className="container-page">{children}</div>
    </section>
  );
}

export function Eyebrow({ children, className, invert = false }: { children: ReactNode; className?: string; invert?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em]",
        invert ? "border-navy-foreground/15 bg-navy-foreground/10 text-navy-foreground" : "border-primary/15 bg-primary/5 text-primary",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-gradient-tri" />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  text,
  align = "center",
  className,
  invert = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  text?: ReactNode;
  align?: "center" | "left";
  className?: string;
  invert?: boolean;
}) {
  return (
    <Reveal className={cn("mb-12 max-w-3xl lg:mb-16", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <Eyebrow className="mb-5" invert={invert}>{eyebrow}</Eyebrow>}
      <h2 className={cn("text-3xl font-bold leading-[1.12] sm:text-4xl lg:text-5xl", invert && "text-navy-foreground")}>{title}</h2>
      {text && <p className={cn("mt-5 text-lg leading-relaxed", invert ? "text-navy-foreground/70" : "text-muted-foreground", align === "center" && "mx-auto max-w-2xl")}>{text}</p>}
    </Reveal>
  );
}

export function PageHero({
  eyebrow,
  title,
  text,
  image,
  children,
  crumbs,
}: {
  eyebrow?: string | undefined;
  title: ReactNode;
  text?: ReactNode;
  image?: string | undefined;
  children?: ReactNode;
  crumbs?: { label: string; to?: string | undefined }[] | undefined;
}) {
  return (
    <section className="under-header relative isolate overflow-hidden bg-hero-glow">
      <div className="absolute inset-0 -z-10 bg-grid opacity-70 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" aria-hidden />
      <div className="absolute -right-24 top-24 -z-10 size-72 rounded-full bg-violet/15 blur-3xl" aria-hidden />
      <div className="absolute -left-24 bottom-0 -z-10 size-72 rounded-full bg-primary/15 blur-3xl" aria-hidden />
      <div className={cn("container-page relative grid items-center gap-12 py-14 sm:py-20 lg:py-24", image && "lg:grid-cols-[1.05fr_1fr]")}>
        <Reveal className={cn(!image && "mx-auto max-w-3xl text-center")}>
          {crumbs && (
            <nav aria-label="Breadcrumb" className={cn("mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground", !image && "justify-center")}>
              <Link to="/" className="hover:text-primary">Home</Link>
              {crumbs.map((c) => (
                <span key={c.label} className="flex items-center gap-1">
                  <ChevronRight className="size-3.5" />
                  {c.to ? <a href={c.to} className="hover:text-primary">{c.label}</a> : <span className="font-medium text-foreground">{c.label}</span>}
                </span>
              ))}
            </nav>
          )}
          {eyebrow && <Eyebrow className="mb-5">{eyebrow}</Eyebrow>}
          <h1 className="text-[2.4rem] font-extrabold leading-[1.06] sm:text-5xl lg:text-6xl">{title}</h1>
          {text && <p className={cn("mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl", !image && "mx-auto")}>{text}</p>}
          {children && <div className={cn("mt-9 flex flex-wrap gap-3", !image && "justify-center")}>{children}</div>}
        </Reveal>
        {image && (
          <Reveal delay={0.15} className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-tri opacity-25 blur-3xl" aria-hidden />
            <div className="gradient-frame rounded-[2.25rem] shadow-lift">
              <img src={image} alt="" width={1280} height={960} className="aspect-[4/3] w-full rounded-[calc(2.25rem-1px)] bg-surface object-cover" />
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

export function DemoNote({ children = "Demo content — replace with your real data", className }: { children?: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-dashed border-sun bg-sun/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sun-foreground", className)}>
      {children}
    </span>
  );
}
