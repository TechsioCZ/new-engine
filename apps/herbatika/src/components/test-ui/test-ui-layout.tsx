"use client"
import type { PropsWithChildren, ReactNode } from "react";
import NextLink from "next/link";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { TEST_UI_SURFACES, type TestUiSurface } from "./surface-registry";

type TestUiLayoutProps = PropsWithChildren<{
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
}>;

export function TestUiLayout({
  title,
  description,
  eyebrow = "Herbatika Test UI",
  actions,
  children,
}: TestUiLayoutProps) {
  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-600 px-400 py-550 lg:px-550">
      <header className="space-y-250 rounded-md border border-border-secondary bg-surface p-500">
        <div className="flex flex-wrap items-center justify-between gap-250">
          <div className="space-y-150">
            <p className="text-sm font-semibold text-primary">{eyebrow}</p>
            <h1 className="text-3xl font-semibold text-fg-primary">{title}</h1>
            <p className="max-w-4xl text-sm leading-relaxed text-fg-secondary">
              {description}
            </p>
          </div>
          {actions}
        </div>
      </header>

      {children}
    </main>
  );
}

type SurfaceCardProps = {
  surface: TestUiSurface;
};

export function TestUiSurfaceCard({ surface }: SurfaceCardProps) {
  return (
    <article className="flex h-full flex-col gap-250 rounded-md border border-border-secondary bg-surface p-400">
      <div className="flex items-start justify-between gap-200">
        <div className="space-y-100">
          <h2 className="text-lg font-semibold text-fg-primary">{surface.title}</h2>
          <p className="text-sm leading-relaxed text-fg-secondary">
            {surface.description}
          </p>
        </div>
        <Badge variant={surface.status === "ready" ? "success" : "warning"}>
          {surface.status === "ready" ? "ready" : "planned"}
        </Badge>
      </div>

      <p className="text-xs leading-relaxed text-fg-tertiary">{surface.notes}</p>

      <div className="mt-auto pt-150">
        <LinkButton as={NextLink} href={surface.href} size="sm" variant="secondary">
          Otevřít showcase
        </LinkButton>
      </div>
    </article>
  );
}

export function TestUiSurfaceGrid() {
  return (
    <section className="grid gap-300 md:grid-cols-2 xl:grid-cols-3">
      {TEST_UI_SURFACES.map((surface) => (
        <TestUiSurfaceCard key={surface.id} surface={surface} />
      ))}

      <article className="flex h-full flex-col gap-250 rounded-md border border-border-secondary bg-surface p-400">
        <div className="flex items-start justify-between gap-200">
          <div className="space-y-100">
            <h2 className="text-lg font-semibold text-fg-primary">All-in-one review</h2>
            <p className="text-sm leading-relaxed text-fg-secondary">
              Jeden souhrnný canvas pro všechny hotové test-ui surface.
            </p>
          </div>
          <Badge variant="success">ready</Badge>
        </div>

        <p className="text-xs leading-relaxed text-fg-tertiary">
          Vhodné pro rychlý vizuální průchod před cutoverem do reálné appky.
        </p>

        <div className="mt-auto pt-150">
          <LinkButton as={NextLink} href="/test-ui/all" size="sm" variant="secondary">
            Otevřít canvas
          </LinkButton>
        </div>
      </article>
    </section>
  );
}

type PlaceholderProps = {
  title: string;
  summary: string;
  nextSteps: string[];
};

export function TestUiPlaceholder({
  title,
  summary,
  nextSteps,
}: PlaceholderProps) {
  return (
    <section className="space-y-300 rounded-md border border-border-secondary bg-surface p-500">
      <div className="space-y-150">
        <h2 className="text-xl font-semibold text-fg-primary">{title}</h2>
        <p className="text-sm leading-relaxed text-fg-secondary">{summary}</p>
      </div>
      <div className="space-y-150">
        {nextSteps.map((step, index) => (
          <div
            className="flex items-start gap-200 rounded-sm bg-highlight px-300 py-250"
            key={`${title}-${index + 1}`}
          >
            <Badge variant="secondary">{String(index + 1)}</Badge>
            <p className="text-sm leading-relaxed text-fg-primary">{step}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TestUiBackLink() {
  return (
    <LinkButton
      as={NextLink}
      href="/test-ui"
      size="sm"
      theme="outlined"
      variant="secondary"
    >
      Zpět na přehled
    </LinkButton>
  );
}
