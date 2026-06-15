import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { BrandLogo } from "@/components/brand-logo";

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (await getCurrentUser()) redirect("/");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Branded navy panel — editorial luxury tone */}
      <aside className="cb-hero relative hidden flex-col justify-between p-10 text-primary-foreground lg:flex">
        <BrandLogo />
        <div className="cb-reveal max-w-md space-y-4">
          <p className="eyebrow !text-primary-foreground/70">
            Associated Brokers Realty
          </p>
          <h2 className="font-heading text-3xl font-semibold leading-tight tracking-tight">
            The internal hub for our Sioux City team.
          </h2>
          <p className="text-sm text-primary-foreground/80">
            Tools, trainings, and resources — everything you need to serve
            clients well, in one refined place.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">
          &copy; {new Date().getFullYear()} Coldwell Banker Associated Brokers
          Realty
        </p>
      </aside>

      {/* Form column */}
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
