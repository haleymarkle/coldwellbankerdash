import { Plus } from "lucide-react";

import { getData } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DialogTrigger } from "@/components/ui/dialog";

import { OfficesTable } from "./offices-table";
import { OfficeDialog } from "./office-dialog";

export const metadata = {
  title: "Offices — Administration",
};

export default async function AdminOfficesPage() {
  const data = await getData();
  const offices = await data.listOffices();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Offices"
        description="Maintain the brokerage's office locations, regions, and active status."
      >
        <OfficeDialog
          mode="create"
          trigger={
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" aria-hidden="true" />
                Add office
              </Button>
            </DialogTrigger>
          }
        />
      </PageHeader>

      <OfficesTable offices={offices} />
    </div>
  );
}
