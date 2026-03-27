import NextLink from "next/link";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon";
import { Footer } from "@techsio/ui-kit/organisms/footer";
import { HerbatikaLogo } from "@/components/herbatika-logo";
import { SupportingText } from "@/components/text/supporting-text";

const FOOTER_COLUMNS = [
  {
    title: "Informácie pre vás",
    links: [
      { href: "/#blog", label: "Blog" },
      { href: "/#o-nas", label: "O nás" },
      { href: "/#caste-otazky", label: "Časté otázky" },
      { href: "/#darcekova-poukazka", label: "Darčeková poukážka" },
      { href: "/#vyrobcovia-a-znacky", label: "Výrobcovia a značky" },
      { href: "/#recenzie", label: "Recenzie" },
    ],
  },
  {
    title: "Dôležité informácie",
    links: [
      { href: "/#doprava-a-platby", label: "Doprava a platby" },
      { href: "/#reklamacia-a-vratenie", label: "Reklamácia a vrátenie" },
      { href: "/#obchodne-podmienky", label: "Obchodné podmienky" },
      { href: "/#ochrana-osobnych-udajov", label: "Ochrana osobných údajov" },
      { href: "/#cookies", label: "Cookies" },
    ],
  },
  {
    title: "Pre partnerov",
    links: [
      { href: "/#affiliate", label: "Affiliate program" },
      { href: "/#velkoobchod", label: "Veľkoobchod" },
      { href: "/#dropshipping", label: "Dropshipping" },
      { href: "/#private-label", label: "Private label" },
    ],
  },
] as const;

const FOOTER_NOTES = [
  "Shared Footer contract je pro Herbatiku správná volba; teď už jen dolaďujeme existující `--footer-*` tokeny pro `md` variantu.",
  "Do `_herbatika-footer.css` jdou jen tokeny, které se skutečně používají a opravdu se odlišují od defaultní logiky `libs/ui`.",
  "Inline className v téhle surface zůstávají jen tam, kde jde o lokální composition kolem Footer slotů, ne o nový tokenový systém vedle `libs/ui`.",
] as const;

const SOCIAL_LINKS: { href: string; icon: IconType; label: string }[] = [
  { href: "https://www.facebook.com/", icon: "icon-[mdi--facebook]", label: "Facebook" },
  { href: "https://www.instagram.com/", icon: "icon-[mdi--instagram]", label: "Instagram" },
  { href: "https://www.youtube.com/", icon: "icon-[mdi--youtube]", label: "YouTube" },
  { href: "https://www.linkedin.com/", icon: "icon-[mdi--linkedin]", label: "LinkedIn" },
  { href: "https://www.tiktok.com/", icon: "icon-[mdi--music-note]", label: "TikTok" },
];

const FOOTER_RATINGS = [
  { brand: "heureka!", score: "100%", votes: "(2129x)" },
  { brand: "zbozi.cz", score: "97%", votes: "(692x)" },
  { brand: "Google", score: "5,0/5", votes: "(5x)" },
] as const;

const FOOTER_LOCALES: { active?: boolean; code: string; icon: IconType }[] = [
  { code: "SK", icon: "icon-[cif--sk]", active: true },
  { code: "CZ", icon: "icon-[cif--cz]" },
  { code: "HU", icon: "icon-[cif--hu]" },
  { code: "RO", icon: "icon-[cif--ro]" },
];

export function FooterShowcase() {
  return (
      <section className="rounded-md border border-border-secondary bg-surface p-500">
        <Footer direction="vertical" size="md">
          <Footer.Container className="mx-auto grid-cols-1 gap-x-0 px-500 pt-850 pb-700 sm:grid-cols-2 xl:grid-cols-4 xl:gap-x-600 xl:gap-y-0">
            <Footer.Section>
              <HerbatikaLogo size="lg" />

              <Footer.Text className="leading-normal">
                Váš partner pre zdravý životný štýl a vitalitu.
              </Footer.Text>

              <Footer.Text className="mt-250 flex items-start gap-300">
                <Icon className="mt-50 text-2xl text-fg-secondary" icon="icon-[mdi--phone-outline]" />
                <span className="leading-normal">
                  <span className="block font-bold text-primary">+421 2/321 123 45</span>
                  <span className="block text-sm text-fg-secondary">(Po-Pia: 9:00 - 16:00)</span>
                </span>
              </Footer.Text>

              <Footer.Link className="mt-500 inline-flex items-center gap-300 font-bold text-primary" href="mailto:ahoj@herbatica.sk">
                <Icon className="text-2xl text-fg-secondary" icon="icon-[mdi--email-outline]" />
                ahoj@herbatica.sk
              </Footer.Link>
            </Footer.Section>

            {FOOTER_COLUMNS.map((column) => (
              <Footer.Section key={column.title}>
                <Footer.Title className="leading-relaxed uppercase">{column.title}</Footer.Title>
                <Footer.List>
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Footer.Link as={NextLink} href={link.href}>
                        {link.label}
                      </Footer.Link>
                    </li>
                  ))}
                </Footer.List>
              </Footer.Section>
            ))}
          </Footer.Container>

          <section className="mx-auto flex w-full max-w-footer-max flex-col items-start justify-between gap-550 px-500 py-700 lg:flex-row lg:items-center lg:gap-800">
            <div className="flex flex-wrap items-center gap-300">
              {SOCIAL_LINKS.map((social) => (
                <Button
                  aria-label={social.label}
                  className="h-750 w-750 rounded-full bg-bg-disabled p-0 text-fg-secondary hover:text-primary"
                  icon={social.icon}
                  iconSize="lg"
                  key={social.label}
                  onClick={() => window.open(social.href, "_blank", "noopener,noreferrer")}
                  size="current"
                  theme="unstyled"
                  type="button"
                />
              ))}
            </div>

            <div className="grid w-full gap-x-400 gap-y-300 sm:grid-cols-3 lg:w-auto lg:gap-y-0">
              {FOOTER_RATINGS.map((rating) => (
                <article className="rounded-sm bg-overlay px-500 py-500 text-center" key={rating.brand}>
                  <Footer.Text className="font-bold leading-relaxed text-fg-primary">
                    {rating.brand} <span className="text-primary">{rating.score}</span>
                  </Footer.Text>
                  <Footer.Text className="text-2xs leading-snug text-fg-disabled">
                    {rating.votes}
                  </Footer.Text>
                </article>
              ))}
            </div>
          </section>

          <Footer.Divider className="mx-auto max-w-footer-max" />
          
          <Footer.Bottom className="mx-auto w-full max-w-footer-max flex-wrap items-center gap-400">
            <Footer.Text className="leading-normal text-fg-secondary">
              Copyright 2025 <strong className="text-fg-primary">Herbatica.sk.</strong> Všetky
              práva vyhradené.{" "}
              <Footer.Link as={NextLink} className="text-primary underline" href="/#cookies">
                Upraviť nastavenie cookies
              </Footer.Link>
            </Footer.Text>

            <div className="flex flex-wrap items-center justify-start gap-150 sm:justify-end">
              {FOOTER_LOCALES.map((locale) => (
                <Button
                  icon={locale.icon}
                  iconSize="sm"
                  key={locale.code}
                  size="sm"
                  theme={locale.active ? "light" : "outlined"}
                  type="button"
                  variant={locale.active ? "primary" : "secondary"}
                >
                  {locale.code}
                </Button>
              ))}
            </div>
          </Footer.Bottom>
        </Footer>
      </section>
  );
}
