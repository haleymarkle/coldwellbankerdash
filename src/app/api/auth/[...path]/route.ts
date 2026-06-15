// Neon Auth (Better Auth) API route. Proxies sign-up, sign-in, and session
// requests to Neon Auth. Active in production (NEON_AUTH_BASE_URL configured);
// returns 503 in dev where auth isn't wired (the dev stub handles sign-in instead).
import { isAuthConfigured } from "@/lib/auth";
import { getAuth } from "@/lib/auth/neon";

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, ctx: RouteContext) {
  if (!isAuthConfigured()) {
    return new Response("Auth not configured", { status: 503 });
  }
  return getAuth().handler().GET(request, ctx);
}

export async function POST(request: Request, ctx: RouteContext) {
  if (!isAuthConfigured()) {
    return new Response("Auth not configured", { status: 503 });
  }
  return getAuth().handler().POST(request, ctx);
}
