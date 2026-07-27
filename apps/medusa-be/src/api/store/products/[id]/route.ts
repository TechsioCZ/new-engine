import type { MedusaResponse } from "@medusajs/framework/http"
import type {
  HttpTypes,
  QueryContextType,
  RemoteQueryEntryPoints,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  QueryContext,
} from "@medusajs/framework/utils"
import {
  filterOutInternalProductCategories,
  type RequestWithContext,
  wrapProductsWithTaxPrices,
} from "@medusajs/medusa/api/store/products/helpers"
import { wrapVariantsWithInventoryQuantityForSalesChannel } from "@medusajs/medusa/api/utils/middlewares/products/variant-inventory-quantity"
import {
  decorateProductsWithMeasurements,
  getMeasurementDecorationOptions,
  getMeasurementDecorationQueryFields,
} from "../../../../utils/measurement-units"

type InventoryDecoratableVariant = HttpTypes.StoreProductVariant & {
  manage_inventory?: boolean
}

const isInventoryDecoratableVariant = (
  variant: HttpTypes.StoreProductVariant
): variant is InventoryDecoratableVariant => variant.manage_inventory !== null

const toStoreProduct = (
  product: RemoteQueryEntryPoints["product"]
): HttpTypes.StoreProduct => {
  // query.graph uses the generated module entity type even when the selected
  // fields form a Store API response. Bridge that Medusa type boundary once.
  return product as HttpTypes.StoreProduct
}

export const GET = async (
  req: RequestWithContext<HttpTypes.StoreProductParams>,
  res: MedusaResponse<HttpTypes.StoreProductResponse>
) => {
  const measurementDecorationOptions = getMeasurementDecorationOptions(
    req.queryConfig.fields
  )
  const withInventoryQuantity = req.queryConfig.fields.some((field) =>
    field.includes("variants.inventory_quantity")
  )

  if (withInventoryQuantity) {
    req.queryConfig.fields = req.queryConfig.fields.filter(
      (field) => !field.includes("variants.inventory_quantity")
    )
  }

  const filters: object = {
    id: req.params.id,
    ...req.filterableFields,
  }

  const context: QueryContextType = {}

  if (req.pricingContext) {
    context.variants ??= {}
    context.variants.calculated_price ??= QueryContext(req.pricingContext)
  }

  const includesCategoriesField = req.queryConfig.fields.some((field) =>
    field.startsWith("categories")
  )

  if (!req.queryConfig.fields.includes("categories.is_internal")) {
    req.queryConfig.fields.push("categories.is_internal")
  }

  const productFields = getMeasurementDecorationQueryFields(
    req.queryConfig.fields,
    measurementDecorationOptions
  )

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph(
    {
      context,
      entity: "product",
      fields: productFields,
      filters,
    },
    {
      locale: req.locale,
    }
  )
  const queriedProduct = products[0]

  if (!queriedProduct) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id: ${req.params.id} was not found`
    )
  }

  const product = toStoreProduct(queriedProduct)

  if (withInventoryQuantity) {
    const variants = (product.variants ?? []).filter(
      isInventoryDecoratableVariant
    )

    await wrapVariantsWithInventoryQuantityForSalesChannel(req, variants)
  }

  if (includesCategoriesField) {
    filterOutInternalProductCategories([product])
  }

  await wrapProductsWithTaxPrices(req, [product])
  await decorateProductsWithMeasurements(
    req.scope,
    [product],
    measurementDecorationOptions
  )

  res.json({ product })
}
