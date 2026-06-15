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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ROLES, ROLE_LABELS } from "@/lib/rbac";
import type { Role, Training } from "@/lib/types";

import {
  createTrainingAction,
  updateTrainingAction,
  type ActionState,
} from "./actions";

const initialState: ActionState = { ok: false };

interface TrainingDialogProps {
  mode: "create" | "edit";
  training?: Training;
  trigger: React.ReactNode;
}

export function TrainingDialog({ mode, training, trigger }: TrainingDialogProps) {
  const [open, setOpen] = React.useState(false);
  const action =
    mode === "create" ? createTrainingAction : updateTrainingAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [isActive, setIsActive] = React.useState(training?.isActive ?? true);
  const [roles, setRoles] = React.useState<Role[]>(
    training?.requiredForRoles ?? []
  );

  const handledRef = React.useRef(state);
  React.useEffect(() => {
    if (state === handledRef.current) return;
    handledRef.current = state;
    if (state.ok) {
      toast.success(
        mode === "create" ? "Training created." : "Training updated."
      );
      setOpen(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, mode]);

  React.useEffect(() => {
    if (open) {
      setIsActive(training?.isActive ?? true);
      setRoles(training?.requiredForRoles ?? []);
    }
  }, [open, training]);

  function toggleRole(role: Role, checked: boolean) {
    setRoles((prev) =>
      checked ? [...new Set([...prev, role])] : prev.filter((r) => r !== role)
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {mode === "create" ? "Add training" : "Edit training"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a training course and set which roles it's required for."
              : "Update this training's details and requirements."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {mode === "edit" && training ? (
            <input type="hidden" name="id" value={training.id} />
          ) : null}
          <input
            type="hidden"
            name="isActive"
            value={isActive ? "true" : "false"}
          />
          {roles.map((r) => (
            <input key={r} type="hidden" name="requiredForRoles" value={r} />
          ))}

          <div className="space-y-1.5">
            <Label htmlFor="training-title">Title</Label>
            <Input
              id="training-title"
              name="title"
              defaultValue={training?.title ?? ""}
              placeholder="Fair Housing Essentials"
              required
              aria-invalid={Boolean(state.fieldErrors?.title)}
            />
            {state.fieldErrors?.title ? (
              <p className="text-xs text-destructive">
                {state.fieldErrors.title}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="training-description">Description</Label>
            <Textarea
              id="training-description"
              name="description"
              defaultValue={training?.description ?? ""}
              placeholder="A short summary of what this training covers."
              rows={2}
              required
              aria-invalid={Boolean(state.fieldErrors?.description)}
            />
            {state.fieldErrors?.description ? (
              <p className="text-xs text-destructive">
                {state.fieldErrors.description}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="training-content">Content</Label>
            <Textarea
              id="training-content"
              name="content"
              defaultValue={training?.content ?? ""}
              placeholder="The training body — notes, instructions, or markdown."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Optional. Used for internally hosted trainings.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="training-category">Category</Label>
              <Input
                id="training-category"
                name="category"
                defaultValue={training?.category ?? ""}
                placeholder="Compliance"
                required
                aria-invalid={Boolean(state.fieldErrors?.category)}
              />
              {state.fieldErrors?.category ? (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.category}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="training-minutes">Estimated minutes</Label>
              <Input
                id="training-minutes"
                name="estimatedMinutes"
                type="number"
                min={0}
                defaultValue={training?.estimatedMinutes ?? ""}
                placeholder="30"
                aria-invalid={Boolean(state.fieldErrors?.estimatedMinutes)}
              />
              {state.fieldErrors?.estimatedMinutes ? (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.estimatedMinutes}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="training-url">External URL</Label>
            <Input
              id="training-url"
              name="url"
              defaultValue={training?.url ?? ""}
              placeholder="https://learning.coldwellbanker.com/course"
            />
            <p className="text-xs text-muted-foreground">
              Optional. Link to an external video or course.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">
              Required for roles
            </legend>
            <p className="text-xs text-muted-foreground">
              Leave all unchecked for an optional training.
            </p>
            <ScrollArea className="max-h-44">
              <div className="grid gap-2 sm:grid-cols-2">
                {ROLES.map((role) => (
                  <label
                    key={role}
                    htmlFor={`training-role-${role}`}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      id={`training-role-${role}`}
                      checked={roles.includes(role)}
                      onCheckedChange={(c) => toggleRole(role, c === true)}
                    />
                    {ROLE_LABELS[role]}
                  </label>
                ))}
              </div>
            </ScrollArea>
          </fieldset>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="training-active">Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive trainings are hidden and not assigned.
              </p>
            </div>
            <Switch
              id="training-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              aria-label="Training is active"
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
              {mode === "create" ? "Create training" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default TrainingDialog;
