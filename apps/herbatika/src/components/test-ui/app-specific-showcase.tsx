import type { ReactNode } from "react";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox";
import { FormInput } from "@techsio/ui-kit/molecules/form-input";
import { SupportingText } from "@/components/text/supporting-text";
import { HerbaticaArticleProse } from "./herbatica-article-prose";
import { HerbaticaAuthorCard } from "./herbatica-author-card";
import { HerbaticaBlogCard } from "./herbatica-blog-card";
import {
  HerbaticaCheckoutProductRecap,
  HerbaticaCheckoutShell,
  HerbaticaCheckoutSummaryPanel,
} from "./herbatica-checkout-shell";
import { HerbaticaCompactProductCard } from "./herbatica-compact-product-card";
import { HerbaticaFilterButton } from "./herbatica-filter-button";
import { HerbaticaPhoneField } from "./herbatica-phone-field";

const APP_SPECIFIC_NOTES = [
  "Filter chip button zůstává app-specific wrapper nad button base contractem přes tailwind-variants extend.",
  "Checkout shell používá shared Steps a Button family, ale layout, summary panel a recap blok zůstávají v appce.",
  "Compact product card, blog cards a article prose jsou composition patterns, ne nový shared primitive.",
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

export function AppSpecificShowcase() {
  return (
    <div className="space-y-500">
      <section className="grid gap-300 xl:grid-cols-2">
        <ShowcaseCard
          title="1. Filter button"
          description="App wrapper pro category chips a jemnější segmented pills bez rozšíření shared Button API."
        >
          <div className="flex flex-wrap gap-150">
            <HerbaticaFilterButton selected>Najobľúbenejšie</HerbaticaFilterButton>
            <HerbaticaFilterButton badge="12">Detox</HerbaticaFilterButton>
            <HerbaticaFilterButton badge="8">Spánok</HerbaticaFilterButton>
            <HerbaticaFilterButton href="#" icon="token-icon-chevron-right">
              Zobraziť ďalšie
            </HerbaticaFilterButton>
          </div>
        </ShowcaseCard>

        <ShowcaseCard
          title="2. Phone field"
          description="Telefon s předvolbou a tooltipem jako app composition nad Select, Input a Tooltip."
        >
          <HerbaticaPhoneField id="test-ui-phone-field-standalone" />
        </ShowcaseCard>
      </section>

      <ShowcaseCard
        title="3. Checkout shell"
        description="Shared Steps zůstávají sdílené, ale shell, sidebar a recap surface jsou zatím čistě Herbatica app wrapper."
      >
        <HerbaticaCheckoutShell
          sidebar={
            <HerbaticaCheckoutSummaryPanel>
              <HerbaticaCheckoutProductRecap
                price="16,83 €"
                quantity="1 × Sofia krém"
                title="Sofia krém na žily s extraktom z pijavice lekárskej"
              />

              <div className="space-y-150 rounded-xl bg-highlight p-250">
                <div className="flex items-center justify-between gap-200 text-sm">
                  <span className="text-fg-secondary">Cena produktov</span>
                  <span className="font-medium text-fg-primary">49,00 €</span>
                </div>
                <div className="flex items-center justify-between gap-200 text-sm">
                  <span className="text-fg-secondary">Doprava</span>
                  <span className="font-medium text-fg-primary">2,99 €</span>
                </div>
                <div className="flex items-center justify-between gap-200 border-t border-border-secondary pt-150">
                  <span className="font-semibold text-fg-primary">Spolu s DPH</span>
                  <span className="text-lg font-bold text-fg-primary">51,99 €</span>
                </div>
              </div>
            </HerbaticaCheckoutSummaryPanel>
          }
          subtitle="Sem patří radio rows v jiném PR. Teď držíme jen shell, contact blok a pravý summary panel."
          title="Kontaktné údaje"
        >
          <div className="grid gap-200 md:grid-cols-2">
            <FormInput id="test-ui-first-name" defaultValue="Ján" label="Meno" required size="sm" />
            <FormInput id="test-ui-last-name" defaultValue="Novák" label="Priezvisko" required size="sm" />
            <FormInput
              defaultValue="jan.novak@herbatika.sk"
              id="test-ui-email"
              label="E-mail"
              required
              size="sm"
              type="email"
            />
            <HerbaticaPhoneField id="test-ui-phone-field-checkout" value="905 777 111" />
          </div>

          <div className="space-y-150 rounded-xl bg-highlight p-300">
            <p className="text-sm font-medium text-fg-primary">Doručovacia poznámka</p>
            <SupportingText>
              Výber dopravy a platby se bude řešit přes radio primitives v samostatném PR.
            </SupportingText>
            <FormCheckbox defaultChecked label="Chcem sa registrovať a získať výhody" size="sm" />
          </div>
        </HerbaticaCheckoutShell>
      </ShowcaseCard>

      <section className="grid gap-300 xl:grid-cols-2">
        <ShowcaseCard
          title="4. Compact product card"
          description="Lehký wrapper nad ProductCard pro bloky typu Naposledy navštívené nebo sidebar recapy."
        >
          <div className="max-w-1100">
            <HerbaticaCompactProductCard
              eyebrow="Naposledy navštívené"
              price="16,83 €"
              title="Sofia krém s extraktom z pijavice lekárskej"
            />
          </div>
        </ShowcaseCard>

        <ShowcaseCard
          title="5. Blog cards"
          description="Listing a related article karty držíme jako app-level composition nad Badge, Image a Link."
        >
          <div className="grid gap-200 lg:grid-cols-2">
            <HerbaticaBlogCard
              badge="Imunita"
              date="14. 3. 2026"
              excerpt="Praktický přehled bylin a režimových kroků, které dávají smysl při sezónní únavě."
              readingTime="4 min čtení"
              title="Ako podporiť imunitu pred jarou bez zbytočného chaosu"
              variant="listing"
            />
            <HerbaticaBlogCard
              badge="Detox"
              date="7. 3. 2026"
              excerpt="Krátká související karta pro sidebar nebo detail článku."
              title="Kedy zaradiť očistu a čo od nej realisticky čakať"
              variant="related"
            />
          </div>
        </ShowcaseCard>
      </section>

      <section className="grid gap-300 xl:grid-cols-[1.2fr_0.8fr]">
        <ShowcaseCard
          title="6. Article prose"
          description="Rich text wrapper pro single blog post bez zavádění nové shared content komponenty."
        >
          <HerbaticaArticleProse>
            <p>
              Správne načasovanie a realistické očakávania sú pri bylinkách dôležitejšie než
              ďalší agresívny detox trend.
            </p>
            <h2>Čo dáva zmysel sledovať</h2>
            <p>
              Začni tromi vecami: <strong>spánok</strong>, pitný režim a pravidelnosť. Až potom
              má zmysel riešiť podporu cez konkrétne produkty.
            </p>
            <blockquote>
              Nie každý app-level pattern treba tlačiť do shared knižnice. Najprv si over, že ho
              skutočne potrebuje viac appiek.
            </blockquote>
            <h3>Praktický postup</h3>
            <ol>
              <li>Upraviť denný režim a zásadné návyky.</li>
              <li>Pridať len 1-2 podporné produkty s jasným účelom.</li>
              <li>Vyhodnotiť efekt po pár týždňoch, nie po dvoch dňoch.</li>
            </ol>
          </HerbaticaArticleProse>
        </ShowcaseCard>

        <ShowcaseCard
          title="7. Author card"
          description="Autor box k detailu článku držíme jako čistý app composition pattern."
        >
          <HerbaticaAuthorCard
            author="Mgr. Lucia Horská"
            bio="Věnuje se fitoterapii, edukaci a praktickému překladu odborných témat do srozumitelné obsahové vrstvy pro e-shop."
            role="Odborná garantka obsahu"
          />
        </ShowcaseCard>
      </section>

      <section className="space-y-150 rounded-md border border-border-secondary bg-surface p-400">
        {APP_SPECIFIC_NOTES.map((item, index) => (
          <div className="flex items-start gap-200 rounded-sm bg-highlight px-300 py-250" key={item}>
            <Badge variant="secondary">{String(index + 1)}</Badge>
            <SupportingText className="text-fg-primary">{item}</SupportingText>
          </div>
        ))}
      </section>
    </div>
  );
}
