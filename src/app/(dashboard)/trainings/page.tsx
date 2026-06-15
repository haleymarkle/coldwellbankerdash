import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { getData } from "@/lib/data";
import type { TrainingStatus, TrainingWithProgress } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { TrainingStatusBadge } from "@/components/training-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock } from "lucide-react";

export const metadata = {
  title: "My Trainings",
};

/** Sort order used for the assigned list: active work first, then completed. */
const STATUS_RANK: Record<TrainingStatus, number> = {
  in_progress: 0,
  not_started: 1,
  completed: 2,
};

/** Map a training's status to a deterministic progress percentage. */
function progressFor(status: TrainingStatus): number {
  if (status === "completed") return 100;
  if (status === "in_progress") return 50;
  return 0;
}

function statusOf(item: TrainingWithProgress): TrainingStatus {
  return item.assignment?.status ?? "not_started";
}

export default async function TrainingsPage() {
  const user = await requireUser();
  const data = await getData();
  const [items, stats] = await Promise.all([
    data.getAssignedTrainings(user.id),
    data.getUserTrainingStats(user.id),
  ]);

  const sorted = [...items].sort((a, b) => {
    const rank = STATUS_RANK[statusOf(a)] - STATUS_RANK[statusOf(b)];
    if (rank !== 0) return rank;
    return a.title.localeCompare(b.title);
  });

  const description =
    stats.assigned === 0
      ? "Your assigned learning will appear here."
      : `${stats.completed} of ${stats.assigned} complete · ${stats.completionPct}% of your curriculum finished.`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Learning"
        title="My Trainings"
        description={description}
      />

      <section
        aria-label="Training progress summary"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <div className="cb-reveal" style={{ animationDelay: "0ms" }}>
          <StatCard label="Assigned" value={stats.assigned} icon="BookOpen" />
        </div>
        <div className="cb-reveal" style={{ animationDelay: "60ms" }}>
          <StatCard
            label="In Progress"
            value={stats.inProgress}
            icon="CircleDashed"
          />
        </div>
        <div className="cb-reveal" style={{ animationDelay: "120ms" }}>
          <StatCard
            label="Completed"
            value={stats.completed}
            icon="CircleCheck"
          />
        </div>
        <div className="cb-reveal" style={{ animationDelay: "180ms" }}>
          <StatCard
            label="Completion"
            value={`${stats.completionPct}%`}
            icon="TrendingUp"
            hint={stats.assigned > 0 ? `${stats.notStarted} not started` : undefined}
          />
        </div>
      </section>

      {sorted.length === 0 ? (
        <EmptyState
          icon="GraduationCap"
          title="No trainings assigned yet"
          description="When your manager assigns courses, they'll show up here with your progress."
        />
      ) : (
        <ul aria-label="Assigned trainings" className="space-y-4">
          {sorted.map((item, index) => {
            const status = statusOf(item);
            const pct = progressFor(status);
            return (
              <li
                key={item.id}
                className="cb-reveal"
                style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{item.category}</Badge>
                        <TrainingStatusBadge status={status} />
                        {item.estimatedMinutes ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock aria-hidden="true" className="size-3.5" />
                            {item.estimatedMinutes} min
                          </span>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                          {item.title}
                        </h2>
                        {item.description ? (
                          <p className="line-clamp-2 max-w-2xl text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="max-w-md space-y-1.5">
                        <Progress
                          value={pct}
                          aria-label={`Progress for ${item.title}`}
                        />
                        <p className="text-xs text-muted-foreground">
                          {pct}% complete
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 md:pt-1">
                      <Button asChild variant={status === "completed" ? "outline" : "default"}>
                        <Link href={`/trainings/${item.id}`}>
                          {status === "not_started"
                            ? "Start training"
                            : status === "in_progress"
                              ? "Continue"
                              : "Review"}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
