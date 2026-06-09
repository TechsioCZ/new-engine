"use client";
import { Button } from "@techsio/ui-kit/atoms/button";
import type { IconType } from "@techsio/ui-kit/atoms/icon";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Footer } from "@techsio/ui-kit/organisms/footer";
import NextLink from "next/link";
import { ReviewTrustBadges } from "@/components/reviews/review-trust-badges";
import { HerbatikaLogo } from "./herbatika-logo";

const FOOTER_COLUMNS = [
  {
    title: "Informácie pre vás",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/o-nas", label: "O nás" },
      { href: "/faq", label: "Časté otázky" },
      { href: "/c/darceky", label: "Darčeková poukážka" },
      { href: "/znacka", label: "Výrobcovia a značky" },
      {
        href: "https://obchody.heureka.sk/herbatica-sk/recenze/",
        label: "Recenzie",
      },
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

const SOCIAL_LINKS: { href: string; icon: IconType; label: string }[] = [
  {
    href: "https://www.facebook.com/vasaherbatica",
    icon: "token-icon-fb",
    label: "Facebook",
  },
  {
    href: "https://www.instagram.com/herbatica/",
    icon: "token-icon-instagram",
    label: "Instagram",
  },
  {
    href: "https://www.youtube.com/@herbatica",
    icon: "token-icon-youtube",
    label: "YouTube",
  },
  {
    href: "https://www.linkedin.com/company/herbaticask/",
    icon: "token-icon-linkedin",
    label: "LinkedIn",
  },
  {
    href: "https://www.tiktok.com/@herbatica.sk",
    icon: "token-icon-tiktok",
    label: "TikTok",
  },
];

const FOOTER_LOCALES: { active?: boolean; code: string; icon: IconType }[] = [
  { code: "SK", icon: "token-icon-sk", active: true },
  { code: "CZ", icon: "token-icon-cz" },
  { code: "HU", icon: "token-icon-hu" },
  { code: "RO", icon: "token-icon-ro" },
];
export function HerbatikaFooter() {
  return (
    <Footer direction="vertical">
      <Footer.Container className="mx-auto grid-cols-1 gap-x-0 px-500 pt-850 pb-700 sm:grid-cols-2 xl:grid-cols-4 xl:gap-x-600 xl:gap-y-0">
        <Footer.Section>
          <HerbatikaLogo size="lg" />

          <Footer.Text className="leading-normal">
            Váš partner pre zdravý životný štýl a vitalitu.
          </Footer.Text>

          <Footer.Text className="mt-250 flex items-start gap-300">
            <Icon
              className="mt-50 text-fg-secondary"
              icon="token-icon-phone-talk"
              size="lg"
            />
            <span className="leading-normal">
              <span className="block font-bold text-primary hover:underline">
                +421 2/321 123 45
              </span>
              <span className="block text-sm">(Po-Pia: 9:00 - 16:00)</span>
            </span>
          </Footer.Text>

          <Footer.Link
            className="mt-500 inline-flex items-center gap-300 font-bold text-primary"
            href="mailto:ahoj@herbatica.sk"
          >
            <Icon
              className="text-fg-secondary"
              icon="token-icon-email"
              size="lg"
            />
            <span className="hover:underline font-bold">ahoj@herbatica.sk</span>
          </Footer.Link>
        </Footer.Section>

        {FOOTER_COLUMNS.map((column) => (
          <Footer.Section key={column.title} className="px-500">
            <Footer.Title className="leading-relaxed uppercase">
              {column.title}
            </Footer.Title>
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

      <Footer.Divider className="mx-auto max-w-footer-max" />
      <section className="mx-auto flex w-full max-w-footer-max flex-col items-start justify-between gap-550 px-500 py-700 lg:flex-row lg:items-center lg:gap-800">
        <div className="flex w-full flex-wrap items-center justify-center gap-300 md:w-auto md:justify-start">
          {SOCIAL_LINKS.map((social) => (
            <Button
              aria-label={social.label}
              className="h-750 w-750 rounded-full bg-bg-disabled p-0 text-fg-secondary hover:text-primary"
              icon={social.icon}
              iconSize="lg"
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

        <ReviewTrustBadges className="lg:w-auto" size="md" />
      </section>

      <Footer.Divider className="mx-auto max-w-footer-max" />

      <Footer.Bottom className="mx-auto max-w-footer-max flex-wrap items-center gap-400">
        <Footer.Text className="leading-normal">
          Copyright 2025{" "}
          <strong className="text-fg-primary">Herbatica.sk.</strong> Všetky
          práva vyhradené.{" "}
          <Footer.Link
            as={NextLink}
            className="text-primary underline"
            href="/#cookies"
          >
            Upraviť nastavenie cookies
          </Footer.Link>
        </Footer.Text>

        <div className="flex w-full flex-wrap items-center justify-center gap-150 md:w-auto md:justify-end">
          {FOOTER_LOCALES.map((locale) => (
            <Button
              icon={locale.icon}
              iconSize="md"
              key={locale.code}
              size="sm"
              theme={locale.active ? "light" : "borderless"}
              type="button"
              variant={locale.active ? "primary" : "primary"}
              className={`${!locale.active && "bg-base"} font-bold [&_span]:saturate-[1.7] [&_span]:brightness-100`}
            >
              {locale.code}
            </Button>
          ))}
        </div>
      </Footer.Bottom>
    </Footer>
  );
}
