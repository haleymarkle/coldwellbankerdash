"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isAuthConfigured } from "@/lib/auth";
import {
  DEV_ROLE_COOKIE,
  DEV_SESSION_COOKIE,
} from "@/lib/auth/dev-stub";
import { ROLES } from "@/lib/rbac";
import type { Role } from "@/lib/types";

export interface SignInState {
  error?: string;
}

function isRole(value: FormDataEntryValue | null): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}

/**
 * Sign-in server action used with `useActionState`.
 * - DEV: set the stub session + chosen role cookies, then enter the app.
 * - PROD: authenticate via Neon Auth (Better Auth) email/password.
 */
export async function signIn(
  _prevState: SignInState | undefined,
  formData: FormData
): Promise<SignInState | undefined> {
  if (!isAuthConfigured()) {
    const role = formData.get("role");
    const selectedRole: Role = isRole(role) ? role : "master_admin";

    const jar = await cookies();
    jar.set(DEV_SESSION_COOKIE, "1", { path: "/" });
    jar.set(DEV_ROLE_COOKIE, selectedRole, { path: "/" });
    redirect("/");
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const { getAuth } = await import("@/lib/auth/neon");
  const { error } = await getAuth().signIn.email({ email, password });
  if (error) {
    return { error: error.message ?? "Unable to sign in. Check your details." };
  }

  redirect("/");
}
