import type { Query } from "@medusajs/framework"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  isPresent,
  QueryContext,
} from "@medusajs/framework/utils"
import { wrapProductsWithTaxPrices } from "@medusajs/medusa/api/store/products/helpers"
import { wrapVariantsWithInventoryQuantityForSalesChannel } from "@medusajs/medusa/api/utils/middlewares/products/variant-inventory-quantity"
import { normalizeProductSalesChannelFilter } from "../../utils/product-filters"

type ProductRecord = {
  variants?: unknown[]
}

type GraphWithOptions = (
  config: Parameters<Query["graph"]>[0],
  options?: Record<string, unknown>
) => ReturnType<Query["graph"]>

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const context: Record<string, unknown> = {}
  const fields = req.queryConfig.fields ?? []
  const withInventoryQuantity = fields.some((field) =>
    field.includes("variants.inventory_quantity")
  )

  const productFields = withInventoryQuantity
    ? fields.filter((field) => !field.includes("variants.inventory_quantity"))
    : fields

  if (isPresent(req.pricingContext)) {
    context.variants ??= {}
    ;(context.variants as Record<string, unknown>).calculated_price =
      QueryContext(req.pricingContext as Record<string, unknown>)
  }

  const { data: products = [], metadata } = await (
    query.graph as GraphWithOptions
  )(
    {
      entity: "product",
      fields: productFields,
      filters: await normalizeProductSalesChannelFilter(
        query,
        remoteQuery,
        req.filterableFields
      ),
      pagination: req.queryConfig.pagination,
      context,
    },
    {
      cache: {
        enable: true,
      },
      locale: req.locale,
    }
  )

  if (withInventoryQuantity) {
    await wrapVariantsWithInventoryQuantityForSalesChannel(
      req as Parameters<
        typeof wrapVariantsWithInventoryQuantityForSalesChannel
      >[0],
      (products as ProductRecord[]).flatMap(
        (product) => product.variants ?? []
      ) as Parameters<
        typeof wrapVariantsWithInventoryQuantityForSalesChannel
      >[1]
    )
  }

  await wrapProductsWithTaxPrices(
    req as Parameters<typeof wrapProductsWithTaxPrices>[0],
    products
  )

  res.json({
    products,
    count: metadata?.count ?? products.length,
    offset: metadata?.skip,
    limit: metadata?.take,
  })
}
