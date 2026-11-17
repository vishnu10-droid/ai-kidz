import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Quote, Rocket } from "lucide-react";
import { useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PARTNERS, TESTIMONIALS } from "@/data/site";
import { cn } from "@/lib/utils";
import { Stars } from "./Cards";
import { Floating, Reveal } from "./motion";
import { DemoNote } from "./Section";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <Accordion type="single" collapsible className="mx-auto max-w-3xl space-y-3">
      {items.map((f, i) => (
        <AccordionItem key={f.q} value={`f${i}`} className="glow-card rounded-2xl border bg-card px-6 shadow-soft data-[state=open]:shadow-lift">
          <AccordionTrigger className="py-5 text-left font-display text-base font-semibold hover:no-underline">{f.q}</AccordionTrigger>
          <AccordionContent className="pb-5 leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function FinalCta({
  title = "Start Your Child's Innovation Journey Today",
  text = "Book a free trial class and see the spark for yourself.",
  primary = { label: "Book a Free Trial", to: "/book-free-trial" },
  secondary = { label: "Explore Courses", to: "/programs" },
}: {
  title?: string;
  text?: string;
  primary?: { label: string; to: string };
  secondary?: { label: string; to: string };
}) {
  return (
    <section className="py-20 sm:py-24">
      <div className="container-page">
        <Reveal>
          <div className="gradient-frame rounded-[2.75rem] shadow-lift">
            <div className="relative isolate overflow-hidden rounded-[calc(2.75rem-1px)] bg-mesh-dark px-6 py-16 text-center text-navy-foreground sm:px-12 sm:py-24">
              <div className="absolute inset-0 -z-10 bg-grid-dark [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden />
              <Floating className="absolute left-[8%] top-10 -z-10 hidden size-28 rounded-[2rem] bg-primary/40 blur-2xl sm:block" />
              <Floating className="absolute bottom-6 right-[10%] -z-10 hidden size-36 rounded-full bg-sun/30 blur-2xl sm:block" delay={1.2} />
              <span className="glass-dark mx-auto grid size-16 place-items-center rounded-2xl shadow-glow">
                <Rocket className="size-7 text-sun" />
              </span>
              <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-extrabold leading-[1.1] sm:text-5xl">{title}</h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-navy-foreground/70">{text}</p>
              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="xl" variant="sun"><a href={primary.to}>{primary.label} <ArrowRight /></a></Button>
                <Button asChild size="xl" variant="glass"><a href={secondary.to}>{secondary.label}</a></Button>
              </div>
              <p className="mt-6 text-xs font-medium uppercase tracking-[0.16em] text-navy-foreground/50">No payment needed · Live mentor · Real build</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Testimonials({ filter }: { filter?: string }) {
  const items = filter ? TESTIMONIALS.filter((t) => t.type === filter) : TESTIMONIALS;
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);
  const t = items[i]!;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 text-center"><DemoNote>Sample testimonials</DemoNote></div>
      <div className="relative overflow-hidden rounded-[2rem] border bg-card p-8 shadow-lift sm:p-12">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-tri" aria-hidden />
        <Quote className="absolute right-8 top-8 size-16 text-primary/10" />
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.35 }}>
            <Stars value={t.rating} className="[&_svg]:size-5" />
            <p className="mt-6 font-display text-lg font-medium leading-relaxed sm:text-2xl">“{t.text}”</p>
            <div className="mt-6 flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-gradient-brand font-display font-bold text-primary-foreground">
                {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </span>
              <div>
                <div className="font-semibold">{t.name}</div>
                <div className="text-sm text-muted-foreground">{t.role}</div>
              </div>
              <span className="ml-auto rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary">{t.type}</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-5 flex items-center justify-center gap-3">
        <Button variant="outline" size="icon" aria-label="Previous testimonial" onClick={() => setI((v) => (v - 1 + items.length) % items.length)}><ChevronLeft /></Button>
        {items.map((_, idx) => (
          <button key={idx} aria-label={`Show testimonial ${idx + 1}`} onClick={() => setI(idx)} className={cn("h-2 rounded-full transition-all", idx === i ? "w-8 bg-primary" : "w-2 bg-border")} />
        ))}
        <Button variant="outline" size="icon" aria-label="Next testimonial" onClick={() => setI((v) => (v + 1) % items.length)}><ChevronRight /></Button>
      </div>
    </div>
  );
}

export function PartnerGrid() {
  // Two copies side by side so the strip scrolls seamlessly.
  const row = [...PARTNERS, ...PARTNERS];
  return (
    <div>
      <div className="mb-8 text-center"><DemoNote>Placeholder partner logos</DemoNote></div>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max animate-marquee gap-4 hover:[animation-play-state:paused]">
          {row.map((p, idx) => (
            <div key={`${p}-${idx}`} aria-hidden={idx >= PARTNERS.length} className="glow-card flex h-20 w-64 shrink-0 items-center gap-3 rounded-2xl border bg-card px-5 grayscale transition hover:grayscale-0">
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl font-display text-sm font-bold text-primary-foreground", ["bg-primary", "bg-violet", "bg-sun", "bg-mint"][idx % 4])}>
                {p.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </span>
              <span className="text-sm font-semibold leading-tight">{p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function IconBadge({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "violet" | "sun" | "mint" | undefined }) {
  const map = {
    primary: "bg-primary/10 text-primary ring-primary/15",
    violet: "bg-violet/10 text-violet ring-violet/15",
    sun: "bg-sun/15 text-sun-foreground ring-sun/25",
    mint: "bg-mint/15 text-mint ring-mint/20",
  };
  return <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 [&_svg]:size-6", map[tone])}>{children}</span>;
}

export const TONES = ["primary", "violet", "sun", "mint"] as const;
