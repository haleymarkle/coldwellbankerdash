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
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { ROLES } from "@/lib/rbac";
import type { Role, Training } from "@/lib/types";

import { TrainingDialog } from "./training-dialog";
import { DeleteTrainingDialog } from "./delete-training-dialog";

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

function RequiredRolesCell({ roles }: { roles: Role[] }) {
  const ordered = ROLES.filter((r) => roles.includes(r));
  if (ordered.length === 0) {
    return (
      <Badge variant="outline" className="font-normal text-muted-foreground">
        Optional
      </Badge>
    );
  }
  if (ordered.length === ROLES.length) {
    return (
      <Badge variant="secondary" className="font-normal">
        All roles
      </Badge>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {ordered.map((r) => (
        <RoleBadge key={r} role={r} />
      ))}
    </div>
  );
}

function TrainingRowActions({ training }: { training: Training }) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  return (
    <div className="flex justify-end">
      <TrainingDialog
        mode="edit"
        training={training}
        trigger={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${training.title}`}
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
      <DeleteTrainingDialog
        training={training}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}

export function TrainingsTable({ trainings }: { trainings: Training[] }) {
  const columns = React.useMemo<ColumnDef<Training>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Training
            <ArrowUpDown className="size-3.5" aria-hidden="true" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium text-foreground">{row.original.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.description}
            </p>
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
        id: "requiredForRoles",
        header: "Required for",
        cell: ({ row }) => (
          <RequiredRolesCell roles={row.original.requiredForRoles} />
        ),
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => <ActiveBadge isActive={row.original.isActive} />,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => <TrainingRowActions training={row.original} />,
      },
    ],
    []
  );

  if (trainings.length === 0) {
    return (
      <EmptyState
        icon="GraduationCap"
        title="No trainings yet"
        description="Create your first training course and choose which roles it's required for."
      >
        <TrainingDialog
          mode="create"
          trigger={
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" aria-hidden="true" />
                Add training
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
      data={trainings}
      searchKey="title"
      searchPlaceholder="Search trainings…"
    />
  );
}

export default TrainingsTable;
