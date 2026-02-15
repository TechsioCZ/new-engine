"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import type { IconType } from "@techsio/ui-kit/atoms/icon";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Footer } from "@techsio/ui-kit/organisms/footer";
import { HerbatikaLogo } from "./herbatika-logo";

const FOOTER_SECTIONS = [
  {
    title: "INFORMÁCIE PRE VÁS",
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
    title: "DÔLEŽITÉ INFORMÁCIE",
    links: [
      { href: "/#doprava-a-platby", label: "Doprava a platby" },
      { href: "/#reklamacia-a-vratenie", label: "Reklamácia a vrátenie" },
      { href: "/#obchodne-podmienky", label: "Obchodné podmienky" },
      { href: "/#ochrana-osobnych-udajov", label: "Ochrana osobných údajov" },
      { href: "/#cookies", label: "Cookies" },
    ],
  },
  {
    title: "PRE PARTNEROV",
    links: [
      { href: "/#affiliate", label: "Affiliate program" },
      { href: "/#velkoobchod", label: "Veľkoobchod" },
      { href: "/#dropshipping", label: "Dropshipping" },
      { href: "/#private-label", label: "Private label" },
    ],
  },
];

const SOCIAL_LINKS: { href: string; label: string; icon: IconType }[] = [
  {
    href: "https://www.facebook.com/",
    label: "Facebook",
    icon: "icon-[mdi--facebook]",
  },
  {
    href: "https://www.instagram.com/",
    label: "Instagram",
    icon: "icon-[mdi--instagram]",
  },
  {
    href: "https://www.youtube.com/",
    label: "YouTube",
    icon: "icon-[mdi--youtube]",
  },
  {
    href: "https://www.linkedin.com/",
    label: "LinkedIn",
    icon: "icon-[mdi--linkedin]",
  },
  {
    href: "https://www.tiktok.com/",
    label: "TikTok",
    icon: "icon-[mdi--music-note]",
  },
];

const REVIEW_BADGES = [
  { brand: "heureka!", score: "100%", votes: "(2129x)" },
  { brand: "zbozi.cz", score: "97%", votes: "(692x)" },
  { brand: "Google", score: "5,0/5", votes: "(5x)" },
];

const LANGUAGES: { code: string; icon: IconType; active?: boolean }[] = [
  { code: "SK", icon: "icon-[cif--sk]", active: true },
  { code: "CZ", icon: "icon-[cif--cz]" },
  { code: "HU", icon: "icon-[cif--hu]" },
  { code: "RO", icon: "icon-[cif--ro]" },
];

export function HerbatikaFooter() {
  return (
    <Footer
      className="w-full bg-surface max-w-none px-0 py-0"
      direction="vertical"
    >
      <Footer.Container className="mx-auto grid w-full grid-cols-1 gap-x-0 gap-y-700 px-500 pt-850 pb-700 sm:grid-cols-2 xl:grid-cols-4 xl:gap-y-0">
        <Footer.Section className="px-500 py-250">
          <HerbatikaLogo className="inline-flex" size="lg" />

          <Footer.Text className="max-w-sm text-md leading-normal">
            Váš partner pre zdravý životný štýl a vitalitu.
          </Footer.Text>

          <Footer.Text className="mt-250 flex items-start gap-300 text-md text-primary">
            <Icon
              className="mt-50 text-2xl text-fg-secondary"
              icon="icon-[mdi--phone-outline]"
            />
            <span className="leading-normal">
              <span className="block text-md font-bold text-primary">
                +421 2/321 123 45
              </span>
              <span className="block text-sm text-fg-secondary">
                (Po-Pia: 9:00 - 16:00)
              </span>
            </span>
          </Footer.Text>

          <Footer.Link
            className="mt-500 inline-flex items-center gap-300 text-md font-bold text-primary"
            href="mailto:ahoj@herbatica.sk"
          >
            <Icon
              className="text-2xl text-fg-secondary"
              icon="icon-[mdi--email-outline]"
            />
            ahoj@herbatica.sk
          </Footer.Link>
        </Footer.Section>

        {FOOTER_SECTIONS.map((section) => (
          <Footer.Section className="px-500 py-250" key={section.title}>
            <Footer.Title className="text-md leading-relaxed uppercase">
              {section.title}
            </Footer.Title>
            <Footer.List className="bg-transparent">
              {section.links.map((link) => (
                <li className="pb-150 last:pb-0" key={link.href}>
                  <Footer.Link
                    className="text-md leading-normal"
                    href={link.href}
                  >
                    {link.label}
                  </Footer.Link>
                </li>
              ))}
            </Footer.List>
          </Footer.Section>
        ))}
      </Footer.Container>

      <Footer.Divider className="mx-auto max-w-footer-max bg-bg-disabled" />

      <section className="mx-auto flex w-full max-w-footer-max flex-col items-start justify-between gap-550 px-500 py-750 lg:flex-row lg:items-center lg:gap-900">
        <div className="flex flex-wrap items-center gap-300">
          {SOCIAL_LINKS.map((social) => (
            <Button
              aria-label={social.label}
              className="h-10 w-10 rounded-full bg-bg-disabled text-2xl text-fg-secondary hover:text-primary"
              icon={social.icon}
              key={social.label}
              onClick={() =>
                window.open(social.href, "_blank", "noopener,noreferrer")
              }
              size="current"
              theme="unstyled"
              type="button"
            />
          ))}
        </div>

        <div className="grid w-full gap-x-500 gap-y-300 sm:grid-cols-3 lg:w-auto lg:gap-y-0">
          {REVIEW_BADGES.map((badge) => (
            <article
              className="rounded-sm bg-overlay px-500 py-500 text-center"
              key={badge.brand}
            >
              <Footer.Text className="text-md font-bold leading-relaxed text-fg-primary">
                {badge.brand}{" "}
                <span className="text-primary">{badge.score}</span>
              </Footer.Text>
              <Footer.Text className="text-2xs leading-snug text-fg-disabled">
                {badge.votes}
              </Footer.Text>
            </article>
          ))}
        </div>
      </section>

      <Footer.Divider className="mx-auto max-w-footer-max bg-border-primary" />

      <Footer.Bottom className="mx-auto w-full max-w-footer-max flex-wrap items-center gap-400 border-0 px-500 py-600">
        <Footer.Text className="text-md leading-normal text-fg-secondary">
          Copyright 2025{" "}
          <strong className="text-fg-primary">Herbatica.sk.</strong> Všetky
          práva vyhradené.{" "}
          <Footer.Link className="text-primary underline" href="/#cookies">
            Upraviť nastavenie cookies
          </Footer.Link>
        </Footer.Text>

        <div className="flex flex-wrap items-center justify-start gap-150 sm:justify-end">
          {LANGUAGES.map((language) => (
            <Button
              className={`rounded-sm px-200 py-150 text-sm font-semibold ${
                language.active
                  ? "border border-primary/15 bg-primary/12 text-primary"
                  : "border border-border-secondary bg-surface text-fg-secondary"
              }`}
              icon={language.icon}
              key={language.code}
              size="sm"
              theme="unstyled"
              type="button"
            >
              {language.code}
            </Button>
          ))}
        </div>
      </Footer.Bottom>
    </Footer>
  );
}
