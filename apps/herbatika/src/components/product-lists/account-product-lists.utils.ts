import type { HttpTypes } from "@medusajs/types"
import { resolveSupportedCurrencyCode } from "@/lib/storefront/currency"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import { resolveVariantInventoryState } from "@/lib/storefront/product-availability"
import {
  getProductListTitle,
  isFavoriteProductList,
  type StoreProductList,
  type StoreProductListItem,
} from "@/lib/storefront/product-lists"
import {
  asStorefrontNumber,
  asStorefrontRecord,
  resolveAmountWithoutTax,
  resolveProductTopOffer,
  resolveStorefrontPrice,
} from "@/lib/storefront/product-pricing"

const UNAVAILABLE_PRICE_LABEL = "Nie je dostupné"

export type ProductListPriceSummary = {
  totalWithTaxLabel: string
  totalWithoutTaxLabel: string
}

export type ProductListItemAvailability = {
  badgeLabel: string | null
  badgeVariant: "danger" | "warning"
  canAddToCart: boolean
}

export type ProductListAvailableItem = {
  item: StoreProductListItem
  product: HttpTypes.StoreProduct
}

export type ProductListAvailabilitySummary = {
  addToCartLabel: string
  canAddAnyToCart: boolean
  canAddWholeList: boolean
  purchasableItems: ProductListAvailableItem[]
  skippedCount: number
  statusLabel: string | null
  statusVariant: "danger" | "warning"
}

export const sortProductLists = (lists: StoreProductList[]) =>
  [...lists].sort((first, second) => {
    if (isFavoriteProductList(first)) {
      return -1
    }

    if (isFavoriteProductList(second)) {
      return 1
    }

    return getProductListTitle(first).localeCompare(getProductListTitle(second))
  })

export const uniqueProductIds = (items: StoreProductListItem[]) =>
  Array.from(
    new Set(
      items
        .map((item) => item.product_id ?? item.product?.id)
        .filter((id): id is string => Boolean(id))
    )
  )

export const buildProductMap = (
  items: StoreProductListItem[],
  products: HttpTypes.StoreProduct[]
) => {
  const map = new Map<string, HttpTypes.StoreProduct>()

  for (const item of items) {
    if (item.product?.id) {
      map.set(item.product.id, item.product)
    }
  }

  for (const product of products) {
    map.set(product.id, product)
  }

  return map
}

export const resolveProductListItemQuantity = (item: StoreProductListItem) =>
  typeof item.quantity === "number" && item.quantity > 0
    ? Math.floor(item.quantity)
    : 1

const resolveProductListItemProduct = (
  item: StoreProductListItem,
  productsById: Map<string, HttpTypes.StoreProduct>
) => {
  const productId = item.product_id ?? item.product?.id

  return productId
    ? (productsById.get(productId) ?? item.product ?? null)
    : (item.product ?? null)
}

const resolveProductListItemVariant = (
  item: StoreProductListItem,
  product: HttpTypes.StoreProduct
) => {
  const variants = product.variants ?? []
  const variantId = item.variant_id ?? item.variant?.id ?? null

  return (
    (variantId ? variants.find((variant) => variant.id === variantId) : null) ??
    variants[0] ??
    null
  )
}

export const resolveProductListItemAvailability = (
  item: StoreProductListItem,
  product: HttpTypes.StoreProduct | null
): ProductListItemAvailability => {
  if (!product) {
    return {
      badgeLabel: "Produkt nie je dostupný",
      badgeVariant: "danger",
      canAddToCart: false,
    }
  }

  const quantity = resolveProductListItemQuantity(item)
  const variant = resolveProductListItemVariant(item, product)
  const inventory = resolveVariantInventoryState(variant, quantity)

  if (!(inventory.hasVariant && inventory.hasPrice)) {
    return {
      badgeLabel: "Produkt nie je dostupný",
      badgeVariant: "danger",
      canAddToCart: false,
    }
  }

  if (!inventory.isInStock) {
    return {
      badgeLabel: "Momentálne nie je skladom",
      badgeVariant: "warning",
      canAddToCart: false,
    }
  }

  if (!inventory.isPurchasable) {
    return {
      badgeLabel:
        inventory.availableQuantity === null
          ? "Momentálne nie je skladom"
          : `Dostupné len ${inventory.availableQuantity} ks`,
      badgeVariant: "warning",
      canAddToCart: false,
    }
  }

  return {
    badgeLabel: null,
    badgeVariant: "warning",
    canAddToCart: true,
  }
}

export const resolveProductListAvailabilitySummary = (params: {
  items: StoreProductListItem[]
  productsById: Map<string, HttpTypes.StoreProduct>
}): ProductListAvailabilitySummary => {
  const purchasableItems: ProductListAvailableItem[] = []
  let skippedCount = 0

  for (const item of params.items) {
    const product = resolveProductListItemProduct(item, params.productsById)
    const availability = resolveProductListItemAvailability(item, product)

    if (availability.canAddToCart && product) {
      purchasableItems.push({ item, product })
    } else {
      skippedCount += 1
    }
  }

  const totalCount = params.items.length
  const purchasableCount = purchasableItems.length
  const canAddAnyToCart = purchasableCount > 0
  const canAddWholeList = totalCount > 0 && skippedCount === 0
  let addToCartLabel = "Žiadne dostupné položky"
  if (canAddWholeList) {
    addToCartLabel = "Pridať všetko do košíka"
  } else if (canAddAnyToCart) {
    addToCartLabel = "Pridať dostupné do košíka"
  }

  return {
    addToCartLabel,
    canAddAnyToCart,
    canAddWholeList,
    purchasableItems,
    skippedCount,
    statusLabel:
      skippedCount > 0
        ? `Momentálne nedostupné položky: ${skippedCount}`
        : null,
    statusVariant: canAddAnyToCart ? "warning" : "danger",
  }
}

const resolveProductListItemPrice = (params: {
  currencyCode: string
  item: StoreProductListItem
  product: HttpTypes.StoreProduct
}) => {
  const { currencyCode, item, product } = params
  const variant = resolveProductListItemVariant(item, product)
  const calculatedPrice = asStorefrontRecord(variant?.calculated_price)
  const topOffer = resolveProductTopOffer(product)
  const price = resolveStorefrontPrice({
    calculatedAmount: calculatedPrice?.calculated_amount,
    calculatedCurrencyCode: calculatedPrice?.currency_code,
    calculatedOriginalAmount: calculatedPrice?.original_amount,
    expectedCurrencyCode: currencyCode,
    topOffer,
  })

  if (!price) {
    return null
  }

  const variantMetadata = asStorefrontRecord(variant?.metadata)
  const calculatedAmountWithoutTax =
    price.source === "calculated_price"
      ? asStorefrontNumber(calculatedPrice?.calculated_amount_without_tax)
      : null
  const amountWithoutTax = resolveAmountWithoutTax({
    amountWithTax: price.currentAmount,
    amountWithoutTax: calculatedAmountWithoutTax,
    vatRate:
      asStorefrontNumber(variantMetadata?.vat) ??
      asStorefrontNumber(topOffer?.vat),
  })

  return {
    amountWithTax: price.currentAmount,
    amountWithoutTax,
  }
}

export const resolveProductListPriceSummary = (params: {
  currencyCode?: string | null
  items: StoreProductListItem[]
  productsById: Map<string, HttpTypes.StoreProduct>
}): ProductListPriceSummary => {
  const currencyCode = resolveSupportedCurrencyCode(params.currencyCode)
  let totalWithTaxAmount = 0
  let totalWithoutTaxAmount = 0
  let hasPricedItems = false
  let hasMissingPrice = false
  let hasMissingAmountWithoutTax = false

  for (const item of params.items) {
    const product = resolveProductListItemProduct(item, params.productsById)
    if (!product) {
      hasMissingPrice = true
      hasMissingAmountWithoutTax = true
      continue
    }

    const price = resolveProductListItemPrice({
      currencyCode,
      item,
      product,
    })

    if (!price) {
      hasMissingPrice = true
      hasMissingAmountWithoutTax = true
      continue
    }

    const quantity = resolveProductListItemQuantity(item)
    hasPricedItems = true
    totalWithTaxAmount += price.amountWithTax * quantity

    if (typeof price.amountWithoutTax === "number") {
      totalWithoutTaxAmount += price.amountWithoutTax * quantity
    } else {
      hasMissingAmountWithoutTax = true
    }
  }

  const resolvedTotalWithTaxAmount =
    hasPricedItems && !hasMissingPrice ? totalWithTaxAmount : null
  const resolvedTotalWithoutTaxAmount =
    hasPricedItems && !hasMissingPrice && !hasMissingAmountWithoutTax
      ? totalWithoutTaxAmount
      : null

  return {
    totalWithTaxLabel:
      typeof resolvedTotalWithTaxAmount === "number"
        ? formatCurrencyAmount(resolvedTotalWithTaxAmount, currencyCode)
        : UNAVAILABLE_PRICE_LABEL,
    totalWithoutTaxLabel:
      typeof resolvedTotalWithoutTaxAmount === "number"
        ? formatCurrencyAmount(resolvedTotalWithoutTaxAmount, currencyCode)
        : UNAVAILABLE_PRICE_LABEL,
  }
}
