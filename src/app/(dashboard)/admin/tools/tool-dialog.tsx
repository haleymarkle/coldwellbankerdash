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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ROLES, ROLE_LABELS } from "@/lib/rbac";
import { TOOL_CATEGORIES } from "@/lib/tools-registry";
import type { Role, Tool, ToolType } from "@/lib/types";

import {
  createToolAction,
  updateToolAction,
  type ActionState,
} from "./actions";

const initialState: ActionState = { ok: false };

const TYPE_OPTIONS: { value: ToolType; label: string }[] = [
  { value: "internal_route", label: "Internal route" },
  { value: "external_link", label: "External link" },
];

interface ToolDialogProps {
  mode: "create" | "edit";
  tool?: Tool;
  trigger: React.ReactNode;
}

export function ToolDialog({ mode, tool, trigger }: ToolDialogProps) {
  const [open, setOpen] = React.useState(false);
  const action = mode === "create" ? createToolAction : updateToolAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [type, setType] = React.useState<ToolType>(tool?.type ?? "external_link");
  const [isActive, setIsActive] = React.useState(tool?.isActive ?? true);
  const [roles, setRoles] = React.useState<Role[]>(tool?.roles ?? ["agent"]);

  const handledRef = React.useRef(state);
  React.useEffect(() => {
    if (state === handledRef.current) return;
    handledRef.current = state;
    if (state.ok) {
      toast.success(mode === "create" ? "Tool created." : "Tool updated.");
      setOpen(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, mode]);

  React.useEffect(() => {
    if (open) {
      setType(tool?.type ?? "external_link");
      setIsActive(tool?.isActive ?? true);
      setRoles(tool?.roles ?? ["agent"]);
    }
  }, [open, tool]);

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
            {mode === "create" ? "Add tool" : "Edit tool"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a tool to the catalog and set which roles can access it."
              : "Update this tool's details, access, and visibility."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {mode === "edit" && tool ? (
            <input type="hidden" name="id" value={tool.id} />
          ) : null}
          <input type="hidden" name="type" value={type} />
          <input
            type="hidden"
            name="isActive"
            value={isActive ? "true" : "false"}
          />
          {roles.map((r) => (
            <input key={r} type="hidden" name="roles" value={r} />
          ))}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tool-name">Name</Label>
              <Input
                id="tool-name"
                name="name"
                defaultValue={tool?.name ?? ""}
                placeholder="Commission Calculator"
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
              <Label htmlFor="tool-slug">Slug</Label>
              <Input
                id="tool-slug"
                name="slug"
                defaultValue={tool?.slug ?? ""}
                placeholder="commission-calculator"
                required
                aria-invalid={Boolean(state.fieldErrors?.slug)}
              />
              {state.fieldErrors?.slug ? (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.slug}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tool-description">Description</Label>
            <Textarea
              id="tool-description"
              name="description"
              defaultValue={tool?.description ?? ""}
              placeholder="What this tool does and when to use it."
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tool-icon">Icon (lucide name)</Label>
              <Input
                id="tool-icon"
                name="icon"
                defaultValue={tool?.icon ?? ""}
                placeholder="Calculator"
                required
                aria-invalid={Boolean(state.fieldErrors?.icon)}
              />
              {state.fieldErrors?.icon ? (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.icon}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tool-category">Category</Label>
              <Input
                id="tool-category"
                name="category"
                list="tool-category-options"
                defaultValue={tool?.category ?? ""}
                placeholder="Transactions"
                required
                aria-invalid={Boolean(state.fieldErrors?.category)}
              />
              <datalist id="tool-category-options">
                {TOOL_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {state.fieldErrors?.category ? (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.category}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tool-type">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as ToolType)}
              >
                <SelectTrigger id="tool-type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tool-sort">Sort order</Label>
              <Input
                id="tool-sort"
                name="sortOrder"
                type="number"
                min={0}
                defaultValue={tool?.sortOrder ?? 100}
                aria-invalid={Boolean(state.fieldErrors?.sortOrder)}
              />
              {state.fieldErrors?.sortOrder ? (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.sortOrder}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tool-url">
              {type === "internal_route" ? "Internal route" : "External URL"}
            </Label>
            <Input
              id="tool-url"
              name="url"
              defaultValue={tool?.url ?? ""}
              placeholder={
                type === "internal_route"
                  ? "/tools/commission-calculator"
                  : "https://www.coldwellbanker.com"
              }
              required
              aria-invalid={Boolean(state.fieldErrors?.url)}
            />
            {state.fieldErrors?.url ? (
              <p className="text-xs text-destructive">
                {state.fieldErrors.url}
              </p>
            ) : null}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">
              Roles with access
            </legend>
            {state.fieldErrors?.roles ? (
              <p className="text-xs text-destructive">
                {state.fieldErrors.roles}
              </p>
            ) : null}
            <ScrollArea className="max-h-44">
              <div className="grid gap-2 sm:grid-cols-2">
                {ROLES.map((role) => (
                  <label
                    key={role}
                    htmlFor={`tool-role-${role}`}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      id={`tool-role-${role}`}
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
              <Label htmlFor="tool-active">Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive tools are hidden from users.
              </p>
            </div>
            <Switch
              id="tool-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              aria-label="Tool is active"
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
              {mode === "create" ? "Create tool" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ToolDialog;
