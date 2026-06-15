import { Plus } from "lucide-react";

import { getData } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DialogTrigger } from "@/components/ui/dialog";

import { TrainingsTable } from "./trainings-table";
import { TrainingDialog } from "./training-dialog";

export const metadata = {
  title: "Trainings — Administration",
};

export default async function AdminTrainingsPage() {
  const data = await getData();
  const trainings = await data.listTrainings();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Trainings"
        description="Build the brokerage training library and set which roles each course is required for."
      >
        <TrainingDialog
          mode="create"
          trigger={
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" aria-hidden="true" />
                Add training
              </Button>
            </DialogTrigger>
          }
        />
      </PageHeader>

      <TrainingsTable trainings={trainings} />
    </div>
  );
}
