import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { normalizeProductSalesChannelFilter } from "../../../../utils/product-filters"
import {
  buildProductLocationAvailability,
  isInventoryLevel,
  isVariantInventoryItemLink,
} from "./availability"

type ProductRecord = {
  id: string
  variants?: Array<{
    id?: string
  }>
}

function isProductRecord(value: unknown): value is ProductRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).id === "string"
  )
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId =
    typeof req.params.id === "string" ? req.params.id : undefined

  if (!productId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Product id is required"
    )
  }

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const productFilters = await normalizeProductSalesChannelFilter(
    query,
    remoteQuery,
    {
      ...(req.filterableFields ?? {}),
      id: productId,
    }
  )
  const productResult = await query.graph({
    entity: "product",
    fields: ["id", "variants.id"],
    filters: productFilters,
    pagination: { take: 1 },
  })
  const products: unknown[] = Array.isArray(productResult.data)
    ? productResult.data
    : []
  const product = products.find(isProductRecord)

  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id "${productId}" was not found`
    )
  }

  const variantIds = (product.variants ?? [])
    .map((variant) => variant.id)
    .filter((variantId): variantId is string => Boolean(variantId))

  if (variantIds.length === 0) {
    res.json({
      product_id: product.id,
      variants: [],
    })
    return
  }

  const linkResult = await query.graph({
    entity: "product_variant_inventory_item",
    fields: ["variant_id", "inventory_item_id", "required_quantity"],
    filters: { variant_id: variantIds },
  })
  const rawLinks: unknown[] = Array.isArray(linkResult.data)
    ? linkResult.data
    : []
  const inventoryItemLinks = rawLinks.filter(isVariantInventoryItemLink)
  const inventoryItemIds = [
    ...new Set(inventoryItemLinks.map((link) => link.inventory_item_id)),
  ]

  if (inventoryItemIds.length === 0) {
    res.json(
      buildProductLocationAvailability({
        inventoryItemLinks: [],
        inventoryLevels: [],
        productId: product.id,
        variantIds,
      })
    )
    return
  }

  const levelResult = await query.graph({
    entity: "inventory_level",
    fields: [
      "inventory_item_id",
      "available_quantity",
      "stocked_quantity",
      "reserved_quantity",
      "stock_locations.name",
    ],
    filters: { inventory_item_id: inventoryItemIds },
  })
  const rawLevels: unknown[] = Array.isArray(levelResult.data)
    ? levelResult.data
    : []

  res.json(
    buildProductLocationAvailability({
      inventoryItemLinks,
      inventoryLevels: rawLevels.filter(isInventoryLevel),
      productId: product.id,
      variantIds,
    })
  )
}
