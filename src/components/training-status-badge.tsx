import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TrainingStatus } from "@/lib/types";

interface TrainingStatusBadgeProps {
  status: TrainingStatus;
  className?: string;
}

type BadgeVariant = "outline" | "secondary";

const STATUS_STYLES: Record<
  TrainingStatus,
  { label: string; variant: BadgeVariant; className?: string }
> = {
  not_started: {
    label: "Not started",
    variant: "outline",
    className: "text-muted-foreground",
  },
  in_progress: {
    label: "In progress",
    variant: "secondary",
    className: "bg-accent text-accent-foreground",
  },
  completed: {
    label: "Completed",
    variant: "outline",
    // emerald is the single sanctioned success accent (success token not defined)
    className:
      "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-400",
  },
};

/** Badge reflecting a training assignment's progress state. Server-safe. */
export function TrainingStatusBadge({
  status,
  className,
}: TrainingStatusBadgeProps) {
  const { label, variant, className: statusClassName } = STATUS_STYLES[status];
  return (
    <Badge variant={variant} className={cn(statusClassName, className)}>
      {label}
    </Badge>
  );
}

export default TrainingStatusBadge;
