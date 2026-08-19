import type { HerbatikaCurrencyCode } from "@/lib/storefront/currency"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import {
  resolveProductTopOffer,
  resolveStorefrontPrice,
  resolveTopOfferInStock,
} from "@/lib/storefront/product-pricing"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projections"
import { buildProjectedEntityPath } from "@/lib/url/link-projections/projected-entity-link"
import { withPublicSearchParams } from "@/lib/url/public-url"
import type { Market } from "@/lib/url/types"
import { normalizeString } from "./search-autocomplete-normalizers"
import type {
  RawSearchAutocompleteProductHit,
  SearchAutocompleteSuggestion,
} from "./search-autocomplete-types"

const resolveProductPrice = (
  hit: RawSearchAutocompleteProductHit,
  expectedCurrencyCode: HerbatikaCurrencyCode
) => {
  const calculatedPrice = hit.variants?.[0]?.calculated_price
  const topOffer = resolveProductTopOffer(hit)

  return resolveStorefrontPrice({
    calculatedAmount: calculatedPrice?.calculated_amount,
    calculatedCurrencyCode: calculatedPrice?.currency_code,
    calculatedOriginalAmount: calculatedPrice?.original_amount,
    expectedCurrencyCode,
    topOffer,
  })
}

const resolveProductInStock = (hit: RawSearchAutocompleteProductHit) => {
  const topOffer = resolveProductTopOffer(hit)
  return resolveTopOfferInStock(topOffer)
}

const createProductSuggestion = (
  hit: RawSearchAutocompleteProductHit,
  currencyCode: HerbatikaCurrencyCode,
  market: Market,
  publicSlugsByProductId: PublicEntitySlugMap
): SearchAutocompleteSuggestion | null => {
  const id = normalizeString(hit.id)
  const productTitle = normalizeString(hit.title)
  const productHref = buildProjectedEntityPath(
    "product",
    { publicSlug: id ? publicSlugsByProductId[id] : undefined },
    market
  )

  if (!(id && productTitle && productHref)) {
    return null
  }

  const variantId = normalizeString(hit.search_result?.variant_id)
  const variantTitle = normalizeString(hit.search_result?.variant_title)
  const title = variantTitle
    ? `${productTitle} – ${variantTitle}`
    : productTitle
  const brandTitle = normalizeString(hit.brand?.title)
  const firstCategory = hit.categories?.find((category) =>
    Boolean(normalizeString(category.name))
  )
  const categoryName = normalizeString(firstCategory?.name)
  const price = resolveProductPrice(hit, currencyCode)

  return {
    id: variantId ? `${id}-${variantId}` : id,
    sourceId: id,
    type: "product",
    title,
    href: withPublicSearchParams(productHref, { variant: variantId }),
    subtitle: [brandTitle, categoryName].filter(Boolean).join(" | "),
    imageUrl: normalizeString(hit.thumbnail) || undefined,
    originalPriceLabel:
      price && typeof price.originalAmount === "number"
        ? formatCurrencyAmount(price.originalAmount, price.currencyCode)
        : undefined,
    priceLabel: price
      ? formatCurrencyAmount(price.currentAmount, price.currencyCode)
      : undefined,
    inStock: resolveProductInStock(hit),
  }
}

export const createProductSuggestions = ({
  currencyCode,
  hits,
  limit = hits.length,
  market,
  publicSlugsByProductId,
}: {
  currencyCode: HerbatikaCurrencyCode
  hits: RawSearchAutocompleteProductHit[]
  limit?: number
  market: Market
  publicSlugsByProductId: PublicEntitySlugMap
}) =>
  hits
    .map((hit) =>
      createProductSuggestion(hit, currencyCode, market, publicSlugsByProductId)
    )
    .filter((item): item is SearchAutocompleteSuggestion => Boolean(item))
    .slice(0, limit)
