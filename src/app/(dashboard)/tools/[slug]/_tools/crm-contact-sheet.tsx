"use client";

// Slide-over panel for viewing/editing a contact and its activity history.
// Also used (with no contact) as the "Add contact" form.

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  CONTACT_SOURCE_LABELS,
  CONTACT_SOURCES,
  CONTACT_STAGE_LABELS,
  CONTACT_STAGES,
  CONTACT_TYPE_LABELS,
  CONTACT_TYPES,
  formatDate,
  type Contact,
  type ContactActivity,
  type ContactSource,
  type ContactStage,
  type ContactType,
} from "@/lib/crm/types";

export interface ContactFormValues {
  name: string;
  email: string;
  phone: string;
  type: ContactType;
  stage: ContactStage | "none";
  source: ContactSource;
  nextAction: string;
  nextActionDate: string;
  ownerAgentId?: string;
}

interface AgentOption {
  id: string;
  name: string;
}

interface ContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing contact when editing; null when adding. */
  contact: Contact | null;
  activity: ContactActivity[];
  agents: AgentOption[];
  canSeeAll: boolean;
  isPending: boolean;
  onSave: (values: ContactFormValues) => void;
  onDelete: (id: string) => void;
  onAddNote: (contactId: string, note: string) => void;
}

function emptyValues(defaultOwner?: string): ContactFormValues {
  return {
    name: "",
    email: "",
    phone: "",
    type: "buyer_lead",
    stage: "new",
    source: "other",
    nextAction: "",
    nextActionDate: "",
    ownerAgentId: defaultOwner,
  };
}

export function ContactSheet({
  open,
  onOpenChange,
  contact,
  activity,
  agents,
  canSeeAll,
  isPending,
  onSave,
  onDelete,
  onAddNote,
}: ContactSheetProps) {
  const isEdit = Boolean(contact);
  const [values, setValues] = React.useState<ContactFormValues>(emptyValues());
  const [note, setNote] = React.useState("");

  // Reset form whenever the panel opens or the target contact changes.
  React.useEffect(() => {
    if (!open) return;
    if (contact) {
      setValues({
        name: contact.name,
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        type: contact.type,
        stage: contact.stage ?? "none",
        source: contact.source,
        nextAction: contact.nextAction ?? "",
        nextActionDate: contact.nextActionDate ?? "",
        ownerAgentId: contact.ownerAgentId,
      });
    } else {
      setValues(emptyValues(agents[0]?.id));
    }
    setNote("");
  }, [open, contact, agents]);

  const set = <K extends keyof ContactFormValues>(
    key: K,
    value: ContactFormValues[K]
  ) => setValues((v) => ({ ...v, [key]: value }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle className="font-heading text-xl">
            {isEdit ? contact?.name : "Add contact"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update contact details, log activity, and set the next follow-up."
              : "Create a new contact in your book of business."}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-5 p-4">
            <div className="grid gap-2">
              <Label htmlFor="crm-name">Name</Label>
              <Input
                id="crm-name"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Jane Buyer"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="crm-email">Email</Label>
                <Input
                  id="crm-email"
                  type="email"
                  value={values.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="jane@email.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="crm-phone">Phone</Label>
                <Input
                  id="crm-phone"
                  value={values.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            {canSeeAll && agents.length > 1 ? (
              <div className="grid gap-2">
                <Label>Owner</Label>
                <Select
                  value={values.ownerAgentId}
                  onValueChange={(v) => set("ownerAgentId", v)}
                  disabled={isEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={values.type}
                  onValueChange={(v) => set("type", v as ContactType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {CONTACT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Stage</Label>
                <Select
                  value={values.stage}
                  onValueChange={(v) => set("stage", v as ContactStage | "none")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No stage</SelectItem>
                    {CONTACT_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {CONTACT_STAGE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Source</Label>
              <Select
                value={values.source}
                onValueChange={(v) => set("source", v as ContactSource)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {CONTACT_SOURCE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="crm-next-action">Next action</Label>
                <Input
                  id="crm-next-action"
                  value={values.nextAction}
                  onChange={(e) => set("nextAction", e.target.value)}
                  placeholder="Call about listings"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="crm-next-date">Next action date</Label>
                <Input
                  id="crm-next-date"
                  type="date"
                  value={values.nextActionDate}
                  onChange={(e) => set("nextActionDate", e.target.value)}
                />
              </div>
            </div>

            {isEdit && contact ? (
              <>
                <Separator />
                <div className="grid gap-3">
                  <h3 className="font-heading text-sm font-semibold text-foreground">
                    Activity
                  </h3>
                  <div className="flex gap-2">
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add a note..."
                      rows={2}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!note.trim() || isPending}
                      onClick={() => {
                        onAddNote(contact.id, note);
                        setNote("");
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {activity.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No activity logged yet.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {activity.map((a) => (
                        <li
                          key={a.id}
                          className="rounded-md border bg-muted/40 p-3 text-sm"
                        >
                          <p className="text-foreground">{a.note}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(a.date)}
                            {a.author ? ` · ${a.author}` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </ScrollArea>

        <SheetFooter className="flex-row items-center justify-between border-t">
          {isEdit && contact ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={isPending}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes {contact.name} and all logged activity. This
                    can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(contact.id)}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <span />
          )}
          <Button
            type="button"
            disabled={isPending || !values.name.trim()}
            onClick={() => onSave(values)}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {isEdit ? "Save changes" : "Add contact"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
