"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const ENABLED = process.env.NODE_ENV === "development";

export function DevPerfMonitor() {
  const pathname = usePathname() ?? "";
  const routeStart = useRef<number>(0);

  if (ENABLED) {
    routeStart.current = performance.now();
  }

  useEffect(() => {
    if (!ENABLED) return;
    const elapsed = performance.now() - routeStart.current;
    if (elapsed > 16) {
      // eslint-disable-next-line no-console
      console.warn(`[perf] route render "${pathname}" took ${elapsed.toFixed(1)}ms`);
    } else {
      // eslint-disable-next-line no-console
      console.info(`[perf] route render "${pathname}" took ${elapsed.toFixed(1)}ms`);
    }
  }, [pathname]);

  return null;
}

