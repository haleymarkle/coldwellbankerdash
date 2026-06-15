import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "@/components/lucide-icon";

interface StatCardProps {
  label: string;
  value: string | number;
  /** lucide-react icon name. */
  icon?: string;
  hint?: string;
}

/**
 * Compact KPI card — eyebrow label, large serif figure, optional icon and hint.
 */
export function StatCard({ label, value, icon, hint }: StatCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <p className="eyebrow">{label}</p>
          <p className="font-heading text-3xl font-semibold leading-none tracking-tight text-foreground">
            {value}
          </p>
          {hint ? (
            <p className="truncate text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
          >
            <LucideIcon name={icon} className="size-4.5" />
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default StatCard;
