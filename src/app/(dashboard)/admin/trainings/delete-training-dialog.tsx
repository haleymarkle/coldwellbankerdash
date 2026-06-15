"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Training } from "@/lib/types";

import { deleteTrainingAction, type ActionState } from "./actions";

const initialState: ActionState = { ok: false };

interface DeleteTrainingDialogProps {
  training: Training;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteTrainingDialog({
  training,
  open,
  onOpenChange,
}: DeleteTrainingDialogProps) {
  const [state, formAction, pending] = useActionState(
    deleteTrainingAction,
    initialState
  );

  const handledRef = React.useRef(state);
  React.useEffect(() => {
    if (state === handledRef.current) return;
    handledRef.current = state;
    if (state.ok) {
      toast.success("Training removed.");
      onOpenChange(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading">
            Remove {training.title}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This removes the training and every assignment of it. Any progress
            agents have made will be lost. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <form action={formAction}>
            <input type="hidden" name="id" value={training.id} />
            <AlertDialogAction
              type="submit"
              disabled={pending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Remove training
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteTrainingDialog;
