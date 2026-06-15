import type * as React from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Right-aligned actions (buttons, links). */
  children?: React.ReactNode;
}

/**
 * Standard page heading: small-caps eyebrow + serif title + muted description,
 * with optional right-aligned actions.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default PageHeader;
