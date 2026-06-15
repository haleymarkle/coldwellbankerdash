import { ShieldAlert } from "lucide-react";

import { requireRole } from "@/lib/auth";
import { getData } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { RoleBadge } from "@/components/role-badge";
import { AssignTraining } from "./assign-training";

export default async function TeamPage() {
  const { user, allowed } = await requireRole("office_manager");

  if (!allowed) {
    return (
      <Card className="mx-auto max-w-md border-destructive/30">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <span
            aria-hidden="true"
            className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive"
          >
            <ShieldAlert className="size-5" />
          </span>
          <div className="space-y-1">
            <h1 className="font-heading text-lg font-semibold text-foreground">
              Access restricted
            </h1>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              You don&apos;t have access to this area. The My Office view is for
              office managers and above.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user.officeId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Your office"
          title="My Office"
          description="Agents in your office and their training progress."
        />
        <EmptyState
          icon="Building2"
          title="You're not assigned to an office"
          description="Once a master admin assigns you to an office, your agents and their training progress will appear here."
        />
      </div>
    );
  }

  const data = await getData();
  const [rows, office, allTrainings] = await Promise.all([
    data.getOfficeProgress(user.officeId),
    data.getOffice(user.officeId),
    data.listTrainings(),
  ]);

  const trainings = allTrainings.map((t) => ({ id: t.id, title: t.title }));

  const agentCount = rows.length;
  const avgCompletion =
    agentCount === 0
      ? 0
      : Math.round(
          rows.reduce((sum, r) => sum + r.completionPct, 0) / agentCount
        );
  const totalCompleted = rows.reduce((sum, r) => sum + r.completed, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your office"
        title={office?.name ?? "My Office"}
        description="Agents in your office and their training progress."
      />

      <div
        className="cb-reveal grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        style={{ animationDelay: "60ms" }}
      >
        <StatCard
          label="Agents"
          value={agentCount}
          icon="Users"
          hint={office?.name ? `In ${office.name}` : undefined}
        />
        <StatCard
          label="Avg. completion"
          value={`${avgCompletion}%`}
          icon="TrendingUp"
          hint="Across assigned trainings"
        />
        <StatCard
          label="Trainings completed"
          value={totalCompleted}
          icon="CircleCheck"
          hint="Office-wide"
        />
      </div>

      <Card
        className="cb-reveal overflow-hidden"
        style={{ animationDelay: "120ms" }}
      >
        <CardContent className="p-0">
          {agentCount === 0 ? (
            <div className="p-4 md:p-6">
              <EmptyState
                icon="Users"
                title="No agents in this office yet"
                description="When agents are added to your office, they'll show up here with their training progress."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Assigned</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">In progress</TableHead>
                    <TableHead className="w-[180px]">Completion</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Assign training</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.profile.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {row.profile.displayName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.profile.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={row.profile.role} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.assigned}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.completed}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.inProgress}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={row.completionPct}
                            className="h-1.5"
                            aria-label={`${row.profile.displayName}: ${row.completionPct}% complete`}
                          />
                          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                            {row.completionPct}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <AssignTraining
                          profileId={row.profile.id}
                          profileName={row.profile.displayName}
                          trainings={trainings}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
