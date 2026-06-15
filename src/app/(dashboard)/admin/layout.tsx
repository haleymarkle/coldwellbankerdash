import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, allowed } = await requireRole("high_level_user");

  if (!allowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md text-center">
          <CardHeader className="items-center">
            <span
              aria-hidden="true"
              className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
            >
              <ShieldAlert className="size-6" />
            </span>
            <CardTitle className="font-heading text-xl">
              Access restricted
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              The administration area is limited to leadership and platform
              administrators. Your current role does not have access.
            </p>
            <p>
              If you believe this is a mistake, please contact your office
              manager or a platform administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminNav />
      {children}
    </div>
  );
}
