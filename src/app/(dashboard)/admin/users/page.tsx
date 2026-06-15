import { Plus } from "lucide-react";

import { requireRole } from "@/lib/auth";
import { getData } from "@/lib/data";
import { assignableRoles } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DialogTrigger } from "@/components/ui/dialog";

import { UsersTable } from "./users-table";
import { UserDialog } from "./user-dialog";

export const metadata = {
  title: "Users — Administration",
};

export default async function AdminUsersPage() {
  const { user } = await requireRole("high_level_user");
  const data = await getData();
  const [users, offices] = await Promise.all([
    data.listProfiles(),
    data.listOffices(),
  ]);
  const allowedRoles = assignableRoles(user.role);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Manage everyone in the brokerage — their role, office, and account status."
      >
        <UserDialog
          mode="create"
          offices={offices}
          allowedRoles={allowedRoles}
          trigger={
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" aria-hidden="true" />
                Add user
              </Button>
            </DialogTrigger>
          }
        />
      </PageHeader>

      <UsersTable users={users} offices={offices} allowedRoles={allowedRoles} />
    </div>
  );
}
