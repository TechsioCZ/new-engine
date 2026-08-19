"use client"
import { Button } from "@techsio/ui-kit/atoms/button"
import type { IconType } from "@techsio/ui-kit/atoms/icon"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Footer } from "@techsio/ui-kit/organisms/footer"
import { useTranslations } from "next-intl"
import { ReviewTrustBadges } from "@/components/reviews/review-trust-badges"
import type { ReviewTrustSource } from "@/components/reviews/reviews.types"
import { StorefrontLink } from "@/components/storefront-link"
import type {
  CmsFooterColumnSlot,
  CmsFooterItemSlot,
  CmsFooterNavigation,
} from "@/lib/storefront/cms-types"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { buildPath, type PublicRouteTarget } from "@/lib/url/public-url"
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

const INTERNAL_FOOTER_TARGETS: Partial<
  Record<CmsFooterItemSlot, PublicRouteTarget>
> = {
  about: { kind: "static", page: "about" },
  blog: { kind: "article" },
  brands: { kind: "brand" },
  claims_returns: { kind: "static", page: "returns" },
  cookies: { kind: "static", page: "cookies" },
  faq: { kind: "static", page: "faq" },
  privacy: { kind: "static", page: "privacy" },
  shipping_payment: { kind: "static", page: "shipping" },
  terms: { kind: "static", page: "terms" },
}

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

export const resolveFooterNavigationItem = (
  item: CmsFooterNavigationItem
):
  | Readonly<{ href: string; kind: "external"; newTab: boolean }>
  | Readonly<{ kind: "internal"; target: PublicRouteTarget }>
  | null => {
  if (item.type === "external") {
    const href = validatedExternalHref(item.href)
    return href ? { href, kind: "external", newTab: item.newTab ?? true } : null
  }

  const target = INTERNAL_FOOTER_TARGETS[item.slot]
  return target ? { kind: "internal", target } : null
}

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

const FOOTER_LOCALES: { active?: boolean; code: string; icon: IconType }[] = [
  { code: "SK", icon: "token-icon-sk", active: true },
  { code: "CZ", icon: "token-icon-cz" },
  { code: "HU", icon: "token-icon-hu" },
  { code: "RO", icon: "token-icon-ro" },
]
export function HerbatikaFooter({
  navigation,
  reviewTrustSources,
}: {
  navigation: CmsFooterNavigation
  reviewTrustSources: readonly ReviewTrustSource[]
}) {
  const t = useTranslations("navigation")
  const marketContext = useMarketContext()

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

        {navigation.columns.map((column) => (
          <Footer.Section className="px-500" key={column.slot}>
            <Footer.Title className="uppercase leading-relaxed">
              {t(FOOTER_COLUMN_TITLE_KEYS[column.slot])}
            </Footer.Title>
            <Footer.List>
              {column.items.map((item) => {
                const resolved = resolveFooterNavigationItem(item)
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
                    <Footer.Link
                      as={StorefrontLink}
                      href={buildPath(resolved.target, marketContext.code)}
                    >
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
          {FOOTER_LOCALES.map((locale) => (
            <Button
              className={`${!locale.active && "bg-base"} font-bold [&_span]:brightness-100 [&_span]:saturate-[1.7]`}
              icon={locale.icon}
              iconSize="md"
              key={locale.code}
              size="sm"
              theme={locale.active ? "light" : "borderless"}
              type="button"
              variant={locale.active ? "primary" : "primary"}
            >
              {locale.code}
            </Button>
          ))}
        </div>
      </Footer.Bottom>
    </Footer>
  )
}
