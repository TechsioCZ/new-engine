"use client"
import type { IconType } from "@techsio/ui-kit/atoms/icon"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Footer } from "@techsio/ui-kit/organisms/footer"
import { useTranslations } from "next-intl"
import {
  type FooterMarketAlternates,
  resolveFooterMarketLinks,
} from "@/components/herbatika-footer.market-links"
import { ReviewTrustBadges } from "@/components/reviews/review-trust-badges"
import type { ReviewTrustSource } from "@/components/reviews/reviews.types"
import { StorefrontLink } from "@/components/storefront-link"
import type {
  CmsFooterColumnSlot,
  CmsFooterItemSlot,
  CmsFooterNavigation,
} from "@/lib/storefront/cms-types"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import {
  type OperatorSocialLink,
  useOperatorContact,
} from "@/lib/storefront/operator-contact"
import { parsePublicPath } from "@/lib/url/public-route-api"
import { buildPath } from "@/lib/url/public-url"
import type { Market } from "@/lib/url/types"
import { HerbatikaLogo } from "./herbatika-logo"

const formatMarketDomain = (domain: string) =>
  `${domain.charAt(0).toUpperCase()}${domain.slice(1)}`

const FOOTER_COLUMN_TITLE_KEYS = {
  information: "footer.columns.information.title",
  important: "footer.columns.important.title",
  partners: "footer.columns.partners.title",
} as const satisfies Record<CmsFooterColumnSlot, string>

const FOOTER_ITEM_LABEL_KEYS = {
  blog: "footer.columns.information.blog",
  about: "footer.columns.information.about",
  faq: "footer.columns.information.faq",
  gift_voucher: "footer.columns.information.gift_voucher",
  brands: "footer.columns.information.brands",
  reviews: "footer.columns.information.reviews",
  shipping_payment: "footer.columns.important.shipping_payment",
  claims_returns: "footer.columns.important.claims_returns",
  terms: "footer.columns.important.terms",
  privacy: "footer.columns.important.privacy",
  cookies: "footer.columns.important.cookies",
  affiliate: "footer.columns.partners.affiliate",
  wholesale: "footer.columns.partners.wholesale",
  dropshipping: "footer.columns.partners.dropshipping",
  private_label: "footer.columns.partners.private_label",
} as const satisfies Record<CmsFooterItemSlot, string>

const validatedExternalHref = (href: string): string | null => {
  try {
    const url = new URL(href)
    if (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password
    ) {
      return url.href
    }
  } catch {
    // Invalid CMS links fail closed and are not rendered.
  }
  return null
}

type CmsFooterNavigationItem =
  CmsFooterNavigation["columns"][number]["items"][number]

const validatedInternalHref = (href: string, market: Market): string | null => {
  let url: URL
  try {
    url = new URL(href, "https://storefront.internal")
  } catch {
    return null
  }

  if (url.origin !== "https://storefront.internal" || url.hash) {
    return null
  }

  const parsed = parsePublicPath({
    market,
    pathname: url.pathname,
    rawQuery: url.search.slice(1),
  })
  return parsed.kind === "found" ? parsed.canonicalization.destination : null
}

export const resolveFooterNavigationItem = (
  item: CmsFooterNavigationItem,
  market: Market
):
  | Readonly<{ href: string; kind: "external"; newTab: boolean }>
  | Readonly<{ href: string; kind: "internal" }>
  | null => {
  if (item.type === "external") {
    const href = validatedExternalHref(item.href)
    return href ? { href, kind: "external", newTab: item.newTab ?? true } : null
  }

  const href = validatedInternalHref(item.href, market)
  return href ? { href, kind: "internal" } : null
}

type FooterSocialLink = Readonly<{
  href: string
  icon: IconType
  label: string
  markets?: readonly Market[]
}>

const SOCIAL_LINKS: readonly FooterSocialLink[] = [
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
    markets: ["sk"],
  },
  {
    href: "https://www.tiktok.com/@herbatica.sk",
    icon: "token-icon-tiktok",
    label: "TikTok",
    markets: ["sk"],
  },
]

const SOCIAL_ICON_BY_PLATFORM = {
  facebook: "token-icon-fb",
  instagram: "token-icon-instagram",
  linkedin: "token-icon-linkedin",
  tiktok: "token-icon-tiktok",
  youtube: "token-icon-youtube",
} as const satisfies Record<OperatorSocialLink["platform"], IconType>

const SOCIAL_LABEL_BY_PLATFORM = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
} as const satisfies Record<OperatorSocialLink["platform"], string>

export const resolveFooterSocialLinks = (
  market: Market,
  authoritySource = market === "sk" ? "sk-existing" : "unavailable",
  reviewedLinks: readonly OperatorSocialLink[] = []
): readonly FooterSocialLink[] => {
  if (authoritySource === "reviewed") {
    return reviewedLinks.map(({ href, platform }) => ({
      href,
      icon: SOCIAL_ICON_BY_PLATFORM[platform],
      label: SOCIAL_LABEL_BY_PLATFORM[platform],
    }))
  }
  return authoritySource === "sk-existing" && market === "sk"
    ? SOCIAL_LINKS.filter(
        (link) => !link.markets || link.markets.includes(market)
      )
    : []
}

export function HerbatikaFooter({
  marketAlternates = {},
  navigation,
  reviewTrustSources,
}: {
  marketAlternates?: FooterMarketAlternates
  navigation: CmsFooterNavigation
  reviewTrustSources: readonly ReviewTrustSource[]
}) {
  const t = useTranslations("navigation")
  const operatorContact = useOperatorContact()
  const marketContext = useMarketContext()
  const marketLinks = resolveFooterMarketLinks(
    marketContext.code,
    marketAlternates
  )
  const socialLinks = resolveFooterSocialLinks(
    marketContext.code,
    operatorContact.authoritySource,
    operatorContact.socialLinks
  )

  return (
    <Footer direction="vertical">
      <Footer.Container className="mx-auto grid-cols-1 gap-x-0 px-500 pt-850 pb-700 sm:grid-cols-2 xl:grid-cols-4 xl:gap-x-600 xl:gap-y-0">
        <Footer.Section>
          <HerbatikaLogo size="lg" />

          <Footer.Text className="leading-normal">
            {t("footer.tagline")}
          </Footer.Text>

          {operatorContact.available ? (
            <>
              <Footer.Link
                className="mt-250 flex items-start gap-300 text-footer-text-fg"
                href={operatorContact.phoneHref}
              >
                <Icon
                  className="mt-50 text-fg-secondary"
                  icon="token-icon-phone-talk"
                  size="lg"
                />
                <span className="leading-normal">
                  <span className="block font-bold text-primary hover:underline">
                    {operatorContact.phoneDisplay}
                  </span>
                  <span className="block text-sm">{operatorContact.hours}</span>
                </span>
              </Footer.Link>

              <Footer.Link
                className="mt-500 inline-flex items-center gap-300 font-bold text-primary"
                href={operatorContact.emailHref}
              >
                <Icon
                  className="text-fg-secondary"
                  icon="token-icon-email"
                  size="lg"
                />
                <span className="font-bold hover:underline">
                  {operatorContact.emailDisplay}
                </span>
              </Footer.Link>
            </>
          ) : (
            <Footer.Text className="mt-250 flex items-start gap-300 text-footer-text-fg leading-normal">
              <Icon
                className="mt-50 shrink-0 text-fg-secondary"
                icon="token-icon-phone-talk"
                size="lg"
              />
              {operatorContact.unavailable}
            </Footer.Text>
          )}
        </Footer.Section>

        {navigation.columns.map((column) => (
          <Footer.Section className="px-500" key={column.slot}>
            <Footer.Title className="uppercase leading-relaxed">
              {t(FOOTER_COLUMN_TITLE_KEYS[column.slot])}
            </Footer.Title>
            <Footer.List>
              {column.items.map((item) => {
                const resolved = resolveFooterNavigationItem(
                  item,
                  marketContext.code
                )
                if (!resolved) {
                  return null
                }

                if (resolved.kind === "external") {
                  return (
                    <li key={item.slot}>
                      <Footer.Link
                        external={resolved.newTab}
                        href={resolved.href}
                      >
                        {t(FOOTER_ITEM_LABEL_KEYS[item.slot])}
                      </Footer.Link>
                    </li>
                  )
                }

                return (
                  <li key={item.slot}>
                    <Footer.Link as={StorefrontLink} href={resolved.href}>
                      {t(FOOTER_ITEM_LABEL_KEYS[item.slot])}
                    </Footer.Link>
                  </li>
                )
              })}
            </Footer.List>
          </Footer.Section>
        ))}
      </Footer.Container>

      <Footer.Divider className="mx-auto max-w-footer-max" />
      <section className="mx-auto flex w-full max-w-footer-max flex-col items-start justify-between gap-550 px-500 py-700 lg:flex-row lg:items-center lg:gap-800">
        <div className="flex w-full flex-wrap items-center justify-center gap-300 md:w-auto md:justify-start">
          {socialLinks.map((social) => (
            <LinkButton
              aria-label={social.label}
              className="h-750 w-750 rounded-full bg-bg-disabled p-0 text-fg-secondary hover:text-primary"
              href={social.href}
              icon={social.icon}
              iconSize="lg"
              key={social.label}
              rel="noopener noreferrer"
              size="current"
              target="_blank"
              theme="unstyled"
            />
          ))}
        </div>

        <ReviewTrustBadges
          className="lg:w-auto"
          size="md"
          sources={reviewTrustSources}
        />
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
            href={buildPath(
              { kind: "static", page: "cookies" },
              marketContext.code
            )}
          >
            {t("footer.cookie_settings")}
          </Footer.Link>
        </Footer.Text>

        <div className="flex w-full flex-wrap items-center justify-center gap-150 md:w-auto md:justify-end">
          {marketLinks.map((link) => (
            <LinkButton
              aria-current={link.active ? "page" : undefined}
              className={`${link.active ? "" : "bg-base"} font-bold [&_span]:brightness-100 [&_span]:saturate-[1.7]`}
              href={link.href}
              icon={link.icon}
              iconSize="md"
              key={link.market}
              size="sm"
              theme={link.active ? "light" : "borderless"}
              variant="primary"
            >
              {link.code}
            </LinkButton>
          ))}
        </div>
      </Footer.Bottom>
    </Footer>
  )
}
