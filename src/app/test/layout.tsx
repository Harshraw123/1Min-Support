import type { ReactNode } from "react";

/**
 * Passthrough only — do not nest ThemeProviders or MutationObservers here.
 * Those fought the root theme and froze the main thread (page stuck on Loading…).
 */
export default function TestLayout({ children }: { children: ReactNode }) {
  return children;
}
