import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BadgeCheck, Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/data/site";
import { PROGRAMS } from "@/data/programs";
import { Logo } from "./Logo";

const linkCls = "group inline-flex items-center gap-1 text-navy-foreground/70 transition-colors hover:text-navy-foreground";

function FooterHeading({ children }: { children: string }) {
  return <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-foreground/45">{children}</h3>;
}

export function SiteFooter() {
  return (
    <footer className="relative isolate overflow-hidden bg-mesh-dark text-navy-foreground">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-tri" aria-hidden />
      <div className="absolute inset-0 -z-10 bg-grid-dark [mask-image:linear-gradient(to_bottom,black,transparent_60%)]" aria-hidden />

      {/* Partner strip */}
      <div className="container-page pt-16 sm:pt-20">
        <div className="glass-dark flex flex-col gap-6 rounded-3xl p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-display text-xl font-semibold sm:text-2xl">Bring AIKIDZ to your school or city</p>
            <p className="mt-1.5 text-sm text-navy-foreground/65">Innovation labs for schools and franchise centres across India.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="sun"><Link to="/school">For Schools <ArrowUpRight /></Link></Button>
            <Button asChild variant="glass"><Link to="/franchisee">Become a Partner</Link></Button>
          </div>
        </div>
      </div>

      <div className="container-page grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:grid-cols-3 sm:gap-10 sm:py-16 lg:grid-cols-12 lg:gap-12">
        <div className="col-span-2 sm:col-span-3 lg:col-span-4">
          <Logo light />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-navy-foreground/65">
            AIKIDZ helps children learn robotics, coding, artificial intelligence, electronics and STEM through hands-on, joyful learning — at home, in schools and at our centres.
          </p>
          <div className="mt-6 flex gap-2">
            {[
              { Icon: Facebook, label: "Facebook", href: "https://facebook.com" },
              { Icon: Instagram, label: "Instagram", href: "https://instagram.com" },
              { Icon: Youtube, label: "YouTube", href: "https://youtube.com" },
              { Icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com" },
            ].map(({ Icon, label, href }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="grid size-10 place-items-center rounded-xl border border-navy-foreground/10 bg-navy-foreground/5 transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary">
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          <FooterHeading>Explore</FooterHeading>
          <ul className="mt-5 space-y-3 text-sm">
            {[
              ["About Us", "/about"],
              ["Learning Center", "/learning-center"],
              ["BixCode", "/bixcode"],
              ["Blog", "/blog"],
              ["Shop", "/shop"],
              ["Book a Free Trial", "/book-free-trial"],
              ["Contact Us", "/contact-us"],
            ].map(([label, to]) => (
              <li key={to}>
                <a href={to} className={linkCls}>{label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-3">
          <FooterHeading>Programs</FooterHeading>
          <ul className="mt-5 space-y-3 text-sm">
            {PROGRAMS.map((p) => (
              <li key={p.slug}>
                <Link to="/programs/$slug" params={{ slug: p.slug }} className={linkCls}>{p.name}</Link>
              </li>
            ))}
            <li><Link to="/school" className={linkCls}>School Solutions</Link></li>
            <li><Link to="/franchisee" className={linkCls}>Franchise</Link></li>
          </ul>
        </div>
        <div className="col-span-2 sm:col-span-1 lg:col-span-3">
          <FooterHeading>Contact</FooterHeading>
          <ul className="mt-5 space-y-4 text-sm text-navy-foreground/70">
            <li className="flex gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-sun" />{CONTACT.address}</li>
            <li><a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`} className="flex gap-3 hover:text-navy-foreground"><Phone className="size-4 shrink-0 text-sun" />{CONTACT.phone}</a></li>
            <li><a href={`mailto:${CONTACT.email}`} className="flex gap-3 break-all hover:text-navy-foreground"><Mail className="size-4 shrink-0 text-sun" />{CONTACT.email}</a></li>
          </ul>
          <a href="/verify-certificate" className="mt-6 inline-flex items-center gap-2 rounded-full border border-navy-foreground/15 px-4 py-2 text-xs font-semibold text-navy-foreground/80 transition hover:border-mint hover:text-navy-foreground">
            <BadgeCheck className="size-4 text-mint" /> Verify a certificate
          </a>
        </div>
      </div>

      <div className="pointer-events-none hidden select-none overflow-hidden sm:block" aria-hidden>
        <div className="container-page">
          <div className="translate-y-[18%] text-center font-display text-[17vw] font-extrabold leading-none tracking-tighter text-navy-foreground/[0.04] lg:text-[13rem]">AIKIDZ</div>
        </div>
      </div>

      <div className="relative border-t border-navy-foreground/10 bg-navy/60 backdrop-blur">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-6 text-xs text-navy-foreground/55 sm:flex-row">
          <p>© {new Date().getFullYear()} AIKIDZ. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy-policy" className="hover:text-navy-foreground">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-navy-foreground">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
