import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/rbac";
import type { Role } from "@/lib/types";

interface RoleBadgeProps {
  role: Role;
  className?: string;
}

type BadgeVariant = "default" | "secondary" | "outline";

// Color conveys rank: navy (highest) → navy-tinted → secondary → outline.
const ROLE_STYLES: Record<Role, { variant: BadgeVariant; className?: string }> = {
  master_admin: { variant: "default" },
  high_level_user: {
    variant: "default",
    className: "bg-cb-blue text-primary-foreground",
  },
  office_manager: { variant: "secondary" },
  agent: { variant: "outline" },
};

/** Renders a role's human label as a rank-colored badge. Server-safe. */
export function RoleBadge({ role, className }: RoleBadgeProps) {
  const { variant, className: roleClassName } = ROLE_STYLES[role];
  return (
    <Badge variant={variant} className={cn(roleClassName, className)}>
      {ROLE_LABELS[role]}
    </Badge>
  );
}

export default RoleBadge;
