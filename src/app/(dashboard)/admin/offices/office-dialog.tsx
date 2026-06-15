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
import { Switch } from "@/components/ui/switch";
import type { Office } from "@/lib/types";

import {
  createOfficeAction,
  updateOfficeAction,
  type ActionState,
} from "./actions";

const initialState: ActionState = { ok: false };

interface OfficeDialogProps {
  mode: "create" | "edit";
  office?: Office;
  trigger: React.ReactNode;
}

export function OfficeDialog({ mode, office, trigger }: OfficeDialogProps) {
  const [open, setOpen] = React.useState(false);
  const action = mode === "create" ? createOfficeAction : updateOfficeAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [isActive, setIsActive] = React.useState(office?.isActive ?? true);

  const handledRef = React.useRef(state);
  React.useEffect(() => {
    if (state === handledRef.current) return;
    handledRef.current = state;
    if (state.ok) {
      toast.success(mode === "create" ? "Office created." : "Office updated.");
      setOpen(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, mode]);

  React.useEffect(() => {
    if (open) setIsActive(office?.isActive ?? true);
  }, [open, office]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {mode === "create" ? "Add office" : "Edit office"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new office location for the brokerage."
              : "Update this office's location details and status."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {mode === "edit" && office ? (
            <input type="hidden" name="id" value={office.id} />
          ) : null}
          <input
            type="hidden"
            name="isActive"
            value={isActive ? "true" : "false"}
          />

          <div className="space-y-1.5">
            <Label htmlFor="office-name">Office name</Label>
            <Input
              id="office-name"
              name="name"
              defaultValue={office?.name ?? ""}
              placeholder="Associated Brokers Realty — Sioux City"
              required
              aria-invalid={Boolean(state.fieldErrors?.name)}
            />
            {state.fieldErrors?.name ? (
              <p className="text-xs text-destructive">
                {state.fieldErrors.name}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="office-address">Address</Label>
            <Input
              id="office-address"
              name="addressLine1"
              defaultValue={office?.addressLine1 ?? ""}
              placeholder="1222 Pierce Street"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="office-city">City</Label>
              <Input
                id="office-city"
                name="city"
                defaultValue={office?.city ?? ""}
                placeholder="Sioux City"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="office-state">State</Label>
              <Input
                id="office-state"
                name="state"
                defaultValue={office?.state ?? ""}
                placeholder="IA"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="office-postal">Postal code</Label>
              <Input
                id="office-postal"
                name="postalCode"
                defaultValue={office?.postalCode ?? ""}
                placeholder="51105"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="office-region">Region</Label>
            <Input
              id="office-region"
              name="region"
              defaultValue={office?.region ?? ""}
              placeholder="Siouxland"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="office-active">Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive offices stay on record but are hidden from selection.
              </p>
            </div>
            <Switch
              id="office-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              aria-label="Office is active"
            />
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
              {mode === "create" ? "Create office" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default OfficeDialog;
