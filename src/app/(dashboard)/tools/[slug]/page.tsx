import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Lock } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { getData } from "@/lib/data";
import { isBuiltInternalTool } from "@/lib/tools-registry";
import { canAccessTool } from "@/lib/rbac";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { LucideIcon } from "@/components/lucide-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { CommissionCalculator } from "./_tools/commission-calculator";

interface ToolPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;

  const data = await getData();
  const tool = await data.getToolBySlug(slug);
  if (!tool) notFound();

  const user = await requireUser();

  const backLink = (
    <Button asChild variant="ghost" size="sm">
      <Link href="/tools">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Tools
      </Link>
    </Button>
  );

  if (!canAccessTool(user, tool)) {
    return (
      <div className="space-y-8">
        {backLink}
        <PageHeader eyebrow="Resources" title={tool.name} />
        <Card className="mx-auto max-w-lg text-center">
          <CardHeader className="items-center">
            <span
              aria-hidden="true"
              className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
            >
              <Lock className="size-5" />
            </span>
            <CardTitle className="font-heading text-lg">
              You don&apos;t have access to this tool
            </CardTitle>
            <CardDescription>
              This resource isn&apos;t available for your role. If you think you
              need access, reach out to your office manager.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center border-t pt-4">
            <Button asChild variant="outline">
              <Link href="/tools">Browse available tools</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {backLink}
      <PageHeader
        eyebrow="Resources"
        title={tool.name}
        description={tool.description}
      >
        <Badge variant="secondary">{tool.category}</Badge>
      </PageHeader>

      {renderToolBody()}
    </div>
  );

  function renderToolBody() {
    if (tool!.type === "external_link") {
      return (
        <Card className="mx-auto max-w-lg text-center">
          <CardHeader className="items-center">
            <span
              aria-hidden="true"
              className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-primary"
            >
              <LucideIcon name={tool!.icon} className="size-6" />
            </span>
            <CardTitle className="font-heading text-lg">
              {tool!.name}
            </CardTitle>
            <CardDescription>
              This resource opens in an external system. Select continue to open
              it in a new tab.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center border-t pt-4">
            <Button asChild>
              <a
                href={tool!.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${tool!.name} in a new tab`}
              >
                Continue to {tool!.name}
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </Button>
          </CardFooter>
        </Card>
      );
    }

    if (isBuiltInternalTool(tool!.slug)) {
      if (tool!.slug === "commission-calculator") {
        return <CommissionCalculator />;
      }
    }

    return (
      <EmptyState
        icon={tool!.icon}
        title="Coming soon"
        description="This tool is being built and will be available here shortly. Thanks for your patience."
      >
        <Button asChild variant="outline">
          <Link href="/tools">Back to Tools</Link>
        </Button>
      </EmptyState>
    );
  }
}
