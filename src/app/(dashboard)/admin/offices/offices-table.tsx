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
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import type { Office } from "@/lib/types";

import { OfficeDialog } from "./office-dialog";
import { DeleteOfficeDialog } from "./delete-office-dialog";

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

function OfficeRowActions({ office }: { office: Office }) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  return (
    <div className="flex justify-end">
      <OfficeDialog
        mode="edit"
        office={office}
        trigger={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${office.name}`}
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
      <DeleteOfficeDialog
        office={office}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}

export function OfficesTable({ offices }: { offices: Office[] }) {
  const columns = React.useMemo<ColumnDef<Office>[]>(
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
            Office
            <ArrowUpDown className="size-3.5" aria-hidden="true" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium text-foreground">{row.original.name}</p>
            {row.original.addressLine1 ? (
              <p className="truncate text-xs text-muted-foreground">
                {row.original.addressLine1}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "location",
        header: "City / State",
        accessorFn: (row) =>
          [row.city, row.state].filter(Boolean).join(", "),
        cell: ({ row }) => {
          const loc = [row.original.city, row.original.state]
            .filter(Boolean)
            .join(", ");
          return (
            <span className="text-sm">
              {loc || <span className="text-muted-foreground">—</span>}
            </span>
          );
        },
      },
      {
        accessorKey: "region",
        header: "Region",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.region ?? (
              <span className="text-muted-foreground">—</span>
            )}
          </span>
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
        cell: ({ row }) => <OfficeRowActions office={row.original} />,
      },
    ],
    []
  );

  if (offices.length === 0) {
    return (
      <EmptyState
        icon="Building2"
        title="No offices yet"
        description="Add your first office location to organize the brokerage."
      >
        <OfficeDialog
          mode="create"
          trigger={
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" aria-hidden="true" />
                Add office
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
      data={offices}
      searchKey="name"
      searchPlaceholder="Search offices…"
    />
  );
}

export default OfficesTable;
