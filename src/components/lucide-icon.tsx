import * as React from "react";
import { icons, type LucideProps, Inbox } from "lucide-react";

interface LucideIconProps extends LucideProps {
  /** A lucide-react icon name in PascalCase, e.g. "Wrench". */
  name?: string;
  /** Icon rendered when `name` is missing or unknown. */
  fallback?: keyof typeof icons;
}

/**
 * Resolve a lucide icon by its string name. Used by presentational components
 * (EmptyState, StatCard) that accept an icon name rather than a component, so
 * data-driven UIs can pick icons by string. Falls back to a sensible default.
 */
export function LucideIcon({
  name,
  fallback = "Inbox",
  ...props
}: LucideIconProps) {
  const Icon =
    (name && (icons as Record<string, React.ComponentType<LucideProps>>)[name]) ||
    icons[fallback] ||
    Inbox;
  return <Icon {...props} />;
}

export default LucideIcon;
