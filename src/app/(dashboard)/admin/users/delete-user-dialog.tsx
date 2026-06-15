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
import type { ProfileWithOffice } from "@/lib/types";

import { deleteUserAction, type ActionState } from "./actions";

const initialState: ActionState = { ok: false };

interface DeleteUserDialogProps {
  user: ProfileWithOffice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
}: DeleteUserDialogProps) {
  const [state, formAction, pending] = useActionState(
    deleteUserAction,
    initialState
  );

  const handledRef = React.useRef(state);
  React.useEffect(() => {
    if (state === handledRef.current) return;
    handledRef.current = state;
    if (state.ok) {
      toast.success("User removed.");
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
            Remove {user.displayName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes {user.displayName} ({user.email}) and any
            training assignments. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <form action={formAction}>
            <input type="hidden" name="id" value={user.id} />
            <AlertDialogAction
              type="submit"
              disabled={pending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Remove user
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteUserDialog;
