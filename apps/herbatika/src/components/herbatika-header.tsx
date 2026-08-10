"use client"

import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { Header } from "@techsio/ui-kit/organisms/header"
import { useRouter } from "next/navigation"
import type { ComponentProps } from "react"

import { appHref } from "@/lib/routing"
import { cartReadQueryOptions, useCart } from "@/lib/storefront/cart"
import { resolveCartTotalAmount } from "@/lib/storefront/cart-calculations"
import { resolveSupportedCurrencyCode } from "@/lib/storefront/currency"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"

import { HerbatikaHeaderDesktopNavigation } from "./header/herbatika-header-desktop-navigation"
import { HerbatikaHeaderMainRow } from "./header/herbatika-header-main-row"
import { HerbatikaMobileMenuDialog } from "./header/herbatika-mobile-menu-dialog"
import type { SearchAutocomplete } from "./search/search-autocomplete"
import { resolveSearchHref } from "./search/search-query-config"

const buildHeaderCartInput = (region: ReturnType<typeof useRegionContext>) => ({
  autoCreate: true,
  ...(region?.region_id === undefined ? {} : { region_id: region.region_id }),
  ...(region?.country_code === undefined
    ? {}
    : { country_code: region.country_code }),
  enabled: Boolean(region?.region_id),
})

export const HerbatikaHeader = () => {
  const router = useRouter()
  const region = useRegionContext()
  const { cart, itemCount } = useCart(buildHeaderCartInput(region), {
    queryOptions: cartReadQueryOptions,
  })

  const regionCurrency = resolveRegionCurrency(region)
  const cartCurrency = resolveSupportedCurrencyCode(
    cart?.currency_code,
    regionCurrency,
  )
  const cartTotalLabel = formatCurrencyAmount(
    resolveCartTotalAmount(cart),
    cartCurrency,
  )

  const handleSearchSubmit: ComponentProps<
    typeof SearchAutocomplete
  >["onSubmit"] = (event) => {
    const formData = new FormData(event.currentTarget)
    router.push(appHref(resolveSearchHref(formData.get("q"))))
  }

  return (
    <Header
      className="header-desktop:relative sticky top-0 z-50 flex"
      direction="vertical"
    >
      <HerbatikaHeaderMainRow
        cart={cart}
        cartTotalLabel={cartTotalLabel}
        {...(region?.country_code === undefined
          ? {}
          : { countryCode: region.country_code })}
        currencyCode={cartCurrency}
        itemCount={itemCount}
        onSearchSubmit={handleSearchSubmit}
        {...(region?.region_id === undefined
          ? {}
          : { regionId: region.region_id })}
        searchCurrencyCode={regionCurrency}
      />

      <HerbatikaHeaderDesktopNavigation />

      <Header.Mobile
        className="inset-x-0 z-20 w-full max-w-full overflow-x-hidden"
        position="right"
      >
        <HerbatikaMobileMenuDialog />
      </Header.Mobile>
    </Header>
  )
}
