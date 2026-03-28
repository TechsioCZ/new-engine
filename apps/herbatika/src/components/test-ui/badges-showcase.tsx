import type { ReactNode } from "react";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { SupportingText } from "@/components/text/supporting-text";

const BADGE_NOTES = [
  "Aktualni Figma potvrzuje jen promo badge family: Akcia, Novinka, Tip.",
  "Price chip -4,50 EUR pouziva stejnou ruzovou jako Akcia, ale je to druha size family.",
  "Topic pills a utility badges jsou zatim jen exploratory surface mimo tento token pass.",
] as const;

const BADGE_INVENTORY = [
  {
    figmaLabel: "Akcia",
    mapping: 'Badge variant="discount"',
    surface: "Home, category, product card, featured product",
  },
  {
    figmaLabel: "Novinka",
    mapping: 'Badge variant="success"',
    surface: "Home, category, product card",
  },
  {
    figmaLabel: "Tip",
    mapping: 'Badge variant="warning"',
    surface: "Home, category, product card",
  },
  {
    figmaLabel: "-4,50 EUR",
    mapping: "Separate price-chip pattern",
    surface: "Discount amount on product cards",
  },
] as const;

function ShowcaseCard({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
      <div className="space-y-100">
        <h2 className="text-lg font-semibold text-fg-primary">{title}</h2>
        <p className="text-sm leading-relaxed text-fg-secondary">{description}</p>
      </div>

      <div className="rounded-md bg-highlight p-400">{children}</div>
    </article>
  );
}

export function BadgesShowcase() {
  return (
    <div className="space-y-500">
      <section className="grid gap-300 xl:grid-cols-2">
          <div className="space-y-250">
            <div className="flex flex-wrap gap-150">
              {/* discount badge md */}
              <Badge variant="discount">
                Akcia
              </Badge>
              {/* primary badge md */}
              <Badge variant="success">
                Novinka
              </Badge>
              {/* secondary badge md */}
              <Badge variant="warning">
                Tip
              </Badge>
              {/* tertiary badge md */}
              <Badge variant="tertiary">Fitness</Badge>
            </div>
              {/* discount badge  */}
              <Badge variant="discount" size="lg">-4,50 EUR</Badge>
              <Badge variant="discount" size="lg" className="rounded-xl px-0 py-0 h-14 aspect-square">-29%</Badge>
        
          </div>

        <ShowcaseCard
          title="2. Topic pills"
          description="Exploratory pill usage. Neni soucasti aktualniho color token rozhodnuti."
        >
          <div className="space-y-250">
            <div className="flex flex-wrap gap-150">
              <Badge
                className="rounded-full px-200 py-100 text-2xs font-medium uppercase"
                variant="secondary"
              >
                Bylinky
              </Badge>
              <Badge
                className="rounded-full px-200 py-100 text-2xs font-medium"
                variant="secondary"
              >
                Imunita
              </Badge>
              <Badge
                className="rounded-full px-200 py-100 text-2xs font-medium"
                variant="secondary"
              >
                Detox
              </Badge>
            </div>

            <div className="rounded-2xl border border-border-secondary bg-fg-primary/70 p-300 text-fg-reverse">
              <Badge
                className="mb-150 rounded-full px-200 py-100 text-2xs font-semibold uppercase"
                variant="secondary"
              >
                Bylinky
              </Badge>
              <p className="text-sm font-bold">Hero / blog pill surface over tinted media.</p>
            </div>
          </div>
        </ShowcaseCard>
      </section>

      <section className="grid gap-300 xl:grid-cols-2">
        <ShowcaseCard
          title="3. Utility badges"
          description="Exploratory utility examples. Nejsou zdrojem pravdy pro current promo token pass."
        >
          <div className="space-y-250">
            <div className="flex flex-wrap gap-150">
              <Badge variant="info">query: caj</Badge>
              <Badge variant="secondary">nalezeno: 128</Badge>
              <Badge variant="secondary">strana: 1/8</Badge>
            </div>

            <div className="flex flex-wrap gap-150">
              <Badge variant="success">objednavka dokoncena</Badge>
              <Badge variant="warning">ceka na platbu</Badge>
              <Badge variant="info">guest rezim</Badge>
              <Badge variant="outline">app</Badge>
            </div>
          </div>
        </ShowcaseCard>

        <ShowcaseCard
          title="4. Badge inventory"
          description="Potvrzene Figma kombinace pro aktualni badge token pass."
        >
          <div className="grid gap-150">
            {BADGE_INVENTORY.map((item) => (
              <div
                className="grid gap-150 rounded-sm bg-highlight px-300 py-250 md:grid-cols-[0.8fr_1fr_1.4fr]"
                key={`${item.figmaLabel}-${item.mapping}`}
              >
                <p className="text-sm font-medium text-fg-primary">{item.figmaLabel}</p>
                <p className="text-xs leading-relaxed text-primary">{item.mapping}</p>
                <p className="text-xs leading-relaxed text-fg-secondary">{item.surface}</p>
              </div>
            ))}
          </div>
        </ShowcaseCard>
      </section>

      <section className="space-y-150 rounded-md border border-border-secondary bg-surface p-400">
        {BADGE_NOTES.map((item, index) => (
          <div
            className="flex items-start gap-200 rounded-sm bg-highlight px-300 py-250"
            key={item}
          >
            <Badge variant="secondary">{String(index + 1)}</Badge>
            <SupportingText className="text-fg-primary">{item}</SupportingText>
          </div>
        ))}
      </section>
    </div>
  );
}
