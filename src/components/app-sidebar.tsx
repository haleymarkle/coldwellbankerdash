"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  GraduationCap,
  Home,
  MapPin,
  Shield,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BrandLogo } from "@/components/brand-logo";
import { NavUser } from "@/components/nav-user";
import { canAccessAdmin, canManageOffice, hasAtLeast } from "@/lib/rbac";
import type { CurrentUser, Role } from "@/lib/types";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  minRole: Role;
}

const MAIN_ITEMS: NavItem[] = [
  { title: "Home", href: "/", icon: Home, minRole: "agent" },
  { title: "Tools", href: "/tools", icon: Wrench, minRole: "agent" },
  {
    title: "Trainings",
    href: "/trainings",
    icon: GraduationCap,
    minRole: "agent",
  },
];

const MANAGE_ITEMS: NavItem[] = [
  {
    title: "My Office",
    href: "/team",
    icon: Building2,
    minRole: "office_manager",
  },
];

const ADMIN_ITEMS: NavItem[] = [
  { title: "Admin", href: "/admin", icon: Shield, minRole: "high_level_user" },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
    minRole: "high_level_user",
  },
  {
    title: "Offices",
    href: "/admin/offices",
    icon: MapPin,
    minRole: "high_level_user",
  },
  {
    title: "Tools",
    href: "/admin/tools",
    icon: Wrench,
    minRole: "high_level_user",
  },
  {
    title: "Trainings",
    href: "/admin/trainings",
    icon: GraduationCap,
    minRole: "high_level_user",
  },
];

interface AppSidebarProps {
  user: CurrentUser;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  const isActive = React.useCallback(
    (href: string) =>
      href === "/" ? pathname === "/" : pathname.startsWith(href),
    [pathname]
  );

  const mainItems = MAIN_ITEMS.filter((item) =>
    hasAtLeast(user.role, item.minRole)
  );

  function renderItems(items: NavItem[]) {
    return items.map((item) => {
      const Icon = item.icon;
      return (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={isActive(item.href)}
            tooltip={item.title}
          >
            <Link href={item.href}>
              <Icon />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="flex h-10 items-center px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <BrandLogo className="group-data-[collapsible=icon]:hidden" />
          <BrandLogo
            collapsed
            className="hidden group-data-[collapsible=icon]:flex"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarMenu>{renderItems(mainItems)}</SidebarMenu>
        </SidebarGroup>

        {canManageOffice(user.role) ? (
          <SidebarGroup>
            <SidebarGroupLabel>Manage</SidebarGroupLabel>
            <SidebarMenu>{renderItems(MANAGE_ITEMS)}</SidebarMenu>
          </SidebarGroup>
        ) : null}

        {canAccessAdmin(user.role) ? (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarMenu>{renderItems(ADMIN_ITEMS)}</SidebarMenu>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
