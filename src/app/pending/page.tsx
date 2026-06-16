import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: "Account Pending Approval",
};

export default async function PendingPage() {
  const user = await getCurrentUser();

  // Not signed in at all — send to sign-in
  if (!user) redirect("/sign-in");
  // Already approved — let them in
  if (user.status === "active") redirect("/");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Branded panel */}
      <aside className="cb-hero relative hidden flex-col justify-between p-10 text-primary-foreground lg:flex">
        <BrandLogo />
        <div className="cb-reveal max-w-md space-y-4">
          <p className="eyebrow !text-primary-foreground/70">
            Associated Brokers Realty
          </p>
          <h2 className="font-heading text-3xl font-semibold leading-tight tracking-tight">
            Thanks for signing up.
          </h2>
          <p className="text-sm text-primary-foreground/80">
            Your account is in review. We&apos;ll notify you once access is approved.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">
          &copy; {new Date().getFullYear()} Coldwell Banker Associated Brokers
          Realty
        </p>
      </aside>

      {/* Message column */}
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <BrandLogo className="[&_*]:text-foreground" />
          </div>

          <div className="space-y-4">
            {/* Clock icon */}
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>

            <div className="space-y-1.5">
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                Approval pending
              </h1>
              <p className="text-sm text-muted-foreground">
                Your account has been created and is awaiting approval by an
                administrator. You&apos;ll receive access once your account is
                activated.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              Signed in as{" "}
              <span className="font-medium text-foreground">{user.email}</span>
            </div>

            <p className="text-xs text-muted-foreground">
              Questions? Contact your office manager or{" "}
              <a
                href="mailto:haleymarkle@gmail.com"
                className="underline underline-offset-4 hover:text-foreground"
              >
                haleymarkle@gmail.com
              </a>
              .
            </p>

            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
