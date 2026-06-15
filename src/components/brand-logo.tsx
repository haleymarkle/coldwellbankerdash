import { cn } from "@/lib/utils";

interface BrandLogoProps {
  /** When true, render only the square "CB" emblem (collapsed sidebar). */
  collapsed?: boolean;
  className?: string;
}

/**
 * Coldwell Banker wordmark lockup — a navy emblem with a serif "CB" beside the
 * stacked brokerage name. Purely presentational; safe in Server Components.
 */
export function BrandLogo({ collapsed = false, className }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-cb-navy text-primary-foreground shadow-sm ring-1 ring-white/10"
      >
        <span className="font-heading text-sm font-semibold leading-none tracking-tight">
          CB
        </span>
      </span>

      {!collapsed && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="font-heading text-sm font-semibold tracking-[0.12em] text-sidebar-foreground">
            COLDWELL BANKER
          </span>
          <span className="eyebrow mt-1 truncate !text-[0.6rem] !tracking-[0.16em] text-sidebar-foreground/65">
            Associated Brokers Realty
          </span>
        </span>
      )}
      <span className="sr-only">Coldwell Banker Associated Brokers Realty</span>
    </div>
  );
}

export default BrandLogo;
