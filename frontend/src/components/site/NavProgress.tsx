import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

/** Thin bar at the top of the screen while the next page loads, so clicks feel instant. */
export function NavProgress() {
  const loading = useRouterState({ select: (s) => s.isLoading || s.status === "pending" });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => setVisible(true), 80);
      return () => clearTimeout(t);
    }
    setVisible(false);
    return undefined;
  }, [loading]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden">
      <div className={`h-full bg-gradient-brand transition-all ease-out ${visible ? "w-4/5 opacity-100 duration-[2500ms]" : loading ? "w-0 opacity-0 duration-0" : "w-full opacity-0 duration-300"}`} />
    </div>
  );
}
