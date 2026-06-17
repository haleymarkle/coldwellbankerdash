"use client";

// Company CRM — list, follow-ups, and pipeline board. Contacts load server-side
// (already scoped to the current user's role) and mutate via server actions
// backed by Neon. The contact detail/edit lives in a slide-over panel.

import * as React from "react";
import {
  CalendarClock,
  KanbanSquare,
  Plus,
  Search,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  CONTACT_FILTER_LABELS,
  CONTACT_STAGE_LABELS,
  CONTACT_TYPE_LABELS,
  PIPELINE_STAGES,
  formatDate,
  isDue,
  isOverdue,
  matchesFilter,
  matchesSearch,
  todayIso,
  type Contact,
  type ContactActivity,
  type ContactFilter,
  type ContactStage,
  type ContactWithOwner,
} from "@/lib/crm/types";
import {
  ContactSheet,
  type ContactFormValues,
} from "./crm-contact-sheet";
import {
  FollowUpDialog,
  type FollowUpResult,
} from "./crm-followup-dialog";
import {
  addNoteAction,
  completeFollowUpAction,
  createContactAction,
  deleteContactAction,
  setStageAction,
  updateContactAction,
} from "./crm-actions";

interface AgentOption {
  id: string;
  name: string;
}

interface CompanyCrmProps {
  initialContacts: ContactWithOwner[];
  agents: AgentOption[];
  currentUserId: string;
  canSeeAll: boolean;
}

const FILTERS: ContactFilter[] = ["all", "leads", "active", "past", "referrals"];

const TYPE_BADGE: Record<string, string> = {
  buyer_lead: "bg-sky-100 text-sky-800",
  seller_lead: "bg-amber-100 text-amber-800",
  active_client: "bg-teal-100 text-teal-800",
  past_client: "bg-slate-200 text-slate-700",
  referral_sphere: "bg-indigo-100 text-indigo-800",
};

function NextActionCell({ contact }: { contact: Contact }) {
  const today = todayIso();
  if (!contact.nextActionDate && !contact.nextAction) {
    return <span className="text-muted-foreground">—</span>;
  }
  const overdue = isOverdue(contact.nextActionDate, today);
  const due = isDue(contact.nextActionDate, today);
  return (
    <div className="flex flex-col">
      <span className="text-foreground">{contact.nextAction || "Follow up"}</span>
      {contact.nextActionDate ? (
        <span
          className={cn(
            "text-xs",
            overdue
              ? "font-medium text-destructive"
              : due
                ? "font-medium text-destructive"
                : "text-muted-foreground"
          )}
        >
          {formatDate(contact.nextActionDate)}
          {overdue ? " · Overdue" : due ? " · Today" : ""}
        </span>
      ) : null}
    </div>
  );
}

function TypeBadge({ type }: { type: Contact["type"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        TYPE_BADGE[type] ?? "bg-muted text-muted-foreground"
      )}
    >
      {CONTACT_TYPE_LABELS[type]}
    </span>
  );
}

export function CompanyCrm({
  initialContacts,
  agents,
  currentUserId,
  canSeeAll,
}: CompanyCrmProps) {
  const [contacts, setContacts] = React.useState<ContactWithOwner[]>(initialContacts);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<ContactFilter>("all");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  // Slide-over state
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Contact | null>(null);
  const [activity, setActivity] = React.useState<ContactActivity[]>([]);

  // Follow-up dialog state
  const [followUp, setFollowUp] = React.useState<Contact | null>(null);

  const ownerName = React.useCallback(
    (id: string) => agents.find((a) => a.id === id)?.name ?? null,
    [agents]
  );

  function run<T>(
    action: () => Promise<{ ok: boolean; error?: string; data?: T }>,
    onSuccess: (data: T) => void
  ) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      onSuccess(res.data as T);
    });
  }

  const upsertContact = (c: Contact) =>
    setContacts((prev) => {
      const withOwner: ContactWithOwner = {
        ...c,
        ownerName: ownerName(c.ownerAgentId),
      };
      const idx = prev.findIndex((p) => p.id === c.id);
      if (idx === -1) return [withOwner, ...prev];
      const next = [...prev];
      next[idx] = withOwner;
      return next;
    });

  // ----- Handlers -------------------------------------------------------

  function openAdd() {
    setEditing(null);
    setActivity([]);
    setSheetOpen(true);
  }

  function openContact(contact: Contact) {
    setEditing(contact);
    setActivity([]);
    setSheetOpen(true);
    // Load activity lazily via a server action call is overkill; instead we ship
    // it through addNote responses. For existing history we fetch on open.
    void fetch(`/api/crm/activity?contactId=${contact.id}`)
      .then((r) => (r.ok ? r.json() : { activity: [] }))
      .then((d: { activity: ContactActivity[] }) => setActivity(d.activity ?? []))
      .catch(() => setActivity([]));
  }

  function handleSave(values: ContactFormValues) {
    const payload = {
      name: values.name.trim(),
      email: values.email.trim() || null,
      phone: values.phone.trim() || null,
      type: values.type,
      stage: values.stage === "none" ? null : values.stage,
      source: values.source,
      nextAction: values.nextAction.trim() || null,
      nextActionDate: values.nextActionDate || null,
    };
    if (editing) {
      run(
        () => updateContactAction(editing.id, payload),
        (c: Contact) => {
          upsertContact(c);
          setSheetOpen(false);
        }
      );
    } else {
      run(
        () =>
          createContactAction({
            ...payload,
            ownerAgentId: values.ownerAgentId ?? currentUserId,
          }),
        (c: Contact) => {
          upsertContact(c);
          setSheetOpen(false);
        }
      );
    }
  }

  function handleDelete(id: string) {
    run(
      () => deleteContactAction(id),
      () => {
        setContacts((prev) => prev.filter((c) => c.id !== id));
        setSheetOpen(false);
      }
    );
  }

  function handleAddNote(contactId: string, note: string) {
    run(
      () => addNoteAction({ contactId, note }),
      (a: ContactActivity) => setActivity((prev) => [a, ...prev])
    );
  }

  function handleCompleteFollowUp(contactId: string, result: FollowUpResult) {
    run(
      () =>
        completeFollowUpAction({
          contactId,
          note: result.note,
          nextAction: result.nextAction,
          nextActionDate: result.nextActionDate,
        }),
      (data: { contact: Contact }) => {
        upsertContact(data.contact);
        setFollowUp(null);
      }
    );
  }

  function handleSetStage(contact: Contact, stage: ContactStage) {
    // Optimistic move on the board.
    upsertContact({ ...contact, stage });
    run(
      () => setStageAction(contact.id, stage),
      (c: Contact) => upsertContact(c)
    );
  }

  // ----- Derived data ---------------------------------------------------

  const filtered = React.useMemo(
    () =>
      contacts.filter(
        (c) => matchesFilter(c, filter) && matchesSearch(c, query)
      ),
    [contacts, filter, query]
  );

  const dueToday = React.useMemo(() => {
    const today = todayIso();
    return contacts
      .filter((c) => isDue(c.nextActionDate, today))
      .sort((a, b) =>
        (a.nextActionDate ?? "").localeCompare(b.nextActionDate ?? "")
      );
  }, [contacts]);

  const boardContacts = React.useMemo(
    () => filtered.filter((c) => c.stage && PIPELINE_STAGES.includes(c.stage)),
    [filtered]
  );

  // ----- Render ---------------------------------------------------------

  return (
    <div className="space-y-6">
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <Tabs defaultValue="list" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="list">
              <Users className="size-4" aria-hidden="true" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="followups">
              <CalendarClock className="size-4" aria-hidden="true" />
              Follow-ups
              {dueToday.length > 0 ? (
                <Badge variant="secondary" className="ml-1.5">
                  {dueToday.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="pipeline">
              <KanbanSquare className="size-4" aria-hidden="true" />
              Pipeline
            </TabsTrigger>
          </TabsList>
          <Button onClick={openAdd}>
            <Plus className="size-4" aria-hidden="true" />
            Add contact
          </Button>
        </div>

        {/* ---- Contact list ---- */}
        <TabsContent value="list" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, phone"
                className="pl-9"
                aria-label="Search contacts"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    filter === f
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                  aria-pressed={filter === f}
                >
                  {CONTACT_FILTER_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Stage</TableHead>
                    {canSeeAll ? <TableHead>Owner</TableHead> : null}
                    <TableHead>Next action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={canSeeAll ? 5 : 4}
                        className="py-10 text-center text-muted-foreground"
                      >
                        {contacts.length === 0
                          ? "No contacts yet. Add your first one to get started."
                          : "No contacts match your search."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((c) => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer"
                        onClick={() => openContact(c)}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {c.name}
                            </span>
                            {c.email || c.phone ? (
                              <span className="text-xs text-muted-foreground">
                                {c.email ?? c.phone}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TypeBadge type={c.type} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.stage ? CONTACT_STAGE_LABELS[c.stage] : "—"}
                        </TableCell>
                        {canSeeAll ? (
                          <TableCell className="text-muted-foreground">
                            {c.ownerName ?? "—"}
                          </TableCell>
                        ) : null}
                        <TableCell>
                          <NextActionCell contact={c} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Follow-ups due ---- */}
        <TabsContent value="followups" className="space-y-4">
          {dueToday.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarClock
                  className="mx-auto mb-3 size-8 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="font-heading text-lg text-foreground">
                  You&apos;re all caught up
                </p>
                <p className="text-sm text-muted-foreground">
                  No follow-ups are due today.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Next action</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dueToday.map((c) => {
                      const overdue = isOverdue(c.nextActionDate);
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <button
                              type="button"
                              className="font-medium text-foreground hover:underline"
                              onClick={() => openContact(c)}
                            >
                              {c.name}
                            </button>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {c.nextAction || "Follow up"}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "text-sm font-medium",
                                "text-destructive"
                              )}
                            >
                              {formatDate(c.nextActionDate)}
                              {overdue ? " · Overdue" : " · Today"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setFollowUp(c)}
                            >
                              Done
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---- Pipeline board ---- */}
        <TabsContent value="pipeline">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PIPELINE_STAGES.map((stage) => {
              const inStage = boardContacts.filter((c) => c.stage === stage);
              return (
                <div
                  key={stage}
                  className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-sm font-semibold text-foreground">
                      {CONTACT_STAGE_LABELS[stage]}
                    </h3>
                    <Badge variant="secondary">{inStage.length}</Badge>
                  </div>
                  <div className="flex flex-col gap-2">
                    {inStage.map((c) => (
                      <PipelineCard
                        key={c.id}
                        contact={c}
                        onOpen={() => openContact(c)}
                        onMove={(s) => handleSetStage(c, s)}
                      />
                    ))}
                    {inStage.length === 0 ? (
                      <p className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
                        No contacts
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <ContactSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        contact={editing}
        activity={activity}
        agents={agents}
        canSeeAll={canSeeAll}
        isPending={isPending}
        onSave={handleSave}
        onDelete={handleDelete}
        onAddNote={handleAddNote}
      />

      <FollowUpDialog
        contact={followUp}
        isPending={isPending}
        onOpenChange={(open) => {
          if (!open) setFollowUp(null);
        }}
        onComplete={handleCompleteFollowUp}
      />
    </div>
  );
}

function PipelineCard({
  contact,
  onOpen,
  onMove,
}: {
  contact: ContactWithOwner;
  onOpen: () => void;
  onMove: (stage: ContactStage) => void;
}) {
  const idx = PIPELINE_STAGES.indexOf(contact.stage as ContactStage);
  const prev = idx > 0 ? PIPELINE_STAGES[idx - 1] : null;
  const next =
    idx >= 0 && idx < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[idx + 1] : null;
  return (
    <div className="rounded-md border bg-background p-3 shadow-sm">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left"
      >
        <p className="font-medium text-foreground">{contact.name}</p>
        <p className="text-xs text-muted-foreground">
          {CONTACT_TYPE_LABELS[contact.type]}
        </p>
        {contact.nextAction ? (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {contact.nextAction}
          </p>
        ) : null}
      </button>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={!prev}
          onClick={() => prev && onMove(prev)}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Move to previous stage"
        >
          ← Back
        </button>
        <button
          type="button"
          disabled={!next}
          onClick={() => next && onMove(next)}
          className="text-xs font-medium text-primary hover:underline disabled:opacity-30"
          aria-label="Move to next stage"
        >
          Advance →
        </button>
      </div>
    </div>
  );
}
