"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DevRoleSwitcher } from "@/components/dev-role-switcher";
import { NavUser } from "@/components/nav-user";
import { ThemeToggle } from "@/components/theme-toggle";
import type { CurrentUser } from "@/lib/types";

interface DashboardTopbarProps {
  user: CurrentUser;
  devMode: boolean;
}

function humanize(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface Crumb {
  label: string;
  href: string;
}

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ label: "Home", href: "/" }];
  let acc = "";
  for (const segment of segments) {
    acc += `/${segment}`;
    crumbs.push({ label: humanize(segment), href: acc });
  }
  return crumbs;
}

function TopbarBreadcrumb() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <React.Fragment key={crumb.href}>
              <BreadcrumbItem
                className={isLast ? undefined : "hidden md:block"}
              >
                {isLast ? (
                  <BreadcrumbPage className="font-heading">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast ? (
                <BreadcrumbSeparator className="hidden md:block" />
              ) : null}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** Sticky shell topbar: trigger + breadcrumb on the left, user controls right. */
export function DashboardTopbar({ user, devMode }: DashboardTopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur md:px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1 !h-5" />
      <TopbarBreadcrumb />
      <div className="ml-auto flex items-center gap-1.5">
        {devMode ? <DevRoleSwitcher current={user.role} /> : null}
        <ThemeToggle />
        <NavUser user={user} />
      </div>
    </header>
  );
}

export default DashboardTopbar;
