"use client";

import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import { HerbatikaLogo } from "@/components/herbatika-logo";
import { useAuth } from "@/lib/storefront/auth";

export function CheckoutHeader() {
  const { isAuthenticated } = useAuth()
  return (
    <header className="w-full border-b border-border-secondary bg-surface font-rubik">
      <div className="mx-auto flex w-full max-w-max-w items-center justify-between gap-250 px-400 py-350 lg:px-550">
        <div className="flex min-w-0 items-center gap-300">
          <HerbatikaLogo imageClassName="h-15" size="md" />
          <span className="hidden items-center gap-150 text-sm text-fg-primary sm:inline-flex">
            <Icon size="lg" icon="token-icon-shield-check" />
            Bezpečný nákup
          </span>
        </div>

        <div className="flex items-center gap-200">
          <Link
            as={NextLink}
            className="hidden items-center gap-100 text-sm text-fg-primary hover:text-primary md:inline-flex"
            href="/#chat"
          >
            <Icon icon="token-icon-conversation" color="success" />
            Spustiť chat
          </Link>
          <Link
            as={NextLink}
            className="hidden items-center gap-100 text-sm text-fg-primary hover:text-primary lg:inline-flex"
            href="tel:+421232112345"
          >
            <Icon icon="token-icon-phone-talk" color="success" />
            +421 2/321 123 45
          </Link>
          {!isAuthenticated && <LinkButton
            as={NextLink}
            href="/auth/login"
            size="sm"
            variant="secondary"
            theme="outlined"
            icon="token-icon-account"
            className="text-nowrap sm:text-sm px-400 py-300 h-full border-2"
          >
            <span className="text-sm">Prihlásiť sa</span>
          </LinkButton>}
        </div>
      </div>
    </header>
  );
}
