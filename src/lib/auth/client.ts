"use client";

// Browser-side Neon Auth (Better Auth) client. Used for OAuth flows that must
// run in the browser so the PKCE/state cookies are set on the client before
// redirecting to the provider. Initiating social sign-in from a server action
// instead causes the OAuth state to be lost and the callback to loop back to
// /sign-in.
import { createAuthClient } from "@neondatabase/neon-js/auth/next";

export const authClient = createAuthClient();
