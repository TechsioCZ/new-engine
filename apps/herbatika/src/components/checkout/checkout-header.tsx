"use client";

import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import { HerbatikaLogo } from "@/components/herbatika-logo";

export function CheckoutHeader() {
  return (
    <header className="w-full border-b border-border-secondary bg-surface font-rubik">
      <div className="mx-auto flex w-full max-w-max-w items-center justify-between gap-250 px-400 py-350 lg:px-550">
        <div className="flex min-w-0 items-center gap-300">
          <HerbatikaLogo imageClassName="h-15" size="md" />
          <span className="hidden items-center gap-150 text-sm text-fg-primary sm:inline-flex">
            <Icon className="text-sm" icon="icon-[mdi--shield-check-outline]" />
            Bezpečný nákup
          </span>
        </div>

        <div className="flex items-center gap-200">
          <Link
            as={NextLink}
            className="hidden items-center gap-100 text-sm text-fg-primary hover:text-primary md:inline-flex"
            href="/#chat"
          >
            <Icon className="text-primary" icon="icon-[mdi--message-outline]" />
            Spustiť chat
          </Link>
          <Link
            as={NextLink}
            className="hidden items-center gap-100 text-sm text-fg-primary hover:text-primary lg:inline-flex"
            href="tel:+421232112345"
          >
            <Icon className="text-primary" icon="icon-[mdi--phone-outline]" />
            +421 2/321 123 45
          </Link>
          <LinkButton
            as={NextLink}
            className="px-250 text-sm font-medium"
            href="/auth/login"
            size="sm"
            variant="secondary"
          >
            Prihlásiť sa
          </LinkButton>
        </div>
      </div>
    </header>
  );
}
