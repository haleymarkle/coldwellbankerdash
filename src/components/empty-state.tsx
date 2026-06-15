import type * as React from "react";

import { LucideIcon } from "@/components/lucide-icon";

interface EmptyStateProps {
  /** lucide-react icon name; defaults to "Inbox". */
  icon?: string;
  title: string;
  description?: string;
  /** Optional actions (e.g. a "Create" button). */
  children?: React.ReactNode;
}

/**
 * Designed empty state for any list/panel with no data — never leave a blank
 * region. Centered dashed card with icon, serif title, muted copy, and actions.
 */
export function EmptyState({
  icon = "Inbox",
  title,
  description,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/40 px-6 py-12 text-center">
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <LucideIcon name={icon} className="size-5" />
      </span>
      <div className="space-y-1">
        <h3 className="font-heading text-lg font-semibold text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default EmptyState;
