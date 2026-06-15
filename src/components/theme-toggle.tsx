"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Light/dark toggle with hydration-safe rendering. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Before mount, render a stable placeholder to avoid a hydration mismatch.
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-hidden="true" tabIndex={-1}>
        <Sun className="size-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
      <span className="sr-only">
        Switch to {isDark ? "light" : "dark"} theme
      </span>
    </Button>
  );
}

export default ThemeToggle;
