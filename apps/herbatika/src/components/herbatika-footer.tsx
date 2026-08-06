"use client"
import { Button } from "@techsio/ui-kit/atoms/button"
import type { IconType } from "@techsio/ui-kit/atoms/icon"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Footer } from "@techsio/ui-kit/organisms/footer"
import { StorefrontLink } from "@/components/storefront-link"
import { buildIndexUrl, buildUrl } from "@/lib/url/builder"
import { getSegment } from "@/lib/url/segments"
import type { Market } from "@/lib/url/types"
import { HERBATIKA_MARKETS } from "@/lib/storefront/market-context"
import { useTranslations } from "next-intl"
import { ReviewTrustBadges } from "@/components/reviews/review-trust-badges"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { HerbatikaLogo } from "./herbatika-logo"

type FooterNavigationLink =
  | {
      href: string
      labelKey: string
      external?: false
    }
  | {
      href: `https://${string}`
      labelKey: string
      external: true
    }

type FooterColumn = {
  titleKey: string
  links: readonly FooterNavigationLink[]
}

const formatMarketDomain = (domain: string) =>
  `${domain.charAt(0).toUpperCase()}${domain.slice(1)}`

const createFooterColumns = (market: Market): readonly FooterColumn[] => [
  {
    titleKey: "footer.columns.information.title",
    links: [
      {
        href: buildIndexUrl({ market, kind: "article" }),
        labelKey: "footer.columns.information.blog",
      },
      {
        href: buildUrl({
          market,
          kind: "page",
          slug: getSegment(market, "about"),
        }),
        labelKey: "footer.columns.information.about",
      },
      {
        href: buildUrl({
          market,
          kind: "page",
          slug: getSegment(market, "faq"),
        }),
        labelKey: "footer.columns.information.faq",
      },
      {
        href: buildUrl({ market, kind: "category", slug: "darceky" }),
        labelKey: "footer.columns.information.gift_voucher",
      },
      {
        href: buildIndexUrl({ market, kind: "brand" }),
        labelKey: "footer.columns.information.brands",
      },
      {
        href: "https://obchody.heureka.sk/herbatica-sk/recenze/",
        labelKey: "footer.columns.information.reviews",
        external: true,
      },
    ],
  },
  {
    titleKey: "footer.columns.important.title",
    links: [
      {
        href: buildUrl({ market, kind: "page", slug: getSegment(market, "shipping") }),
        labelKey: "footer.columns.important.shipping_payment",
      },
      {
        href: buildUrl({ market, kind: "page", slug: getSegment(market, "returns") }),
        labelKey: "footer.columns.important.claims_returns",
      },
      {
        href: buildUrl({ market, kind: "page", slug: getSegment(market, "terms") }),
        labelKey: "footer.columns.important.terms",
      },
      {
        href: buildUrl({ market, kind: "page", slug: getSegment(market, "privacy") }),
        labelKey: "footer.columns.important.privacy",
      },
      {
        href: buildUrl({ market, kind: "page", slug: getSegment(market, "cookies") }),
        labelKey: "footer.columns.important.cookies",
      },
    ],
  },
  {
    titleKey: "footer.columns.partners.title",
    links: [
      {
        href: buildUrl({ market, kind: "page", slug: "affiliate" }),
        labelKey: "footer.columns.partners.affiliate",
      },
      {
        href: buildUrl({ market, kind: "page", slug: "velkoobchod" }),
        labelKey: "footer.columns.partners.wholesale",
      },
      {
        href: buildUrl({ market, kind: "page", slug: "dropshipping" }),
        labelKey: "footer.columns.partners.dropshipping",
      },
      {
        href: buildUrl({ market, kind: "page", slug: "private-label" }),
        labelKey: "footer.columns.partners.private_label",
      },
    ],
  },
]

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
]

const MARKET_ICONS = {
  sk: "token-icon-sk",
  cz: "token-icon-cz",
  hu: "token-icon-hu",
  ro: "token-icon-ro",
} as const satisfies Record<Market, IconType>

export function HerbatikaFooter() {
  const t = useTranslations("navigation")
  const marketContext = useMarketContext()
  const footerColumns = createFooterColumns(marketContext.code)

  return (
    <Footer direction="vertical">
      <Footer.Container className="mx-auto grid-cols-1 gap-x-0 px-500 pt-850 pb-700 sm:grid-cols-2 xl:grid-cols-4 xl:gap-x-600 xl:gap-y-0">
        <Footer.Section>
          <HerbatikaLogo size="lg" />

          <Footer.Text className="leading-normal">
            {t("footer.tagline")}
          </Footer.Text>

          <Footer.Link
            className="mt-250 flex items-start gap-300 text-footer-text-fg"
            href="tel:+421232112345"
          >
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
          </Footer.Link>

          <Footer.Link
            className="mt-500 inline-flex items-center gap-300 font-bold text-primary"
            href="mailto:ahoj@herbatica.sk"
          >
            <Icon
              className="text-fg-secondary"
              icon="token-icon-email"
              size="lg"
            />
            <span className="font-bold hover:underline">ahoj@herbatica.sk</span>
          </Footer.Link>
        </Footer.Section>

        {footerColumns.map((column) => (
          <Footer.Section className="px-500" key={column.titleKey}>
            <Footer.Title className="uppercase leading-relaxed">
              {t(column.titleKey)}
            </Footer.Title>
            <Footer.List>
              {column.links.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <Footer.Link external href={link.href}>
                      {t(link.labelKey)}
                    </Footer.Link>
                  ) : (
                    <Footer.Link as={StorefrontLink} href={link.href}>
                      {t(link.labelKey)}
                    </Footer.Link>
                  )}
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
          {t.rich("footer.copyright", {
            brand: (chunks) => (
              <strong className="text-fg-primary">{chunks}</strong>
            ),
            domain: formatMarketDomain(marketContext.domain),
            year: new Date().getFullYear(),
          })}{" "}
          <Footer.Link
            as={StorefrontLink}
            className="text-primary underline"
            href={buildUrl({
              market: marketContext.code,
              kind: "page",
              slug: getSegment(marketContext.code, "cookies"),
            })}
          >
            {t("footer.cookie_settings")}
          </Footer.Link>
        </Footer.Text>

        <div className="flex w-full flex-wrap items-center justify-center gap-150 md:w-auto md:justify-end">
          {HERBATIKA_MARKETS.map((market) => {
            const isActive = market.code === marketContext.code
            // TODO(#545): equivalence switcher — replace the home fallback with
            // server-provided registry alternates when the current entity has one.
            const href = `https://${market.domain}`

            return (
              <a
                aria-current={isActive ? "page" : undefined}
                className={`${!isActive ? "bg-base" : "bg-primary text-on-primary"} inline-flex items-center gap-150 rounded-sm px-300 py-200 font-bold`}
                href={href}
                key={market.code}
              >
                <Icon icon={MARKET_ICONS[market.code]} size="md" />
                {market.code.toUpperCase()}
              </a>
            )
          })}
        </div>
      </Footer.Bottom>
    </Footer>
  )
}
