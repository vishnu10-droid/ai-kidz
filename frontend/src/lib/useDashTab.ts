import { useRouter, useRouterState } from "@tanstack/react-router";
import { useCallback } from "react";

/**
 * Keeps the active dashboard tab in the URL (`?tab=fees`) so side-nav links,
 * deep links and refreshes all land on the same panel.
 */
export function useDashTab(fallback: string) {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });

  const tab = new URLSearchParams(searchStr).get("tab") ?? fallback;

  const setTab = useCallback(
    (value: string) => {
      void router.navigate({ href: `${pathname}?tab=${encodeURIComponent(value)}`, replace: true });
    },
    [router, pathname],
  );

  return [tab, setTab] as const;
}
