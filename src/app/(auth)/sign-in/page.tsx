import type { Metadata } from "next";

import { isAuthConfigured } from "@/lib/auth";
import { BrandLogo } from "@/components/brand-logo";
import { DevSignIn } from "./dev-sign-in";
import { ProdSignIn } from "./prod-sign-in";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  const devMode = !isAuthConfigured();

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        {/* Logo shows here on small screens where the branded panel is hidden */}
        <div className="lg:hidden">
          <BrandLogo className="[&_*]:text-foreground" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Sign in
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome back. Enter your credentials to continue.
          </p>
        </div>
      </div>

      {devMode ? <DevSignIn /> : <ProdSignIn />}
    </div>
  );
}
