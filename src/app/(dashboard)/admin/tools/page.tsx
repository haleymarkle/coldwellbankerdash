import { Plus } from "lucide-react";

import { getData } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DialogTrigger } from "@/components/ui/dialog";

import { ToolsTable } from "./tools-table";
import { ToolDialog } from "./tool-dialog";

export const metadata = {
  title: "Tools — Administration",
};

export default async function AdminToolsPage() {
  const data = await getData();
  const tools = (await data.listTools()).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Tools"
        description="Configure the tool catalog, its categories, and which roles can access each tool."
      >
        <ToolDialog
          mode="create"
          trigger={
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" aria-hidden="true" />
                Add tool
              </Button>
            </DialogTrigger>
          }
        />
      </PageHeader>

      <ToolsTable tools={tools} />
    </div>
  );
}
