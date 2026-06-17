"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

/** Google "G" logo SVG (official brand colors). */
function GoogleLogo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

export function GoogleSignInButton() {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    // Initiate Google OAuth from the BROWSER so Better Auth can set the PKCE/
    // state cookies on the client. The client handles the redirect to Google
    // automatically; on success the user returns to `callbackURL`.
    const { error: socialError } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/sign-in?error=oauth",
    });
    if (socialError) {
      setError(socialError.message ?? "Could not start Google sign-in.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={handleClick}
        disabled={pending}
        aria-label="Continue with Google"
      >
        <GoogleLogo />
        {pending ? "Redirecting…" : "Continue with Google"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default GoogleSignInButton;
