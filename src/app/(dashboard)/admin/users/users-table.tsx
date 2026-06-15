"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Check, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import type {
  Office,
  ProfileWithOffice,
  Role,
  UserStatus,
} from "@/lib/types";

import { UserDialog } from "./user-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";
import { approveUserAction, type ActionState } from "./actions";

const STATUS_LABELS: Record<UserStatus, string> = {
  active: "Active",
  invited: "Pending",
  disabled: "Disabled",
};

function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        status === "active" &&
          "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-400",
        status === "invited" && "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:text-amber-400",
        status === "disabled" && "text-muted-foreground"
      )}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}

/** Inline approve button shown when a user is pending (invited). */
function ApproveButton({ user }: { user: ProfileWithOffice }) {
  const initialState: ActionState = { ok: false };
  const [state, formAction, pending] = React.useActionState(approveUserAction, initialState);
  const handledRef = React.useRef(state);

  React.useEffect(() => {
    if (state === handledRef.current) return;
    handledRef.current = state;
    if (state.ok) toast.success(`${user.displayName} approved.`);
    else if (state.error) toast.error(state.error);
  }, [state, user.displayName]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={user.id} />
      <input type="hidden" name="role" value={user.role} />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={pending}
        className="h-7 gap-1.5 border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-400/30 dark:text-emerald-400 dark:hover:bg-emerald-950"
      >
        <Check className="size-3.5" aria-hidden="true" />
        Approve
      </Button>
    </form>
  );
}

interface UserRowActionsProps {
  user: ProfileWithOffice;
  offices: Office[];
  allowedRoles: Role[];
}

function UserRowActions({ user, offices, allowedRoles }: UserRowActionsProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  return (
    <div className="flex justify-end">
      <UserDialog
        mode="edit"
        offices={offices}
        allowedRoles={allowedRoles}
        user={user}
        trigger={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${user.displayName}`}
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
      <DeleteUserDialog
        user={user}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}

interface UsersTableProps {
  users: ProfileWithOffice[];
  offices: Office[];
  allowedRoles: Role[];
}

export function UsersTable({ users, offices, allowedRoles }: UsersTableProps) {
  const columns = React.useMemo<ColumnDef<ProfileWithOffice>[]>(
    () => [
      {
        accessorKey: "displayName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Name
            <ArrowUpDown className="size-3.5" aria-hidden="true" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium text-foreground">
              {row.original.displayName}
            </p>
            {row.original.title ? (
              <p className="truncate text-xs text-muted-foreground">
                {row.original.title}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.email}
          </span>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => <RoleBadge role={row.original.role} />,
      },
      {
        id: "office",
        accessorFn: (row) => row.officeName ?? "",
        header: "Office",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.officeName ?? (
              <span className="text-muted-foreground">—</span>
            )}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            {row.original.status === "invited" ? (
              <ApproveButton user={row.original} />
            ) : null}
            <UserRowActions
              user={row.original}
              offices={offices}
              allowedRoles={allowedRoles}
            />
          </div>
        ),
      },
    ],
    [offices, allowedRoles]
  );

  if (users.length === 0) {
    return (
      <EmptyState
        icon="Users"
        title="No users yet"
        description="Add the first member of the brokerage to get started."
      >
        <UserDialog
          mode="create"
          offices={offices}
          allowedRoles={allowedRoles}
          trigger={
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" aria-hidden="true" />
                Add user
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
      data={users}
      searchKey="displayName"
      searchPlaceholder="Search users…"
    />
  );
}

export default UsersTable;
