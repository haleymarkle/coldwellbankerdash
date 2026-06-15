"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { isAuthConfigured } from "@/lib/auth";
import { DEV_ROLE_COOKIE, DEV_SESSION_COOKIE } from "@/lib/auth/dev-stub";
import type { Role } from "@/lib/types";

/**
 * Sign the current user out.
 * - Dev: clear the stub session + role cookies, then return to sign-in.
 * - Prod: hand off to the Neon Auth (Better Auth) sign-out endpoint.
 */
export async function signOut(): Promise<void> {
  if (isAuthConfigured()) {
    // TODO: confirm the Better Auth sign-out route for the Neon Auth handler;
    // this best-effort redirect may need adjustment once auth is wired in prod.
    redirect("/api/auth/sign-out");
  }

  const jar = await cookies();
  jar.delete(DEV_SESSION_COOKIE);
  jar.delete(DEV_ROLE_COOKIE);
  redirect("/sign-in");
}

/** DEV-only: switch the previewed role and refresh the shell. */
export async function setDevRole(role: Role): Promise<void> {
  const jar = await cookies();
  jar.set(DEV_ROLE_COOKIE, role, { path: "/" });
  revalidatePath("/", "layout");
}
