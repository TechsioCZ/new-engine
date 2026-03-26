import type { ReactNode } from "react";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { SupportingText } from "@/components/text/supporting-text";

const BADGE_NOTES = [
  "Promo flags z produktových karet se dají čistě mapovat na current Badge variants bez nového shared API.",
  "Topic pills pro hero a blog zůstávají stejný Badge primitive, jen s app-level className pro radius a spacing.",
  "Info / success / warning / outline pokrývají utility surface pro search toolbar, account a interní test-ui meta štítky.",
] as const;

const BADGE_INVENTORY = [
  {
    figmaLabel: "Akcia",
    mapping: 'Badge variant="discount"',
    surface: "Home, Category, Product, blog featured product",
  },
  {
    figmaLabel: "Novinka",
    mapping: 'Badge variant="success"',
    surface: "Home, Category, Product",
  },
  {
    figmaLabel: "Tip",
    mapping: 'Badge variant="warning"',
    surface: "Home, Category, Product",
  },
  {
    figmaLabel: "Bylinky / Imunita / Detox",
    mapping:
      'Badge variant="secondary" className="rounded-full px-200 py-100 text-2xs font-medium"',
    surface: "Hero carousel, blog listing, single blog post",
  },
  {
    figmaLabel: "query / status / count",
    mapping: 'Badge variant="info|success|warning|outline"',
    surface: "Search toolbar, account overview, internal test-ui meta",
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
        <ShowcaseCard
          title="1. Promo flags"
          description="Produktové promo badges z home/category/PDP a featured product bloků."
        >
          <div className="space-y-250">
            <div className="flex flex-wrap gap-150">
              <Badge className="rounded-md px-200 py-100 text-xs font-bold" variant="discount">
                Akcia
              </Badge>
              <Badge className="rounded-md px-200 py-100 text-xs font-bold" variant="success">
                Novinka
              </Badge>
              <Badge className="rounded-md px-200 py-100 text-xs font-bold" variant="warning">
                Tip
              </Badge>
            </div>

            <div className="rounded-2xl border border-border-secondary bg-surface p-300">
              <div className="relative overflow-hidden rounded-xl bg-base p-300">
                <div className="flex flex-wrap gap-100">
                  <Badge className="rounded-md px-200 py-100 text-xs font-bold" variant="discount">
                    Akcia
                  </Badge>
                  <Badge className="rounded-md px-200 py-100 text-xs font-bold" variant="success">
                    Novinka
                  </Badge>
                  <Badge className="rounded-md px-200 py-100 text-xs font-bold" variant="warning">
                    Tip
                  </Badge>
                </div>

                <div className="mt-300 flex items-end justify-between gap-200">
                  <div>
                    <p className="text-sm font-semibold text-fg-primary">
                      Sofia krém na žily
                    </p>
                    <p className="text-xs text-fg-secondary">produktová karta / featured produkt</p>
                  </div>
                  <div className="rounded-md bg-tertiary px-200 py-150">
                    <span className="text-xs font-bold text-fg-reverse">-4,50 €</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ShowcaseCard>

        <ShowcaseCard
          title="2. Topic pills"
          description="Hero a blog štítky jsou pořád shared Badge, jen s app-level pill stylingem."
        >
          <div className="space-y-250">
            <div className="flex flex-wrap gap-150">
              <Badge className="rounded-full px-200 py-100 text-2xs font-medium uppercase" variant="secondary">
                Bylinky
              </Badge>
              <Badge className="rounded-full px-200 py-100 text-2xs font-medium" variant="secondary">
                Imunita
              </Badge>
              <Badge className="rounded-full px-200 py-100 text-2xs font-medium" variant="secondary">
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
              <p className="text-sm font-bold">
                Hero / blog pill surface nad fotkou nebo tinted overlay.
              </p>
            </div>
          </div>
        </ShowcaseCard>
      </section>

      <section className="grid gap-300 xl:grid-cols-2">
        <ShowcaseCard
          title="3. Utility badges"
          description="Search toolbar, account stavy a interní meta štítky v test-ui."
        >
          <div className="space-y-250">
            <div className="flex flex-wrap gap-150">
              <Badge variant="info">dotaz: čaj</Badge>
              <Badge variant="secondary">nájdené: 128</Badge>
              <Badge variant="secondary">strana: 1/8</Badge>
            </div>

            <div className="flex flex-wrap gap-150">
              <Badge variant="success">objednávka dokončená</Badge>
              <Badge variant="warning">čeká na platbu</Badge>
              <Badge variant="info">guest režim</Badge>
              <Badge variant="outline">app</Badge>
            </div>
          </div>
        </ShowcaseCard>

        <ShowcaseCard
          title="4. Badge inventory"
          description="Praktické mapování Figma badge family na current libs/ui contract."
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
          <div className="flex items-start gap-200 rounded-sm bg-highlight px-300 py-250" key={item}>
            <Badge variant="secondary">{String(index + 1)}</Badge>
            <SupportingText className="text-fg-primary">{item}</SupportingText>
          </div>
        ))}
      </section>
    </div>
  );
}
