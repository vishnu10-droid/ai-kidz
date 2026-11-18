import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  light = false,
  showSubtitle = false,
}: {
  className?: string;
  light?: boolean;
  showSubtitle?: boolean;
}) {
  return (
    <Link
      to="/"
      className={cn("flex flex-col items-center leading-none", className)}
      aria-label="AIKIDZ home"
    >
      <span
        className={cn(
          "font-display text-xl font-extrabold tracking-tight",
          light ? "text-navy-foreground" : "text-foreground",
        )}
      >
        AI
        <span className={light ? "text-gradient-hero" : "text-gradient-brand"}>KIDZ</span>
      </span>
      {showSubtitle && (
        <span
          className={cn(
            "mt-0.5 text-[9px] font-medium leading-tight",
            light ? "text-navy-foreground/65" : "text-muted-foreground",
          )}
        >
          Powered by AI Scholars
        </span>
      )}
    </Link>
  );
}
