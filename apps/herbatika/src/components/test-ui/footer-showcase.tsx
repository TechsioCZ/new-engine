import NextLink from "next/link";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Footer } from "@techsio/ui-kit/organisms/footer";
import { HerbatikaLogo } from "@/components/herbatika-logo";
import { SupportingText } from "@/components/text/supporting-text";

const FOOTER_COLUMNS = [
  {
    title: "Informácie pre vás",
    links: ["Blog", "O nás", "Časté otázky", "Darčeková poukážka", "Výrobcovia a značky", "Recenzie"],
  },
  {
    title: "Dôležité informácie",
    links: ["Doprava a platby", "Reklamácia a vrátenie", "Obchodné podmienky", "Ochrana osobných údajov", "Cookies"],
  },
  {
    title: "Pre partnerov",
    links: ["Affiliate program", "Veľkoobchod", "Dropshipping", "Private label"],
  },
] as const;

const FOOTER_NOTES = [
  "Shared Footer contract dobře pokrývá column layout, titles, links a bottom row.",
  "Contact intro blok, rating cards a locale pills zůstávají app-local composition.",
  "Social icon row je vhodná jako Button theme='unstyled' pattern nad token layerem.",
] as const;

export function FooterShowcase() {
  return (
    <div className="space-y-500">
      <section className="rounded-md border border-border-secondary bg-surface p-500">
        <Footer className="w-full bg-surface max-w-none px-0 py-0" size="md">
          <Footer.Container className="mx-auto grid w-full grid-cols-1 gap-x-0 gap-y-700 px-500 pt-850 pb-700 sm:grid-cols-2 xl:grid-cols-4 xl:gap-x-600 xl:gap-y-0">
            <Footer.Section className="px-500 py-250">
              <HerbatikaLogo size="lg" />
              <Footer.Text className="max-w-footer-intro text-md leading-normal">
                Váš partner pre zdravý životný štýl a vitalitu.
              </Footer.Text>
              <Footer.Text className="mt-250 flex items-start gap-300 text-md text-primary">
                <Icon className="mt-50 text-2xl text-fg-secondary" icon="icon-[mdi--phone-outline]" />
                <span>
                  <span className="block text-md font-bold text-primary">+421 2/321 123 45</span>
                  <span className="block text-sm text-fg-secondary">(Po-Pia: 9:00 - 16:00)</span>
                </span>
              </Footer.Text>
              <Footer.Text className="mt-500 inline-flex items-center gap-300 text-md font-bold text-primary">
                <Icon className="text-2xl text-fg-secondary" icon="icon-[mdi--email-outline]" />
                ahoj@herbatica.sk
              </Footer.Text>
            </Footer.Section>

            {FOOTER_COLUMNS.map((column) => (
              <Footer.Section className="px-500 py-250" key={column.title}>
                <Footer.Title className="text-md leading-relaxed uppercase">
                  {column.title}
                </Footer.Title>
                <Footer.List className="bg-transparent">
                  {column.links.map((link) => (
                    <li key={link}>
                      <Footer.Link as={NextLink} className="text-md leading-normal" href="#">
                        {link}
                      </Footer.Link>
                    </li>
                  ))}
                </Footer.List>
              </Footer.Section>
            ))}
          </Footer.Container>

          <Footer.Divider className="mx-auto max-w-footer-max bg-border-primary" />

          <section className="mx-auto flex w-full max-w-footer-max flex-col items-start justify-between gap-550 px-500 py-700 lg:flex-row lg:items-center lg:gap-800">
            <div className="flex flex-wrap items-center gap-300">
              {[
                "icon-[mdi--facebook]",
                "icon-[mdi--instagram]",
                "icon-[mdi--youtube]",
                "icon-[mdi--linkedin]",
                "icon-[mdi--music-note]",
              ].map((icon) => (
                <Button
                  aria-label={icon}
                  className="h-750 w-750 rounded-full bg-bg-disabled text-2xl text-fg-secondary hover:text-primary"
                  icon={icon}
                  key={icon}
                  size="current"
                  theme="unstyled"
                  type="button"
                />
              ))}
            </div>

            <div className="grid w-full gap-x-400 gap-y-300 sm:grid-cols-3 lg:w-auto lg:gap-y-0">
              {[
                { brand: "heureka!", score: "100%", meta: "(2129x)" },
                { brand: "zbozi.cz", score: "97%", meta: "(692x)" },
                { brand: "Google", score: "5,0/5", meta: "(5x)" },
              ].map((rating) => (
                <div className="rounded-sm bg-overlay px-500 py-500 text-center" key={rating.brand}>
                  <Footer.Text className="text-md font-bold leading-relaxed text-fg-primary">
                    {rating.brand} <span className="text-primary">{rating.score}</span>
                  </Footer.Text>
                  <Footer.Text className="text-2xs leading-snug text-fg-disabled">
                    {rating.meta}
                  </Footer.Text>
                </div>
              ))}
            </div>
          </section>

          <Footer.Divider className="mx-auto max-w-footer-max bg-border-primary" />

          <Footer.Bottom className="mx-auto w-full max-w-footer-max flex-wrap items-center gap-400 border-0 px-500 py-600">
            <Footer.Text className="text-md leading-normal text-fg-secondary">
              Copyright 2025 <strong className="text-fg-primary">Herbatica.sk.</strong> Všetky
              práva vyhradené.{" "}
              <Footer.Link as={NextLink} className="text-primary underline" href="#">
                Upraviť nastavenie cookies
              </Footer.Link>
            </Footer.Text>

            <div className="flex flex-wrap items-center justify-start gap-150 sm:justify-end">
              {["SK", "CZ", "HU", "RO"].map((locale, index) => (
                <Badge key={locale} variant={index === 0 ? "success" : "secondary"}>
                  {locale}
                </Badge>
              ))}
            </div>
          </Footer.Bottom>
        </Footer>
      </section>

      <section className="space-y-250 rounded-md border border-border-secondary bg-surface p-400">
        <div className="space-y-100">
          <h2 className="text-lg font-semibold text-fg-primary">Footer mapping</h2>
          <SupportingText>
            Footer už teď poměrně jasně ukazuje, že nejde o chybějící shared
            component, ale o správné rozdělení mezi shared contract a app
            composition.
          </SupportingText>
        </div>

        <div className="space-y-150">
          {FOOTER_NOTES.map((item, index) => (
            <div className="flex items-start gap-200 rounded-sm bg-highlight px-300 py-250" key={item}>
              <Badge variant="secondary">{String(index + 1)}</Badge>
              <SupportingText className="text-fg-primary">{item}</SupportingText>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
