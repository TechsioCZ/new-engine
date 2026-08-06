import type { HttpTypes } from "@medusajs/types"

import { resolveSupportedCurrencyCode } from "@/lib/storefront/currency"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import { resolveVariantInventoryState } from "@/lib/storefront/product-availability"
import {
  getProductListTitle,
  isFavoriteProductList,
} from "@/lib/storefront/product-lists"
import type {
  StoreProductList,
  StoreProductListItem,
} from "@/lib/storefront/product-lists"
import {
  asStorefrontNumber,
  asStorefrontRecord,
  resolveAmountWithoutTax,
  resolveProductTopOffer,
  resolveStorefrontPrice,
} from "@/lib/storefront/product-pricing"

export interface ProductListPriceSummary {
  totalWithTaxLabel: string | null
  totalWithoutTaxLabel: string | null
}

const PRODUCT_LIST_ITEM_AVAILABILITY_STATUS = {
  limitedStock: "limited_stock",
  outOfStock: "out_of_stock",
  productUnavailable: "product_unavailable",
} as const

type ProductListItemAvailabilityStatus =
  (typeof PRODUCT_LIST_ITEM_AVAILABILITY_STATUS)[keyof typeof PRODUCT_LIST_ITEM_AVAILABILITY_STATUS]

export interface ProductListItemAvailability {
  availableQuantity: number | null
  badgeVariant: "danger" | "warning"
  canAddToCart: boolean
  status: ProductListItemAvailabilityStatus | null
}

interface ProductListAvailableItem {
  item: StoreProductListItem
  product: HttpTypes.StoreProduct
}

export interface ProductListAvailabilitySummary {
  canAddAnyToCart: boolean
  canAddWholeList: boolean
  purchasableItems: ProductListAvailableItem[]
  skippedCount: number
}

export const sortProductLists = (
  lists: StoreProductList[],
  labels: { favorite: string; untitled: string },
) =>
  lists.toSorted((first, second) => {
    if (isFavoriteProductList(first)) {
      return -1
    }

    if (isFavoriteProductList(second)) {
      return 1
    }

    return getProductListTitle(first, labels).localeCompare(
      getProductListTitle(second, labels),
    )
  })

export const uniqueProductIds = (items: StoreProductListItem[]) => [
  ...new Set(
    items
      .map((item) => item.product_id ?? item.product?.id)
      .filter((id): id is string => id !== undefined && id !== ""),
  ),
]

export const buildProductMap = (
  items: StoreProductListItem[],
  products: HttpTypes.StoreProduct[],
) => {
  const map = new Map<string, HttpTypes.StoreProduct>()

  for (const item of items) {
    const itemProduct = item.product
    const productId = itemProduct?.id
    if (
      itemProduct !== null &&
      itemProduct !== undefined &&
      productId !== undefined &&
      productId !== ""
    ) {
      map.set(productId, itemProduct)
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
  productsById: Map<string, HttpTypes.StoreProduct>,
) => {
  const productId = item.product_id ?? item.product?.id

  if (productId === undefined || productId === "") {
    return item.product ?? null
  }

  return productsById.get(productId) ?? item.product ?? null
}

const resolveProductListItemVariant = (
  item: StoreProductListItem,
  product: HttpTypes.StoreProduct,
) => {
  const variants = product.variants ?? []
  const variantId = item.variant_id ?? item.variant?.id ?? null

  if (variantId !== null && variantId !== "") {
    const matchingVariant = variants.find((variant) => variant.id === variantId)
    if (matchingVariant !== undefined) {
      return matchingVariant
    }
  }

  return variants[0] ?? null
}

export const resolveProductListItemAvailability = (
  item: StoreProductListItem,
  product: HttpTypes.StoreProduct | null,
): ProductListItemAvailability => {
  if (product === null) {
    return {
      availableQuantity: null,
      badgeVariant: "danger",
      canAddToCart: false,
      status: "product_unavailable",
    }
  }

  const quantity = resolveProductListItemQuantity(item)
  const variant = resolveProductListItemVariant(item, product)
  const inventory = resolveVariantInventoryState(variant, quantity)

  if (!(inventory.hasVariant && inventory.hasPrice)) {
    return {
      availableQuantity: null,
      badgeVariant: "danger",
      canAddToCart: false,
      status: "product_unavailable",
    }
  }

  if (!inventory.isInStock) {
    return {
      availableQuantity: inventory.availableQuantity,
      badgeVariant: "warning",
      canAddToCart: false,
      status: "out_of_stock",
    }
  }

  if (!inventory.isPurchasable) {
    return {
      availableQuantity: inventory.availableQuantity,
      badgeVariant: "warning",
      canAddToCart: false,
      status:
        inventory.availableQuantity === null ? "out_of_stock" : "limited_stock",
    }
  }

  return {
    availableQuantity: inventory.availableQuantity,
    badgeVariant: "warning",
    canAddToCart: true,
    status: null,
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

    if (availability.canAddToCart && product !== null) {
      purchasableItems.push({ item, product })
    } else {
      skippedCount += 1
    }
  }

  const totalCount = params.items.length
  const canAddAnyToCart = purchasableItems.length > 0
  const canAddWholeList = totalCount > 0 && skippedCount === 0

  return {
    canAddAnyToCart,
    canAddWholeList,
    purchasableItems,
    skippedCount,
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
    calculatedAmount: calculatedPrice?.["calculated_amount"],
    calculatedCurrencyCode: calculatedPrice?.["currency_code"],
    calculatedOriginalAmount: calculatedPrice?.["original_amount"],
    expectedCurrencyCode: currencyCode,
    topOffer,
  })

  if (price === null) {
    return null
  }

  const variantMetadata = asStorefrontRecord(variant?.metadata)
  const calculatedAmountWithoutTax =
    price.source === "calculated_price"
      ? asStorefrontNumber(calculatedPrice?.["calculated_amount_without_tax"])
      : null
  const amountWithoutTax = resolveAmountWithoutTax({
    amountWithTax: price.currentAmount,
    amountWithoutTax: calculatedAmountWithoutTax,
    vatRate:
      asStorefrontNumber(variantMetadata?.["vat"]) ??
      asStorefrontNumber(topOffer?.["vat"]),
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
    const price =
      product === null
        ? null
        : resolveProductListItemPrice({ currencyCode, item, product })

    if (price === null) {
      hasMissingPrice = true
      hasMissingAmountWithoutTax = true
    } else {
      const quantity = resolveProductListItemQuantity(item)
      hasPricedItems = true
      totalWithTaxAmount += price.amountWithTax * quantity

      if (typeof price.amountWithoutTax === "number") {
        totalWithoutTaxAmount += price.amountWithoutTax * quantity
      } else {
        hasMissingAmountWithoutTax = true
      }
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
        : null,
    totalWithoutTaxLabel:
      typeof resolvedTotalWithoutTaxAmount === "number"
        ? formatCurrencyAmount(resolvedTotalWithoutTaxAmount, currencyCode)
        : null,
  }
}
