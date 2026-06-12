"use client"

import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Link } from "@techsio/ui-kit/atoms/link"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import NextLink from "next/link"
import { HerbatikaLogo } from "@/components/herbatika-logo"
import { useAuth } from "@/lib/storefront/auth"

export function CheckoutHeader() {
  const { isAuthenticated } = useAuth()
  return (
    <header className="w-full border-border-secondary border-b bg-surface font-rubik">
      <div className="mx-auto flex w-full max-w-max-w items-center justify-between gap-250 px-400 py-350 lg:px-550">
        <div className="flex min-w-0 items-center gap-300">
          <HerbatikaLogo imageClassName="h-15" size="md" />
          <span className="hidden items-center gap-150 text-fg-primary text-sm sm:inline-flex">
            <Icon icon="token-icon-shield-check" size="lg" />
            Bezpečný nákup
          </span>
        </div>

        <div className="flex items-center gap-200">
          <Link
            as={NextLink}
            className="hidden items-center gap-100 text-fg-primary text-sm hover:text-primary md:inline-flex"
            href="/#chat"
          >
            <Icon color="success" icon="token-icon-conversation" />
            Spustiť chat
          </Link>
          <Link
            as={NextLink}
            className="hidden items-center gap-100 text-fg-primary text-sm hover:text-primary lg:inline-flex"
            href="tel:+421232112345"
          >
            <Icon color="success" icon="token-icon-phone-talk" />
            +421 2/321 123 45
          </Link>
          {!isAuthenticated && (
            <LinkButton
              as={NextLink}
              className="h-full text-nowrap border-2 px-400 py-300 sm:text-sm"
              href="/auth/login"
              icon="token-icon-user"
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              <span className="text-sm">Prihlásiť sa</span>
            </LinkButton>
          )}
        </div>
      </div>
    </header>
  )
}
