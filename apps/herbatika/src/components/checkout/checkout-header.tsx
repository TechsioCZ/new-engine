"use client"

import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Link } from "@techsio/ui-kit/atoms/link"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { useTranslations } from "next-intl"
import { HerbatikaLogo } from "@/components/herbatika-logo"
import { StorefrontLink } from "@/components/storefront-link"
import { useAuth } from "@/lib/storefront/auth"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { buildPath } from "@/lib/url/public-url"

export function CheckoutHeader() {
  const { isAuthenticated } = useAuth()
  const marketContext = useMarketContext()
  const tAuth = useTranslations("auth")
  const tCheckout = useTranslations("checkout")
  const tNavigation = useTranslations("navigation")

  return (
    <header className="w-full border-border-secondary border-b bg-surface font-rubik">
      <div className="mx-auto flex w-full max-w-max-w items-center justify-between gap-250 px-400 py-350 lg:px-550">
        <div className="flex min-w-0 items-center gap-300">
          <HerbatikaLogo imageClassName="h-15" size="md" />
          <span className="hidden items-center gap-150 text-fg-primary text-sm sm:inline-flex">
            <Icon icon="token-icon-shield-check" size="lg" />
            {tCheckout("secure_purchase")}
          </span>
        </div>

        <div className="flex items-center gap-200">
          <Link
            className="hidden items-center gap-100 text-fg-primary text-sm hover:text-primary lg:inline-flex"
            href={tNavigation("contact.phone_href")}
          >
            <Icon color="success" icon="token-icon-phone-talk" />
            {tNavigation("contact.phone_display")}
          </Link>
          {!isAuthenticated && (
            <LinkButton
              as={StorefrontLink}
              className="h-full text-nowrap border-2 px-400 py-300 sm:text-sm"
              href={buildPath(
                { kind: "account", section: "login" },
                marketContext.code
              )}
              icon="token-icon-user"
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              <span className="text-sm">{tAuth("sign_in")}</span>
            </LinkButton>
          )}
        </div>
      </div>
    </header>
  )
}
