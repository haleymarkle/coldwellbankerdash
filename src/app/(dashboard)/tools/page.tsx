import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { getData } from "@/lib/data";
import { TOOL_CATEGORIES } from "@/lib/tools-registry";
import type { Tool } from "@/lib/types";

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

export default async function ToolsPage() {
  const user = await requireUser();
  const data = await getData();
  const tools = await data.getToolsForUser(user);

  // Order categories by the canonical registry order, then sort tools within a
  // category by sortOrder. Only keep categories that actually have tools, and
  // append any "uncategorized" buckets the registry order didn't anticipate.
  const byCategory = new Map<string, Tool[]>();
  for (const tool of tools) {
    const bucket = byCategory.get(tool.category) ?? [];
    bucket.push(tool);
    byCategory.set(tool.category, bucket);
  }
  for (const bucket of byCategory.values()) {
    bucket.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const orderedCategories = [
    ...TOOL_CATEGORIES.filter((c) => byCategory.has(c)),
    ...[...byCategory.keys()].filter(
      (c) => !TOOL_CATEGORIES.includes(c as (typeof TOOL_CATEGORIES)[number]),
    ),
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Resources"
        title="Tools"
        description="Apps and resources available to your role."
      />

      {tools.length === 0 ? (
        <EmptyState
          icon="Wrench"
          title="No tools available yet"
          description="You don't have any tools assigned to your role right now. Check back soon or reach out to your office manager."
        />
      ) : (
        <div className="space-y-10">
          {orderedCategories.map((category, sectionIndex) => {
            const categoryTools = byCategory.get(category) ?? [];
            return (
              <section
                key={category}
                aria-labelledby={`tools-${category}`}
                className="space-y-4"
              >
                <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
                  <h2
                    id={`tools-${category}`}
                    className="font-heading text-xl font-semibold tracking-tight text-foreground"
                  >
                    {category}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {categoryTools.length}{" "}
                    {categoryTools.length === 1 ? "tool" : "tools"}
                  </span>
                </div>

                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {categoryTools.map((tool, toolIndex) => (
                    <li
                      key={tool.id}
                      className="cb-reveal"
                      style={{
                        animationDelay: `${(sectionIndex * 3 + toolIndex) * 60}ms`,
                      }}
                    >
                      <ToolCard tool={tool} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const isExternal = tool.type === "external_link";

  return (
    <Card className="group h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
          >
            <LucideIcon name={tool.icon} className="size-5" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="font-heading text-base">{tool.name}</CardTitle>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{tool.category}</Badge>
              {isExternal ? <Badge variant="outline">External</Badge> : null}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <CardDescription className="line-clamp-3 text-sm">
          {tool.description}
        </CardDescription>
      </CardContent>

      <CardFooter className="border-t pt-4">
        {isExternal ? (
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <a
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${tool.name} in a new tab`}
            >
              Open
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </Button>
        ) : (
          <Button asChild className="w-full sm:w-auto">
            <Link
              href={`/tools/${tool.slug}`}
              aria-label={`Open ${tool.name}`}
            >
              Open
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
