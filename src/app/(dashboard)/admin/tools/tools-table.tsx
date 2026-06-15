"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/data-table";
import { RoleBadge } from "@/components/role-badge";
import { LucideIcon } from "@/components/lucide-icon";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { ROLES } from "@/lib/rbac";
import type { Role, Tool } from "@/lib/types";

import { ToolDialog } from "./tool-dialog";
import { DeleteToolDialog } from "./delete-tool-dialog";

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        isActive
          ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-400"
          : "text-muted-foreground"
      )}
    >
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}

function RolesCell({ roles }: { roles: Role[] }) {
  // Preserve canonical role order and avoid noise when all roles are granted.
  const ordered = ROLES.filter((r) => roles.includes(r));
  if (ordered.length === ROLES.length) {
    return (
      <Badge variant="secondary" className="font-normal">
        All roles
      </Badge>
    );
  }
  if (ordered.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {ordered.map((r) => (
        <RoleBadge key={r} role={r} />
      ))}
    </div>
  );
}

function ToolRowActions({ tool }: { tool: Tool }) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  return (
    <div className="flex justify-end">
      <ToolDialog
        mode="edit"
        tool={tool}
        trigger={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${tool.name}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Pencil className="size-4" aria-hidden="true" />
                  Edit
                </DropdownMenuItem>
              </DialogTrigger>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <DeleteToolDialog
        tool={tool}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}

export function ToolsTable({ tools }: { tools: Tool[] }) {
  const columns = React.useMemo<ColumnDef<Tool>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Tool
            <ArrowUpDown className="size-3.5" aria-hidden="true" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
            >
              <LucideIcon name={row.original.icon} className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-foreground">{row.original.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {row.original.slug}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <Badge variant="outline" className="font-normal">
            {row.original.category}
          </Badge>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.type === "internal_route"
              ? "Internal"
              : "External"}
          </span>
        ),
      },
      {
        id: "roles",
        header: "Roles",
        cell: ({ row }) => <RolesCell roles={row.original.roles} />,
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => <ActiveBadge isActive={row.original.isActive} />,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => <ToolRowActions tool={row.original} />,
      },
    ],
    []
  );

  if (tools.length === 0) {
    return (
      <EmptyState
        icon="Wrench"
        title="No tools yet"
        description="Add the first tool to the catalog and choose who can access it."
      >
        <ToolDialog
          mode="create"
          trigger={
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" aria-hidden="true" />
                Add tool
              </Button>
            </DialogTrigger>
          }
        />
      </EmptyState>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={tools}
      searchKey="name"
      searchPlaceholder="Search tools…"
    />
  );
}

export default ToolsTable;
