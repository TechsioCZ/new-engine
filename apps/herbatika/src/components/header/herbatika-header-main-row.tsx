"use client"

import type { HttpTypes } from "@medusajs/types"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Link } from "@techsio/ui-kit/atoms/link"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Header } from "@techsio/ui-kit/organisms/header"
import { useTranslations } from "next-intl"
import type { SubmitEvent } from "react"

import NextLink from "@/components/app-link"
import type { HerbatikaCurrencyCode } from "@/lib/storefront/currency"

import { HerbatikaLogo } from "../herbatika-logo"
import { SearchAutocomplete } from "../search/search-autocomplete"
import { HerbatikaAccountPopover } from "./herbatika-account-popover"
import { HerbatikaCartPopover } from "./herbatika-cart-popover"

interface HeaderSearchProps {
  countryCode?: string
  currencyCode: string
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void
  regionId?: string
  variant: "desktop" | "mobile"
}

const HeaderSearch = ({
  countryCode,
  currencyCode,
  onSubmit,
  regionId,
  variant,
}: HeaderSearchProps) => (
  <SearchAutocomplete
    {...(countryCode === undefined ? {} : { countryCode })}
    currencyCode={currencyCode}
    onSubmit={onSubmit}
    {...(regionId === undefined ? {} : { regionId })}
    variant={variant}
  />
)

interface HerbatikaHeaderMainRowProps {
  cart: HttpTypes.StoreCart | null | undefined
  cartTotalLabel: string
  countryCode?: string
  currencyCode: HerbatikaCurrencyCode
  itemCount: number
  onSearchSubmit: HeaderSearchProps["onSubmit"]
  regionId?: string
  searchCurrencyCode: string
}

export const HerbatikaHeaderMainRow = ({
  cart,
  cartTotalLabel,
  countryCode,
  currencyCode,
  itemCount,
  onSearchSubmit,
  regionId,
  searchCurrencyCode,
}: HerbatikaHeaderMainRowProps) => {
  const tAuth = useTranslations("auth")
  const searchProps = {
    ...(countryCode === undefined ? {} : { countryCode }),
    currencyCode: searchCurrencyCode,
    onSubmit: onSearchSubmit,
    ...(regionId === undefined ? {} : { regionId }),
  }

  return (
    <>
      <Header.Container className="mx-auto flex w-full min-w-0 max-w-max-w items-center justify-between gap-200 px-header-lg py-header-container-y 2xl:px-header-2xl">
        <HerbatikaLogo className="min-w-0 shrink" size="lg" />

        <div className="@header-desktop:block hidden w-full max-w-search-form flex-1">
          <HeaderSearch {...searchProps} variant="desktop" />
        </div>

        <Header.Actions className="@max-header-desktop:hidden gap-450">
          <Link
            className="inline-flex items-center gap-300 font-open-sans text-fg-secondary hover:text-fg-primary"
            href="tel:+421232112345"
          >
            <Icon icon="token-icon-phone-talk" size="2xl" />
            <span className="leading-snug">
              <span className="block font-semibold text-fg-primary text-md leading-snug">
                +421 2/321 123 45
              </span>
              <span className="ml-50 block font-normal text-fg-secondary text-xs leading-snug">
                (Po-Pia: 09:00 - 16:00)
              </span>
            </span>
          </Link>

          <LinkButton
            aria-label={tAuth("account.navigation.lists")}
            as={NextLink}
            className="text-3xl text-fg-secondary hover:text-primary"
            href="/account/lists"
            icon="token-icon-heart"
            iconSize="2xl"
            size="current"
            theme="unstyled"
            variant="secondary"
          />

          <HerbatikaAccountPopover />
          <HerbatikaCartPopover
            cart={cart}
            cartTotalLabel={cartTotalLabel}
            currencyCode={currencyCode}
            itemCount={itemCount}
          />
        </Header.Actions>

        <div className="flex @header-desktop:hidden shrink-0 items-center gap-150">
          <div className="relative">
            <LinkButton
              as={NextLink}
              className="px-350 py-250 font-bold text-md md:text-xl"
              href="/checkout/kosik"
              icon="token-icon-cart"
              size="sm"
              variant="primary"
            >
              {cartTotalLabel}
            </LinkButton>
            <Badge
              className="-top-150 -right-150 absolute min-h-400 min-w-400 justify-center rounded-full px-100 py-0 text-xs leading-none"
              variant="secondary"
            >
              {String(itemCount)}
            </Badge>
          </div>

          <Header.Hamburger className="h-750 w-750 shrink-0 border border-border-secondary text-2xl" />
        </div>
      </Header.Container>

      <div className="mx-auto @header-desktop:hidden w-full max-w-max-w px-header-lg pb-300 2xl:px-header-2xl">
        <HeaderSearch {...searchProps} variant="mobile" />
      </div>
    </>
  )
}
