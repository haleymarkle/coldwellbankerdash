import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getData } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { LucideIcon } from "@/components/lucide-icon";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Administration",
};

const SECTIONS = [
  {
    href: "/admin/users",
    title: "Users",
    description:
      "Invite, edit, and manage roles and access for everyone in the brokerage.",
    icon: "Users",
  },
  {
    href: "/admin/offices",
    title: "Offices",
    description: "Maintain office locations, regions, and their active status.",
    icon: "Building2",
  },
  {
    href: "/admin/tools",
    title: "Tools",
    description:
      "Configure the tool catalog, categories, role access, and visibility.",
    icon: "Wrench",
  },
  {
    href: "/admin/trainings",
    title: "Trainings",
    description:
      "Build the training library and set which roles each course is required for.",
    icon: "GraduationCap",
  },
] as const;

export default async function AdminOverviewPage() {
  const data = await getData();
  const [profiles, offices, tools, trainings] = await Promise.all([
    data.listProfiles(),
    data.listOffices(),
    data.listTools(),
    data.listTrainings(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Organization overview"
        description="Org-wide management for users, offices, tools, and trainings across the brokerage."
      />

      <section
        aria-label="Key figures"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Total users"
          value={profiles.length}
          icon="Users"
          hint="Across all offices"
        />
        <StatCard
          label="Offices"
          value={offices.length}
          icon="Building2"
          hint={`${offices.filter((o) => o.isActive).length} active`}
        />
        <StatCard
          label="Tools"
          value={tools.length}
          icon="Wrench"
          hint={`${tools.filter((t) => t.isActive).length} active`}
        />
        <StatCard
          label="Trainings"
          value={trainings.length}
          icon="GraduationCap"
          hint={`${trainings.filter((t) => t.isActive).length} active`}
        />
      </section>

      <section aria-label="Management sections" className="space-y-4">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Manage
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground"
                  >
                    <LucideIcon name={section.icon} className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-heading text-base font-semibold text-foreground">
                        {section.title}
                      </h3>
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
