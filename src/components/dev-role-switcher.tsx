"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, ROLES } from "@/lib/rbac";
import { setDevRole } from "@/lib/session-actions";
import type { Role } from "@/lib/types";

interface DevRoleSwitcherProps {
  /** The currently previewed role. */
  current: Role;
}

/**
 * DEV-only previewer: switch the active role to explore the app from any
 * perspective. Mounted by the topbar only when auth is not configured.
 */
export function DevRoleSwitcher({ current }: DevRoleSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function selectRole(role: Role) {
    if (role === current) return;
    startTransition(async () => {
      await setDevRole(role);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          className="gap-1.5"
        >
          <Badge
            variant="secondary"
            className="h-4 px-1 text-[0.6rem] tracking-wide"
          >
            DEV
          </Badge>
          <span className="hidden sm:inline">{ROLE_LABELS[current]}</span>
          <ChevronsUpDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Preview as role
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLES.map((role) => (
          <DropdownMenuItem
            key={role}
            onSelect={() => selectRole(role)}
            className="justify-between"
          >
            {ROLE_LABELS[role]}
            <Check
              className={cn(
                "size-4",
                role === current ? "opacity-100" : "opacity-0"
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default DevRoleSwitcher;
