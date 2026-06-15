"use client";

import { useState, useTransition } from "react";
import { CircleCheck, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import type { TrainingStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { TrainingStatusBadge } from "@/components/training-status-badge";
import { updateMyTrainingStatus } from "./actions";

interface TrainingActionsProps {
  trainingId: string;
  status: TrainingStatus;
}

const SUCCESS_COPY: Record<TrainingStatus, string> = {
  not_started: "Progress reset",
  in_progress: "Training started",
  completed: "Marked complete",
};

/**
 * Progress controls for a single training. Optimistically reflects the new
 * status, disables the button matching the current state, and surfaces the
 * outcome via a toast. Falls back to the prior status if the action fails.
 */
export function TrainingActions({
  trainingId,
  status: initialStatus,
}: TrainingActionsProps) {
  const [status, setStatus] = useState<TrainingStatus>(initialStatus);
  const [isPending, startTransition] = useTransition();

  function run(next: TrainingStatus) {
    if (next === status || isPending) return;
    const previous = status;
    setStatus(next);
    startTransition(async () => {
      const result = await updateMyTrainingStatus(trainingId, next);
      if (result.ok) {
        setStatus(result.status);
        toast.success(SUCCESS_COPY[result.status]);
      } else {
        setStatus(previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">Your progress</span>
        <TrainingStatusBadge status={status} />
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          onClick={() => run("in_progress")}
          disabled={isPending || status !== "not_started"}
        >
          <Play aria-hidden="true" />
          Start training
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => run("completed")}
          disabled={isPending || status === "completed"}
        >
          <CircleCheck aria-hidden="true" />
          Mark complete
        </Button>

        {status !== "not_started" ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => run("not_started")}
            disabled={isPending}
          >
            <RotateCcw aria-hidden="true" />
            Reset progress
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default TrainingActions;
