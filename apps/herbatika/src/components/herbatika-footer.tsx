"use client";

import type { IconType } from "@techsio/ui-kit/atoms/icon";
import { Button } from "@techsio/ui-kit/atoms/button";
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
    <Footer className="bg-[#f3f3f3] px-0 py-0" direction="vertical">
      <Footer.Container className="mx-auto grid w-full max-w-[1418px] grid-cols-1 gap-x-10 gap-y-10 px-4 pt-16 pb-10 sm:grid-cols-2 xl:grid-cols-4 lg:px-6">
        <Footer.Section>
          <HerbatikaLogo className="mb-3 inline-flex" size="sm" />

          <Footer.Text className="max-w-[320px] text-lg leading-relaxed text-fg-secondary">
            Váš partner pre zdravý životný štýl a vitalitu.
          </Footer.Text>

          <Footer.Text className="mt-4 flex items-start gap-2 text-lg text-primary">
            <Icon className="mt-1 text-2xl text-fg-secondary" icon="icon-[mdi--phone-outline]" />
            <span className="leading-snug">
              <span className="block font-semibold text-primary">+421 2/321 123 45</span>
              <span className="mt-1 block text-sm text-fg-secondary">
                (Po-Pia: 9:00 - 16:00)
              </span>
            </span>
          </Footer.Text>

          <Footer.Link
            className="mt-4 inline-flex items-center gap-2 text-lg font-semibold text-primary"
            href="mailto:ahoj@herbatica.sk"
          >
            <Icon className="text-2xl text-fg-secondary" icon="icon-[mdi--email-outline]" />
            ahoj@herbatica.sk
          </Footer.Link>
        </Footer.Section>

        {FOOTER_SECTIONS.map((section) => (
          <Footer.Section key={section.title}>
            <Footer.Title className="pb-2 text-lg font-bold text-fg-primary">
              {section.title}
            </Footer.Title>
            <Footer.List className="gap-2 bg-transparent">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Footer.Link className="text-2xl text-fg-secondary" href={link.href}>
                    {link.label}
                  </Footer.Link>
                </li>
              ))}
            </Footer.List>
          </Footer.Section>
        ))}
      </Footer.Container>

      <Footer.Divider className="mx-auto max-w-[1418px] bg-black/8" />

      <section className="mx-auto flex w-full max-w-[1418px] flex-col items-start justify-between gap-5 px-4 py-5 lg:flex-row lg:items-center lg:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {SOCIAL_LINKS.map((social) => (
            <Button
              aria-label={social.label}
              className="rounded-full border border-black/7 bg-surface px-3 py-2 text-2xl text-fg-secondary hover:text-primary"
              icon={social.icon}
              key={social.label}
              onClick={() => window.open(social.href, "_blank", "noopener,noreferrer")}
              size="sm"
              theme="light"
              type="button"
              variant="secondary"
            />
          ))}
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto">
          {REVIEW_BADGES.map((badge) => (
            <article
              className="rounded-[10px] border border-black/8 bg-surface px-4 py-3 text-center"
              key={badge.brand}
            >
              <Footer.Text className="text-xl font-semibold text-fg-primary">
                {badge.brand} <span className="text-primary">{badge.score}</span>
              </Footer.Text>
              <Footer.Text className="text-xs text-fg-tertiary">{badge.votes}</Footer.Text>
            </article>
          ))}
        </div>
      </section>

      <Footer.Divider className="mx-auto max-w-[1418px] bg-black/8" />

      <Footer.Bottom className="mx-auto w-full max-w-[1418px] items-center border-0 px-4 py-5 lg:px-6">
        <Footer.Text className="text-lg text-fg-secondary">
          Copyright 2025 <strong className="text-fg-primary">Herbatica.sk.</strong> Všetky
          práva vyhradené.{" "}
          <Footer.Link className="text-primary underline" href="/#cookies">
            Upraviť nastavenie cookies
          </Footer.Link>
        </Footer.Text>

        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((language) => (
            <Button
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                language.active
                  ? "border border-primary/15 bg-primary/12 text-primary"
                  : "border border-black/10 bg-surface text-fg-secondary"
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
