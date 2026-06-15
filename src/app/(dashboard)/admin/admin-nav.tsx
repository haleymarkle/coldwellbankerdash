"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { LucideIcon } from "@/components/lucide-icon";

const SECTIONS = [
  { href: "/admin", label: "Overview", icon: "LayoutDashboard", exact: true },
  { href: "/admin/users", label: "Users", icon: "Users" },
  { href: "/admin/offices", label: "Offices", icon: "Building2" },
  { href: "/admin/tools", label: "Tools", icon: "Wrench" },
  { href: "/admin/trainings", label: "Trainings", icon: "GraduationCap" },
] as const;

/** Secondary admin navigation — links to each management section. */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin sections"
      className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm"
    >
      {SECTIONS.map((section) => {
        const exact = "exact" in section && section.exact;
        const isActive = exact
          ? pathname === section.href
          : pathname === section.href ||
            pathname.startsWith(`${section.href}/`);
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <LucideIcon name={section.icon} className="size-4" aria-hidden="true" />
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default AdminNav;
