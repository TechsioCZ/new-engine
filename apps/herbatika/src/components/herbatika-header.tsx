"use client"

import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Link } from "@techsio/ui-kit/atoms/link"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Header } from "@techsio/ui-kit/organisms/header"
import NextImage from "next/image"
import NextLink from "next/link"
import { useRouter } from "next/navigation"
import type { FocusEvent, FormEvent } from "react"
import { useState } from "react"
import { cartReadQueryOptions, useCart } from "@/lib/storefront/cart"
import { resolveCartTotalAmount } from "@/lib/storefront/cart-calculations"
import { resolveSupportedCurrencyCode } from "@/lib/storefront/currency"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"
import { HerbatikaAccountPopover } from "./header/herbatika-account-popover"
import { HerbatikaCartPopover } from "./header/herbatika-cart-popover"
import { HerbatikaDesktopSubmenu } from "./header/herbatika-desktop-submenu"
import {
  HEADER_ACTION_ITEMS,
  PRIMARY_NAV_ITEMS,
} from "./header/herbatika-header.navigation"
import { HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS } from "./header/herbatika-header.submenu-data"
import { HerbatikaMobileMenuDialog } from "./header/herbatika-mobile-menu-dialog"
import { HerbatikaLogo } from "./herbatika-logo"
import { SearchAutocomplete } from "./search/search-autocomplete"
import { resolveSearchHref } from "./search/search-query-config"

const SUBMENU_ROOT_HANDLES = new Set<string>(
  HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS.map((group) => group.rootHandle)
)

const resolveRootHandleFromHref = (href: string) => {
  if (!href.startsWith("/c/")) {
    return null
  }

  return href.slice(3)
}

export function HerbatikaHeader() {
  const router = useRouter()
  const region = useRegionContext()
  const [activeRootHandle, setActiveRootHandle] = useState<string | null>(null)

  const { cart, itemCount } = useCart(
    {
      autoCreate: true,
      region_id: region?.region_id,
      country_code: region?.country_code,
      enabled: Boolean(region?.region_id),
    },
    {
      queryOptions: cartReadQueryOptions,
    }
  )

  const regionCurrency = resolveRegionCurrency(region)
  const cartCurrency = resolveSupportedCurrencyCode(
    cart?.currency_code,
    regionCurrency
  )
  const cartTotalLabel = formatCurrencyAmount(
    resolveCartTotalAmount(cart),
    cartCurrency
  )

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget)
    router.push(resolveSearchHref(formData.get("q")))
  }

  const handleActivateDesktopItem = (href: string) => {
    const rootHandle = resolveRootHandleFromHref(href)
    if (!(rootHandle && SUBMENU_ROOT_HANDLES.has(rootHandle))) {
      setActiveRootHandle(null)
      return
    }

    setActiveRootHandle(rootHandle)
  }

  const handleDesktopBlur = (event: FocusEvent<HTMLElement>) => {
    const nextFocusedElement = event.relatedTarget
    if (
      nextFocusedElement instanceof Node &&
      event.currentTarget.contains(nextFocusedElement)
    ) {
      return
    }

    setActiveRootHandle(null)
  }

  return (
    <Header
      className="header-desktop:relative sticky top-0 z-50 flex"
      direction="vertical"
    >
      <Header.Container className="mx-auto flex w-full min-w-0 max-w-max-w items-center justify-between gap-200 px-header-lg py-header-container-y 2xl:px-header-2xl">
        <HerbatikaLogo className="min-w-0 shrink" size="lg" />

        <div className="@header-desktop:block hidden w-full max-w-search-form flex-1">
          <SearchAutocomplete
            countryCode={region?.country_code}
            currencyCode={regionCurrency}
            onSubmit={handleSearchSubmit}
            regionId={region?.region_id}
            variant="desktop"
          />
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
            aria-label="Obľúbené zoznamy"
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
            currencyCode={cartCurrency}
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
        <SearchAutocomplete
          countryCode={region?.country_code}
          currencyCode={regionCurrency}
          onSubmit={handleSearchSubmit}
          regionId={region?.region_id}
          variant="mobile"
        />
      </div>

      <Header.Desktop
        className="relative min-h-header-nav bg-primary"
        onBlurCapture={handleDesktopBlur}
        onMouseLeave={() => setActiveRootHandle(null)}
      >
        <Header.Container className="mx-auto flex min-h-header-nav max-w-max-w items-center justify-between px-header-lg 2xl:px-header-2xl">
          <Header.Nav
            aria-label="Hlavná navigácia"
            className="flex-nowrap overflow-x-auto [scrollbar-width:none] md:h-full [&::-webkit-scrollbar]:hidden"
            size="sm"
          >
            {PRIMARY_NAV_ITEMS.map((item) => {
              const rootHandle = resolveRootHandleFromHref(item.href)
              const hasSubmenu = Boolean(
                rootHandle && SUBMENU_ROOT_HANDLES.has(rootHandle)
              )

              return (
                <NextLink
                  aria-expanded={
                    hasSubmenu ? activeRootHandle === rootHandle : undefined
                  }
                  aria-haspopup={hasSubmenu ? "dialog" : undefined}
                  className="h-full shrink-0"
                  href={item.href}
                  key={item.href}
                  onFocus={() => handleActivateDesktopItem(item.href)}
                >
                  <Header.NavItem
                    className="flex h-full items-center whitespace-nowrap leading-none lg:max-header-tablet:p-header-item-desktop-lg lg:max-header-tablet:text-header-item-desktop-lg"
                    onMouseEnter={() => handleActivateDesktopItem(item.href)}
                  >
                    {item.label}
                  </Header.NavItem>
                </NextLink>
              )
            })}
          </Header.Nav>

          <Header.Actions className="gap-x-250" size="sm">
            {HEADER_ACTION_ITEMS.map((action) => (
              <LinkButton
                as={NextLink}
                className="h-fit rounded-xs bg-surface px-300 py-400 font-bold text-fg-primary text-sm leading-none hover:bg-highlight"
                href={action.href}
                key={action.href}
                size="sm"
                variant="secondary"
              >
                <NextImage
                  alt={action.label}
                  height={24}
                  src={action.src}
                  width={24}
                />
                {action.label}
              </LinkButton>
            ))}
          </Header.Actions>
        </Header.Container>

        <HerbatikaDesktopSubmenu
          activeRootHandle={activeRootHandle}
          onClose={() => setActiveRootHandle(null)}
        />
      </Header.Desktop>

      <Header.Mobile
        className="inset-x-0 z-20 w-full max-w-full overflow-x-hidden"
        position="right"
      >
        <HerbatikaMobileMenuDialog />
      </Header.Mobile>
    </Header>
  )
}
