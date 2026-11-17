import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowRight,
  Baby,
  BookOpen,
  Bot,
  Brain,
  CheckCircle2,
  Code2,
  Cpu,
  FlaskConical,
  Globe2,
  GraduationCap,
  Hammer,
  Lightbulb,
  MessagesSquare,
  PlayCircle,
  Puzzle,
  Rocket,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/site/Section";
import { Counter, Floating, Reveal, Stagger, StaggerItem } from "@/components/site/motion";
import { FinalCta, IconBadge, PartnerGrid, Testimonials, TONES } from "@/components/site/Blocks";
import { CourseCard, ProductCard } from "@/components/site/Cards";
import { EXPERIENCE, GALLERY, SKILLS, STATS, WHY_CHOOSE, WHY_ROBOTICS } from "@/data/site";
import { PROGRAMS } from "@/data/programs";
import { img } from "@/lib/images";
import { coursesQuery, productsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { FREE_SHIPPING_THRESHOLD, formatINR } from "@/lib/pricing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AIKIDZ – Robotics, Coding, AI & STEM Learning for Kids" },
      { name: "description", content: "Empowering young minds to build the future with hands-on robotics, coding, AI and STEM programs, kits and school labs." },
      { property: "og:title", content: "AIKIDZ – Empowering Young Minds to Build the Future" },
      { property: "og:description", content: "Robotics, coding, AI and STEM programs, DIY kits and innovation labs for kids and schools." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(productsQuery()), context.queryClient.ensureQueryData(coursesQuery())]),
  component: Home,
});

const SKILL_ICONS = [Brain, Puzzle, Wand2, Target, TrendingUp, Lightbulb];
const OFFER_ICONS = [Bot, Code2, Baby, FlaskConical];
const WHY_ICONS = [GraduationCap, Hammer, BookOpen, Globe2, MessagesSquare, Rocket];
const POPULAR = ["beginner-robotics", "advanced-robotics", "python-programming", "scratch-coding", "artificial-intelligence", "iot-and-electronics"];
const STAT_TONES = ["text-primary", "text-violet", "text-sun", "text-mint"];
const OFFER_NAMES: Record<string, string> = { Robotics: "Robotics Education", Coding: "Coding Education", "Pre-School": "Pre-School Learning" };

function Home() {
  const { data: shop } = useSuspenseQuery(productsQuery());
  const { data: courses } = useSuspenseQuery(coursesQuery());
  const popular = POPULAR.map((s) => courses.find((c) => c.slug === s)).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const featured = shop.products.filter((p) => p.is_featured);
  const [cat, setCat] = useState("All");
  const cats = ["All", ...Array.from(new Set(GALLERY.map((g) => g.category)))];

  return (
    <>
      {/* HERO */}
      <section className="under-header relative isolate overflow-hidden bg-mesh-dark text-navy-foreground">
        <div className="absolute inset-0 -z-10 bg-grid-dark [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" aria-hidden />
        <div className="absolute left-1/2 top-[-20%] -z-10 size-[42rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" aria-hidden />

        <div className="container-page relative grid items-center gap-14 pb-16 pt-10 sm:pt-14 lg:grid-cols-[1.08fr_1fr] lg:gap-10 lg:pb-24 lg:pt-20">
          <Stagger>
            <StaggerItem className="h-auto">
              <Link to="/book-free-trial" className="glass-dark group inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-xs font-medium text-navy-foreground/85 transition hover:border-sun/40 sm:text-sm">
                <span className="rounded-full bg-sun px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-sun-foreground">New</span>
                AI &amp; Robotics batches now enrolling
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </StaggerItem>
            <StaggerItem className="h-auto">
              <h1 className="mt-7 text-[2.6rem] font-extrabold leading-[1.04] sm:text-6xl lg:text-[4.4rem]">
                Empowering young minds to <span className="text-gradient-hero">build the future</span>
              </h1>
            </StaggerItem>
            <StaggerItem className="h-auto">
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-foreground/70 sm:text-xl">
                Live, hands-on Robotics, Coding, AI and STEM classes — with real kits delivered home, expert mentors and projects kids are proud to show off.
              </p>
            </StaggerItem>
            <StaggerItem className="h-auto">
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="xl" variant="brand"><Link to="/programs">Explore Programs <ArrowRight /></Link></Button>
                <Button asChild size="xl" variant="glass"><Link to="/book-free-trial"><PlayCircle /> Book a Free Trial</Link></Button>
              </div>
            </StaggerItem>
            <StaggerItem className="h-auto">
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
                <div className="flex -space-x-2.5" aria-hidden>
                  {["AK", "RS", "PM", "NV"].map((i, idx) => (
                    <span key={i} className={cn("grid size-9 place-items-center rounded-full font-display text-[11px] font-bold text-primary-foreground ring-2 ring-navy", ["bg-primary", "bg-violet", "bg-sun", "bg-mint"][idx])}>{i}</span>
                  ))}
                </div>
                <div className="text-sm">
                  <div className="flex items-center gap-1 text-sun">
                    {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="size-4 fill-current" />)}
                    <span className="ml-1.5 font-semibold text-navy-foreground">Loved by families</span>
                  </div>
                  <p className="mt-0.5 text-navy-foreground/60">Schools, homes and centres across India</p>
                </div>
              </div>
            </StaggerItem>
          </Stagger>

          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <motion.div initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className="relative">
              <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-tri opacity-40 blur-3xl" aria-hidden />
              <div className="gradient-frame rounded-[2.5rem] shadow-lift">
                <div className="relative overflow-hidden rounded-[calc(2.5rem-1px)]">
                  <img src={img.heroKidsRobotics} alt="Children building a robot together" width={1536} height={1152} className="aspect-[4/3] w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/60 via-transparent to-transparent" aria-hidden />
                  <div className="glass-dark absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl px-4 py-3 sm:right-auto">
                    <span className="relative flex size-2.5"><span className="absolute inset-0 animate-ping rounded-full bg-mint opacity-70 motion-reduce:hidden" /><span className="relative size-2.5 rounded-full bg-mint" /></span>
                    <span className="text-sm font-semibold">Live class in progress</span>
                    <span className="text-xs text-navy-foreground/60">· Line-follower robot</span>
                  </div>
                </div>
              </div>
            </motion.div>
            <Floating className="absolute -left-3 top-6 hidden sm:block lg:-left-10">
              <div className="glass-dark flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lift">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/25 text-navy-foreground"><Cpu className="size-5" /></span>
                <div><div className="text-sm font-bold">Real robot kits</div><div className="text-xs text-navy-foreground/60">Delivered home</div></div>
              </div>
            </Floating>
            <Floating className="absolute -right-2 -top-5 hidden sm:block lg:right-3 xl:-right-6" delay={1.5}>
              <div className="glass-dark flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lift">
                <span className="grid size-10 place-items-center rounded-xl bg-sun/25 text-sun"><Sparkles className="size-5" /></span>
                <div><div className="text-sm font-bold">Live mentors</div><div className="text-xs text-navy-foreground/60">Small batches</div></div>
              </div>
            </Floating>
          </div>
        </div>

        {/* STATS */}
        <div className="container-page relative pb-16 lg:pb-20">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.06}>
                <div className="glass-dark h-full rounded-2xl px-5 py-6 text-center transition hover:border-navy-foreground/25 sm:rounded-3xl sm:py-7">
                  <div className={cn("font-display text-2xl font-extrabold sm:text-4xl", STAT_TONES[i])}>
                    <Counter to={s.value} suffix={s.suffix} />
                  </div>
                  <div className="mt-1.5 text-xs font-medium uppercase tracking-[0.12em] text-navy-foreground/60 sm:text-sm sm:normal-case sm:tracking-normal">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* OFFER */}
      <Section>
        <SectionHeading eyebrow="What we offer" title={<>Programs that turn curiosity into <span className="text-gradient-brand">creation</span></>} text="Four learning tracks designed for every age and interest — from first blocks to real-world AI." />
        <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PROGRAMS.slice(0, 4).map((p, i) => {
            const Icon = OFFER_ICONS[i]!;
            return (
              <StaggerItem key={p.slug}>
                <article className="glow-card group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card shadow-soft hover:-translate-y-1.5">
                  <div className="m-2 aspect-[4/3] overflow-hidden rounded-[1.25rem]"><img src={p.image} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]" /></div>
                  <div className="flex flex-1 flex-col px-6 pb-6 pt-4">
                    <IconBadge tone={TONES[i % 4]}><Icon /></IconBadge>
                    <h3 className="mt-5 text-xl font-semibold">{OFFER_NAMES[p.name] ?? p.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.short}</p>
                    <Link to="/programs/$slug" params={{ slug: p.slug }} className="mt-auto inline-flex items-center gap-1 pt-6 text-sm font-semibold text-primary after:absolute after:inset-0">
                      Explore More <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>
      </Section>

      {/* SKILLS */}
      <Section tone="tint">
        <SectionHeading eyebrow="What kids achieve" title="Skills that last a lifetime" text="Every class builds the thinking habits that matter in school, work and life." />
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SKILLS.map((s, i) => {
            const Icon = SKILL_ICONS[i]!;
            return (
              <StaggerItem key={s.title}>
                <div className="glow-card group flex h-full gap-5 rounded-3xl border bg-card p-6 shadow-soft hover:-translate-y-1 sm:p-7">
                  <IconBadge tone={TONES[i % 4]}><Icon /></IconBadge>
                  <div><h3 className="text-lg font-semibold">{s.title}</h3><p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.text}</p></div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </Section>

      {/* EXPERIENCE */}
      <Section tone="navy">
        <SectionHeading invert eyebrow="The AIKIDZ experience" title={<>Six steps from <span className="text-gradient-hero">spark to invention</span></>} />
        <div className="relative grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
          <div className="absolute left-[8%] right-[8%] top-8 hidden h-px bg-gradient-tri opacity-70 lg:block" aria-hidden />
          {EXPERIENCE.map((e, i) => (
            <Reveal key={e.step} delay={i * 0.08} className="relative">
              <div className="glass-dark h-full rounded-3xl p-5 text-center transition hover:-translate-y-1 hover:border-navy-foreground/25 lg:bg-transparent lg:p-2 lg:[backdrop-filter:none] lg:border-transparent">
                <div className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-brand font-display text-xl font-extrabold shadow-glow ring-4 ring-navy">{String(i + 1).padStart(2, "0")}</div>
                <h3 className="mt-5 text-lg font-semibold">{e.step}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-navy-foreground/65">{e.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* WHY ROBOTICS */}
      <Section>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-tri opacity-20 blur-3xl" aria-hidden />
            <div className="gradient-frame rounded-[2.25rem] shadow-lift">
              <img src={img.programRobotics} alt="Child building a sensor robot" loading="lazy" className="aspect-[4/3] w-full rounded-[calc(2.25rem-1px)] object-cover" />
            </div>
            <div className="glass absolute -bottom-6 right-4 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lift sm:right-8">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-brand text-primary-foreground"><Bot className="size-5" /></span>
              <div><div className="text-sm font-bold">70% building</div><div className="text-xs text-muted-foreground">in every single class</div></div>
            </div>
          </Reveal>
          <div>
            <SectionHeading align="left" eyebrow="Why robotics for kids?" title="The most hands-on way to learn tech" className="mb-8 lg:mb-10" />
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {WHY_ROBOTICS.map((w) => (
                <div key={w.title} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div><h3 className="font-semibold">{w.title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{w.text}</p></div>
                </div>
              ))}
            </div>
            <Button asChild variant="brand" size="lg" className="mt-10"><Link to="/programs/$slug" params={{ slug: "robotics" }}>Explore Robotics <ArrowRight /></Link></Button>
          </div>
        </div>
      </Section>

      {/* POPULAR PROGRAMS */}
      <Section tone="mesh">
        <div className="mb-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end lg:mb-16">
          <SectionHeading align="left" eyebrow="Popular programs" title="Courses kids love" text="Small live batches, structured levels and a certificate at the end." className="mb-0 lg:mb-0" />
          <Button asChild variant="outline" size="lg" className="shrink-0"><Link to="/programs">All programs <ArrowRight /></Link></Button>
        </div>
        <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((c) => <StaggerItem key={c.id}><CourseCard course={{ ...c, price: Number(c.price) }} /></StaggerItem>)}
        </Stagger>
      </Section>

      {/* BEST SELLERS */}
      <Section>
        <div className="mb-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end lg:mb-16">
          <SectionHeading align="left" eyebrow="Best selling products" title="Kits that build big ideas" text={`Illustrated manuals, video guides and free shipping on orders over ${formatINR(FREE_SHIPPING_THRESHOLD)}.`} className="mb-0 lg:mb-0" />
          <Button asChild variant="outline" size="lg" className="shrink-0"><Link to="/shop">Visit the shop <ArrowRight /></Link></Button>
        </div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-6 [scrollbar-width:thin] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {featured.map((p) => (
            <div key={p.id} className="w-[80%] shrink-0 snap-start pt-2 sm:w-[46%] lg:w-[23.5%]">
              <ProductCard product={{ ...p, price: Number(p.price), mrp: Number(p.mrp), rating: Number(p.rating) }} />
            </div>
          ))}
        </div>
      </Section>

      {/* WHY CHOOSE */}
      <Section tone="tint">
        <SectionHeading eyebrow="Why choose AIKIDZ?" title="Built by educators, loved by kids" />
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WHY_CHOOSE.map((w, i) => {
            const Icon = WHY_ICONS[i % WHY_ICONS.length]!;
            return (
              <StaggerItem key={w.title}>
                <div className="glow-card group h-full rounded-3xl border bg-card p-7 shadow-soft hover:-translate-y-1">
                  <IconBadge tone={TONES[i % 4]}><Icon /></IconBadge>
                  <h3 className="mt-5 text-lg font-semibold">{w.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{w.text}</p>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </Section>

      {/* GALLERY */}
      <Section>
        <SectionHeading eyebrow="Student project gallery" title="Made by young innovators" />
        <div className="mb-10 flex justify-center">
          <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border bg-card p-1.5 shadow-soft" role="tablist">
            {cats.map((c) => (
              <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition", cat === c ? "bg-gradient-brand text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-primary")}>{c}</button>
            ))}
          </div>
        </div>
        <motion.div layout className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {GALLERY.filter((g) => cat === "All" || g.category === cat).map((g) => (
            <motion.figure layout key={g.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group relative aspect-square overflow-hidden rounded-3xl ring-1 ring-border">
              <img src={g.image} alt={g.title} loading="lazy" className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
              <figcaption className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-navy/90 via-navy/20 to-transparent p-4 text-navy-foreground transition sm:opacity-0 sm:group-hover:opacity-100">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-sun">{g.category}</span>
                <span className="font-display font-semibold">{g.title}</span>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </Section>

      {/* TESTIMONIALS */}
      <Section tone="mesh">
        <SectionHeading eyebrow="Testimonials" title="What families and schools say" />
        <Testimonials />
      </Section>

      {/* PARTNERS */}
      <Section className="pb-8 sm:pb-10 lg:pb-12">
        <SectionHeading eyebrow="Partner schools" title="Trusted by schools across India" />
        <PartnerGrid />
      </Section>

      <FinalCta />
    </>
  );
}
