// Neon Auth (Better Auth) API route. Proxies sign-up, sign-in, and session
// requests to Neon Auth. Active in production (NEON_AUTH_BASE_URL configured).
import { auth } from "@/lib/auth/neon";

export const { GET, POST } = auth.handler();
