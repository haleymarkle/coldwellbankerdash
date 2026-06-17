"use client";

// Dialog shown when marking a follow-up "Done": logs an activity note and sets
// (or clears) the next follow-up action + date.

import * as React from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { Contact } from "@/lib/crm/types";

export interface FollowUpResult {
  note: string;
  nextAction: string | null;
  nextActionDate: string | null;
}

interface FollowUpDialogProps {
  contact: Contact | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (contactId: string, result: FollowUpResult) => void;
}

export function FollowUpDialog({
  contact,
  isPending,
  onOpenChange,
  onComplete,
}: FollowUpDialogProps) {
  const [note, setNote] = React.useState("");
  const [nextAction, setNextAction] = React.useState("");
  const [nextDate, setNextDate] = React.useState("");

  React.useEffect(() => {
    if (contact) {
      setNote("");
      setNextAction("");
      setNextDate("");
    }
  }, [contact]);

  return (
    <Dialog open={Boolean(contact)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Complete follow-up</DialogTitle>
          <DialogDescription>
            {contact
              ? `Log this touch with ${contact.name} and set the next step.`
              : null}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="fu-note">What happened?</Label>
            <Textarea
              id="fu-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                contact?.nextAction
                  ? `Completed: ${contact.nextAction}`
                  : "Left a voicemail, sent listings..."
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="fu-next">Next action</Label>
              <Input
                id="fu-next"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="Leave blank to clear"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fu-next-date">Next date</Label>
              <Input
                id="fu-next-date"
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={isPending}
            onClick={() =>
              contact &&
              onComplete(contact.id, {
                note,
                nextAction: nextAction.trim() || null,
                nextActionDate: nextDate || null,
              })
            }
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            Mark done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
