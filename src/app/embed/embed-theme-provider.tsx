"use client";

import { ThemeProvider } from "@/components/providers/theme-provider";

/**
 * Isolate embed theme from the host page.
 * Root ThemeProvider uses `one-minute-support-theme` in localStorage — if the
 * iframe calls setTheme(), it would flip the parent site (e.g. /test → black).
 */
export default function EmbedThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      storageKey="oms-widget-embed-theme"
    >
      {children}
    </ThemeProvider>
  );
}
