"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLES } from "@/lib/rbac";
import type { Role } from "@/lib/types";
import { signIn, type SignInState } from "./actions";

function RoleButton({ role }: { role: Role }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="role"
      value={role}
      variant="outline"
      disabled={pending}
      className="h-auto w-full justify-between gap-3 px-4 py-3 text-left whitespace-normal"
    >
      <span className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground">{ROLE_LABELS[role]}</span>
        <span className="text-xs font-normal text-muted-foreground">
          {ROLE_DESCRIPTIONS[role]}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Button>
  );
}

/** DEV preview sign-in: pick a role to explore the app without a database. */
export function DevSignIn() {
  const [, formAction] = useActionState<SignInState | undefined, FormData>(
    signIn,
    undefined
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        No database is wired yet — pick a role to explore.
      </div>
      <div className="space-y-2.5">
        {ROLES.map((role) => (
          <RoleButton key={role} role={role} />
        ))}
      </div>
    </form>
  );
}

export default DevSignIn;
