import type { MedusaResponse } from "@medusajs/framework/http"
import type { HttpTypes, QueryContextType } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  QueryContext,
} from "@medusajs/framework/utils"
import { wrapProductsWithTaxPrices } from "@medusajs/medusa/api/store/products/helpers"
import type { RequestWithContext } from "@medusajs/medusa/api/store/products/helpers"
import { wrapVariantsWithInventoryQuantityForSalesChannel } from "@medusajs/medusa/api/utils/middlewares/products/variant-inventory-quantity"

import {
  decorateProductsWithMeasurements,
  getMeasurementDecorationOptions,
  getMeasurementDecorationQueryFields,
} from "../../../utils/measurement-units"
import { normalizeProductSalesChannelFilter } from "../../utils/product-filters"

type StoreProductRow = Parameters<typeof wrapProductsWithTaxPrices>[1][number]
type InventoryDecoratableVariant = HttpTypes.StoreProductVariant & {
  manage_inventory?: boolean
}

const isInventoryDecoratableVariant = (
  variant: HttpTypes.StoreProductVariant,
): variant is InventoryDecoratableVariant => variant.manage_inventory !== null

const getHandler = async (
  req: RequestWithContext<HttpTypes.StoreProductParams>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const context: QueryContextType = {}
  const fields = req.queryConfig.fields ?? []
  const measurementDecorationOptions = getMeasurementDecorationOptions(fields)
  const withInventoryQuantity = fields.some((field) =>
    field.includes("variants.inventory_quantity"),
  )

  const productFieldsBeforeDecoration = withInventoryQuantity
    ? fields.filter((field) => !field.includes("variants.inventory_quantity"))
    : fields
  const productFields = getMeasurementDecorationQueryFields(
    productFieldsBeforeDecoration,
    measurementDecorationOptions,
  )

  if (req.pricingContext !== undefined && req.pricingContext !== null) {
    context["variants"] = {
      calculated_price: QueryContext(req.pricingContext),
    }
  }

  const {
    data: products,
    metadata,
  }: {
    data: StoreProductRow[]
    metadata?: { count?: number; skip?: number; take?: number }
  } = await query.graph(
    {
      context,
      entity: "product",
      fields: productFields,
      filters: await normalizeProductSalesChannelFilter(
        query,
        remoteQuery,
        req.filterableFields,
      ),
      pagination: req.queryConfig.pagination,
    },
    {
      cache: { enable: true },
      ...(req.locale === undefined ? {} : { locale: req.locale }),
    },
  )

  if (withInventoryQuantity) {
    const variants: InventoryDecoratableVariant[] = []
    for (const product of products) {
      for (const variant of product.variants ?? []) {
        if (isInventoryDecoratableVariant(variant)) {
          variants.push(variant)
        }
      }
    }

    await wrapVariantsWithInventoryQuantityForSalesChannel(req, variants)
  }

  await wrapProductsWithTaxPrices(req, products)
  await decorateProductsWithMeasurements(
    req.scope,
    products,
    measurementDecorationOptions,
  )

  res.json({
    count: metadata?.count ?? products.length,
    limit: metadata?.take,
    offset: metadata?.skip,
    products,
  })
}

export { getHandler as GET }
