"use client";

import * as React from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { assignTrainingToProfile } from "./actions";

interface AssignTrainingProps {
  profileId: string;
  profileName: string;
  trainings: { id: string; title: string }[];
}

/**
 * Dialog to assign a training to a single agent. Picks from the brokerage's
 * trainings and calls the server action, which re-checks authorization and the
 * agent's office membership server-side.
 */
export function AssignTraining({
  profileId,
  profileName,
  trainings,
}: AssignTrainingProps) {
  const [open, setOpen] = React.useState(false);
  const [trainingId, setTrainingId] = React.useState<string>("");
  const [isPending, startTransition] = React.useTransition();

  const selectId = React.useId();
  const hasTrainings = trainings.length > 0;

  // Reset the selection whenever the dialog re-opens.
  React.useEffect(() => {
    if (open) setTrainingId("");
  }, [open]);

  function handleAssign() {
    if (!trainingId) {
      toast.error("Pick a training first.");
      return;
    }

    const training = trainings.find((t) => t.id === trainingId);

    startTransition(async () => {
      const result = await assignTrainingToProfile(profileId, trainingId);
      if (result.ok) {
        toast.success(
          training
            ? `Assigned “${training.title}” to ${profileName}.`
            : `Training assigned to ${profileName}.`
        );
        setOpen(false);
      } else {
        toast.error(result.error ?? "Could not assign that training.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <GraduationCap className="size-4" aria-hidden="true" />
          Assign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Assign training</DialogTitle>
          <DialogDescription>
            Choose a training to assign to {profileName}.
          </DialogDescription>
        </DialogHeader>

        {hasTrainings ? (
          <div className="space-y-2 py-2">
            <Label htmlFor={selectId}>Training</Label>
            <Select value={trainingId} onValueChange={setTrainingId}>
              <SelectTrigger id={selectId} className="w-full">
                <SelectValue placeholder="Select a training…" />
              </SelectTrigger>
              <SelectContent>
                {trainings.map((training) => (
                  <SelectItem key={training.id} value={training.id}>
                    {training.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <EmptyState
            icon="GraduationCap"
            title="No trainings available"
            description="Create a training in the admin area before assigning it to agents."
          />
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" type="button">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={!hasTrainings || !trainingId || isPending}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {isPending ? "Assigning…" : "Assign training"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AssignTraining;
