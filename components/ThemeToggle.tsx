"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { setTheme } = useTheme();

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-background/70 text-foreground shadow-sm backdrop-blur transition-all hover:border-primary/35 hover:bg-muted/70 hover:text-primary active:scale-95",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20",
        className
      )}
    >
      <span
        className="absolute inset-1 rounded-full bg-primary/10 opacity-0 transition-opacity dark:opacity-100"
        aria-hidden="true"
      />
      <Sun
        className="absolute h-4 w-4 rotate-0 scale-100 opacity-100 transition-all duration-300 dark:rotate-90 dark:scale-0 dark:opacity-0"
        aria-hidden="true"
      />
      <Moon
        className="absolute h-4 w-4 -rotate-90 scale-0 opacity-0 transition-all duration-300 dark:rotate-0 dark:scale-100 dark:opacity-100"
        aria-hidden="true"
      />
    </button>
  );
}
