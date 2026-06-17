import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { canManageOffice } from "@/lib/rbac";
import { getCrmData } from "@/lib/crm/data";

// Returns the activity history for a single contact, scoped by role: agents may
// only read their own contacts' history; office managers and above may read any.
export async function GET(request: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId");
  if (!contactId) {
    return NextResponse.json({ activity: [] });
  }

  const crm = await getCrmData();
  const contact = await crm.getContact(contactId);
  if (!contact) {
    return NextResponse.json({ activity: [] });
  }

  const canSeeAll = canManageOffice(user.role);
  if (!canSeeAll && contact.ownerAgentId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const activity = await crm.listActivity(contactId);
  return NextResponse.json({ activity });
}
