import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { getData } from "@/lib/data";
import { ROLE_LABELS } from "@/lib/rbac";
import type { Tool, TrainingWithProgress } from "@/lib/types";

import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { TrainingStatusBadge } from "@/components/training-status-badge";
import { LucideIcon } from "@/components/lucide-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default async function DashboardHomePage() {
  const user = await requireUser();
  const data = await getData();

  const [dash, tools] = await Promise.all([
    data.getDashboardData(user),
    data.getToolsForUser(user),
  ]);

  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const quickTools = tools.slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Hero band */}
      <section
        className="cb-hero cb-reveal relative overflow-hidden rounded-2xl p-6 text-zinc-100 shadow-sm md:p-8"
        style={{ animationDelay: "0ms" }}
      >
        <p className="eyebrow text-zinc-300/90">
          Coldwell Banker Associated Brokers Realty
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-300 md:text-base">
          {ROLE_LABELS[user.role]}
          {user.officeName ? (
            <>
              <span aria-hidden="true" className="px-2 text-zinc-500">
                &middot;
              </span>
              {user.officeName}
            </>
          ) : null}
        </p>
      </section>

      {/* KPI stats */}
      <section
        className="cb-reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        style={{ animationDelay: "80ms" }}
        aria-label="Your activity at a glance"
      >
        <StatCard
          label="Tools available"
          value={dash.toolCount}
          icon="Wrench"
          hint="Across your workspace"
        />
        <StatCard
          label="Trainings assigned"
          value={dash.stats.assigned}
          icon="GraduationCap"
          hint={`${dash.stats.inProgress} in progress`}
        />
        <StatCard
          label="Completed"
          value={dash.stats.completed}
          icon="CircleCheck"
          hint={`${dash.stats.notStarted} not started`}
        />
        <StatCard
          label="Completion"
          value={`${dash.stats.completionPct}%`}
          icon="TrendingUp"
          hint="Of assigned trainings"
        />
      </section>

      {/* Quick launch */}
      <section
        className="cb-reveal space-y-4"
        style={{ animationDelay: "160ms" }}
        aria-labelledby="quick-launch-heading"
      >
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="eyebrow">Quick launch</p>
            <h2
              id="quick-launch-heading"
              className="font-heading text-xl font-semibold tracking-tight text-foreground md:text-2xl"
            >
              Your tools
            </h2>
          </div>
          {tools.length > quickTools.length ? (
            <Link
              href="/tools"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-cb-blue hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              View all
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>

        {quickTools.length === 0 ? (
          <EmptyState
            icon="Wrench"
            title="No tools available yet"
            description="When tools are granted to your role, they'll appear here for quick access."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickTools.map((tool) => (
              <QuickToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </section>

      {/* Your trainings */}
      <section
        className="cb-reveal space-y-4"
        style={{ animationDelay: "240ms" }}
        aria-labelledby="trainings-heading"
      >
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="eyebrow">Keep learning</p>
            <h2
              id="trainings-heading"
              className="font-heading text-xl font-semibold tracking-tight text-foreground md:text-2xl"
            >
              Your trainings
            </h2>
          </div>
          {dash.recentTrainings.length > 0 ? (
            <Link
              href="/trainings"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-cb-blue hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              View all
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>

        {dash.recentTrainings.length === 0 ? (
          <EmptyState
            icon="GraduationCap"
            title="No trainings assigned"
            description="You're all caught up. New trainings assigned to you will show up here."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dash.recentTrainings.map((training) => (
              <TrainingCard key={training.id} training={training} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function QuickToolCard({ tool }: { tool: Tool }) {
  const isExternal = tool.type === "external_link";

  const body = (
    <Card className="group h-full transition-shadow hover:shadow-md">
      <CardContent className="flex h-full items-start gap-4">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-cb-blue"
        >
          <LucideIcon name={tool.icon} fallback="Wrench" className="size-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-heading truncate text-base font-semibold text-foreground">
              {tool.name}
            </h3>
            {isExternal ? (
              <ExternalLink
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            ) : (
              <ArrowUpRight
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            )}
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {tool.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (isExternal) {
    return (
      <a
        href={tool.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={`${tool.name} (opens in a new tab)`}
      >
        {body}
      </a>
    );
  }

  return (
    <Link
      href={tool.url}
      className="block rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {body}
    </Link>
  );
}

function TrainingCard({ training }: { training: TrainingWithProgress }) {
  const status = training.assignment?.status ?? "not_started";
  const isInProgress = status === "in_progress";

  return (
    <Link
      href={`/trainings/${training.id}`}
      className="block rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Card className="group h-full transition-shadow hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <p className="eyebrow truncate">{training.category}</p>
            <TrainingStatusBadge status={status} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="font-heading text-base font-semibold text-foreground">
              {training.title}
            </h3>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {training.description}
            </p>
          </div>
          {isInProgress ? (
            <div className="space-y-1.5">
              <Progress value={50} aria-label="Training progress" />
              <p className="text-xs text-muted-foreground">In progress</p>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-sm font-medium text-cb-blue">
              {status === "completed" ? "Review" : "Start training"}
              <ArrowUpRight
                className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
