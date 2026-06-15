import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ExternalLink } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { getData } from "@/lib/data";
import type { TrainingStatus } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { TrainingStatusBadge } from "@/components/training-status-badge";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TrainingActions } from "./training-actions";

interface TrainingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TrainingDetailPage({
  params,
}: TrainingDetailPageProps) {
  const { id } = await params;
  const user = await requireUser();
  const data = await getData();

  const training = await data.getTrainingById(id);
  if (!training || !training.isActive) notFound();

  const items = await data.getAssignedTrainings(user.id);
  const assigned = items.find((item) => item.id === id);
  const status: TrainingStatus = assigned?.assignment?.status ?? "not_started";
  const isAssigned = Boolean(assigned);

  return (
    <div className="space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground"
      >
        <Link href="/trainings">
          <ArrowLeft aria-hidden="true" />
          Back to trainings
        </Link>
      </Button>

      <PageHeader eyebrow="Learning" title={training.title} />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{training.category}</Badge>
        <TrainingStatusBadge status={status} />
        {training.estimatedMinutes ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock aria-hidden="true" className="size-3.5" />
            {training.estimatedMinutes} min
          </span>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="space-y-6">
              {training.description ? (
                <p className="text-base leading-relaxed text-foreground">
                  {training.description}
                </p>
              ) : null}

              {training.url ? (
                <div>
                  <Button asChild variant="outline">
                    <a
                      href={training.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink aria-hidden="true" />
                      Open course
                    </a>
                  </Button>
                </div>
              ) : null}

              {training.content ? (
                <>
                  {training.description || training.url ? <Separator /> : null}
                  <div className="space-y-4">
                    <p className="eyebrow">Course material</p>
                    <div className="space-y-4 text-sm leading-relaxed text-foreground">
                      {training.content
                        .split(/\n{2,}/)
                        .map((paragraph) => paragraph.trim())
                        .filter(Boolean)
                        .map((paragraph, index) => (
                          <p key={index} className="whitespace-pre-line">
                            {paragraph}
                          </p>
                        ))}
                    </div>
                  </div>
                </>
              ) : null}

              {!training.description && !training.content && !training.url ? (
                <EmptyState
                  icon="FileText"
                  title="No course material yet"
                  description="This training doesn't have any content attached. Check back later."
                />
              ) : null}
            </CardContent>
          </Card>
        </div>

        <aside className="lg:col-span-1">
          <Card className="lg:sticky lg:top-6">
            <CardContent>
              {isAssigned ? (
                <TrainingActions trainingId={training.id} status={status} />
              ) : (
                <div className="space-y-2 text-center">
                  <p className="eyebrow">Your progress</p>
                  <p className="text-sm text-muted-foreground">
                    This training isn&apos;t assigned to you, so there&apos;s
                    nothing to track. You can still review the material above.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
