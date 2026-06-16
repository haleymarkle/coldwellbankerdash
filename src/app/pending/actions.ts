"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isAuthConfigured } from "@/lib/auth";
import { DEV_SESSION_COOKIE, DEV_ROLE_COOKIE, DEV_USER_ID_COOKIE } from "@/lib/auth/dev-stub";

export async function signOut() {
  if (!isAuthConfigured()) {
    const jar = await cookies();
    jar.delete(DEV_SESSION_COOKIE);
    jar.delete(DEV_ROLE_COOKIE);
    jar.delete(DEV_USER_ID_COOKIE);
    redirect("/sign-in");
  }
  const { getAuth } = await import("@/lib/auth/neon");
  await getAuth().signOut();
  redirect("/sign-in");
}
