"use client"
import type { ReactNode } from "react";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";

type ButtonInventoryItem = {
  figmaName: string;
  figmaLabel: string;
  mapping: string;
  notes: string;
};

const BUTTON_INVENTORY: ButtonInventoryItem[] = [
  {
    figmaName: "Button - CTA",
    figmaLabel: "Zistiť viac",
    mapping: 'Button theme="solid" variant="primary" size="md"',
    notes: "Hlavní zelené CTA s pill radius. Typography je blíž Open Sans Bold.",
  },
  {
    figmaName: "Button - Add to cart",
    figmaLabel: "Do košíka",
    mapping:
      'Button theme="solid" variant="primary" size="md" icon="token-icon-cart"',
    notes: "Ikona vlevo, kompaktnější spacing a mírně menší radius než hlavní CTA.",
  },
  {
    figmaName: "Button - View more",
    figmaLabel: "Zobraziť všetky",
    mapping:
      'LinkButton theme="unstyled" variant="secondary" size="current" icon="token-icon-chevron-right" iconPosition="right"',
    notes: "Text-link CTA. Potřebuje Verdana-style typography a underline treatment.",
  },
  {
    figmaName: "Button - CTA",
    figmaLabel: "Odporúčame",
    mapping: 'Button theme="outlined" variant="primary" size="md"',
    notes: "Outlined pill s primární zelenou linkou a textem.",
  },
];

type ShowcaseCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  code: string;
};

function ShowcaseCard({ title, description, children, code }: ShowcaseCardProps) {
  return (
    <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
      <div className="space-y-100">
        <h2 className="text-lg font-semibold text-fg-primary">{title}</h2>
        <p className="text-sm leading-relaxed text-fg-secondary">{description}</p>
      </div>

      <div className="rounded-md bg-highlight p-400">{children}</div>

      <div className="rounded-sm border border-border-secondary bg-base px-300 py-250">
        <code className="text-xs leading-relaxed text-fg-primary">{code}</code>
      </div>
    </article>
  );
}

export function ButtonShowcase() {
  return (
    <div className="space-y-500">
      <section className="grid gap-300 xl:grid-cols-2">
        <ShowcaseCard
          title="1. CTA"
          description="Figma node `63:1127` - hlavní solid CTA."
          code={`<Button theme="solid" variant="primary" size="md">Zistiť viac</Button>`}
        >
          <Button size="md" variant="primary">
            Zistiť viac
          </Button>
        </ShowcaseCard>

        <ShowcaseCard
          title="2. Add to cart"
          description="Figma node `63:1130` - compact CTA s ikonou vlevo."
          code={`<Button theme="solid" variant="primary" size="md" icon="token-icon-cart">Do košíka</Button>`}
        >
          <Button icon="token-icon-cart" size="md" variant="primary">
            Do košíka
          </Button>
        </ShowcaseCard>

        <ShowcaseCard
          title="3. View more"
          description="Figma node `63:1145` - text-link CTA s pravou šipkou."
          code={`<LinkButton theme="unstyled" variant="secondary" size="current" icon="token-icon-chevron-right" iconPosition="right">Zobraziť všetky</LinkButton>`}
        >
          <LinkButton
            href="#"
            icon="token-icon-chevron-right"
            iconPosition="right"
            size="current"
            theme="unstyled"
            variant="secondary"
          >
            Zobraziť všetky
          </LinkButton>
        </ShowcaseCard>

        <ShowcaseCard
          title="4. Outlined pill"
          description="Figma node `63:6559` - pill outlined CTA."
          code={`<Button theme="outlined" variant="primary" size="md">Odporúčame</Button>`}
        >
          <Button size="md" theme="outlined" variant="primary">
            Odporúčame
          </Button>
        </ShowcaseCard>
      </section>

      <section className="space-y-250 rounded-md border border-border-secondary bg-surface p-400">
        <div className="space-y-100">
          <h2 className="text-lg font-semibold text-fg-primary">Figma inventory</h2>
          <p className="text-sm leading-relaxed text-fg-secondary">
            Tohle je první explicitní mapování Figma button family na current
            `libs/ui` contract.
          </p>
        </div>

        <div className="grid gap-200">
          {BUTTON_INVENTORY.map((item) => (
            <div
              className="grid gap-150 rounded-sm bg-highlight px-300 py-250 md:grid-cols-[1.2fr_1fr_1.5fr]"
              key={`${item.figmaName}-${item.figmaLabel}`}
            >
              <div className="space-y-50">
                <Badge variant="secondary">{item.figmaName}</Badge>
                <p className="text-sm font-medium text-fg-primary">{item.figmaLabel}</p>
              </div>
              <p className="text-xs leading-relaxed text-primary">{item.mapping}</p>
              <p className="text-xs leading-relaxed text-fg-secondary">{item.notes}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
