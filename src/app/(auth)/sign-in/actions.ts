"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isAuthConfigured } from "@/lib/auth";
import {
  DEV_ROLE_COOKIE,
  DEV_SESSION_COOKIE,
} from "@/lib/auth/dev-stub";

export interface SignInState {
  error?: string;
}

/**
 * Sign-in server action used with `useActionState`.
 * - DEV: look up the profile by email in the DB and set a session cookie.
 * - PROD: authenticate via Neon Auth (Better Auth) email/password.
 */
export async function signIn(
  _prevState: SignInState | undefined,
  formData: FormData
): Promise<SignInState | undefined> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  if (!isAuthConfigured()) {
    // Dev mode: look up the profile by email; any non-empty password is accepted.
    const { getData } = await import("@/lib/data");
    const api = await getData();
    const profile = await api.getProfileByEmail(email);

    if (!profile) {
      return { error: "No account found with that email address." };
    }

    const jar = await cookies();
    jar.set(DEV_SESSION_COOKIE, "1", { path: "/" });
    jar.set(DEV_ROLE_COOKIE, profile.role, { path: "/" });
    // Store the real userId so the app loads the correct profile from the DB.
    jar.set("cb_dev_user_id", profile.userId, { path: "/" });
    redirect("/");
  }

  const { getAuth } = await import("@/lib/auth/neon");
  const { error } = await getAuth().signIn.email({ email, password });
  if (error) {
    return { error: error.message ?? "Unable to sign in. Check your details." };
  }

  redirect("/");
}

/**
 * Initiate Google OAuth sign-in (prod only).
 * Returns the redirect URL to send the browser to.
 */
export async function signInWithGoogle(): Promise<{ url: string } | { error: string }> {
  if (!isAuthConfigured()) {
    return { error: "Google sign-in is only available in production." };
  }
  const { getAuth } = await import("@/lib/auth/neon");
  const { data, error } = await getAuth().signIn.social({
    provider: "google",
    callbackURL: "/",
  });
  if (error || !data?.url) {
    return { error: error?.message ?? "Could not initiate Google sign-in." };
  }
  return { url: data.url };
}
