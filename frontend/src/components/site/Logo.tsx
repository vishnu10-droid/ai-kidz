import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <Link to="/" className={cn("flex items-center", className)} aria-label="AIKIDZ home">
      <span
        className={cn(
          "font-display text-xl font-extrabold tracking-tight",
          light ? "text-navy-foreground" : "text-foreground",
        )}
      >
        AI<span className="text-gradient-brand">KIDZ</span>
      </span>
    </Link>
  );
}
