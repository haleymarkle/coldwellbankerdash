"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/rbac";
import type { Office, ProfileWithOffice, Role, UserStatus } from "@/lib/types";

import {
  createUserAction,
  updateUserAction,
  type ActionState,
} from "./actions";

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "disabled", label: "Disabled" },
];

const initialState: ActionState = { ok: false };

interface UserDialogProps {
  mode: "create" | "edit";
  offices: Office[];
  allowedRoles: Role[];
  user?: ProfileWithOffice;
  /** Render-prop trigger element (e.g. a menu item or button). */
  trigger: React.ReactNode;
}

export function UserDialog({
  mode,
  offices,
  allowedRoles,
  user,
  trigger,
}: UserDialogProps) {
  const [open, setOpen] = React.useState(false);
  const action = mode === "create" ? createUserAction : updateUserAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  // Controlled values for Select fields (so they post via hidden inputs).
  const [role, setRole] = React.useState<Role>(
    user?.role ?? allowedRoles[allowedRoles.length - 1] ?? "agent"
  );
  const [status, setStatus] = React.useState<UserStatus>(
    user?.status ?? "invited"
  );
  const [officeId, setOfficeId] = React.useState<string>(
    user?.officeId ?? "none"
  );

  const handledRef = React.useRef(state);
  React.useEffect(() => {
    if (state === handledRef.current) return;
    handledRef.current = state;
    if (state.ok) {
      toast.success(
        mode === "create" ? "User created." : "User updated."
      );
      setOpen(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, mode]);

  // Reset controlled fields whenever the dialog opens.
  React.useEffect(() => {
    if (open) {
      setRole(user?.role ?? allowedRoles[allowedRoles.length - 1] ?? "agent");
      setStatus(user?.status ?? "invited");
      setOfficeId(user?.officeId ?? "none");
    }
  }, [open, user, allowedRoles]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {mode === "create" ? "Add user" : "Edit user"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Invite a new member of the brokerage and set their role and office."
              : "Update this member's details, role, office, and status."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {mode === "edit" && user ? (
            <input type="hidden" name="id" value={user.id} />
          ) : null}
          {/* Hidden inputs mirror the controlled Selects so they post. */}
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="status" value={status} />
          <input
            type="hidden"
            name="officeId"
            value={officeId === "none" ? "" : officeId}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="user-name">Full name</Label>
              <Input
                id="user-name"
                name="displayName"
                defaultValue={user?.displayName ?? ""}
                placeholder="Jordan Avery"
                required
                aria-invalid={Boolean(state.fieldErrors?.displayName)}
              />
              {state.fieldErrors?.displayName ? (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.displayName}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                name="email"
                type="email"
                defaultValue={user?.email ?? ""}
                placeholder="jordan@cbabr.com"
                required
                aria-invalid={Boolean(state.fieldErrors?.email)}
              />
              {state.fieldErrors?.email ? (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger id="user-role" className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {allowedRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.fieldErrors?.role ? (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.role}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as UserStatus)}
              >
                <SelectTrigger id="user-status" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-office">Office</Label>
              <Select value={officeId} onValueChange={setOfficeId}>
                <SelectTrigger id="user-office" className="w-full">
                  <SelectValue placeholder="Select office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No office</SelectItem>
                  {offices.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-title">Title</Label>
              <Input
                id="user-title"
                name="title"
                defaultValue={user?.title ?? ""}
                placeholder="Sales Associate"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : mode === "create" ? (
                <Plus className="size-4" aria-hidden="true" />
              ) : null}
              {mode === "create" ? "Create user" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default UserDialog;
