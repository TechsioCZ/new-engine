import type { Query } from "@medusajs/framework"
import type { MedusaResponse } from "@medusajs/framework/http"
import type { HttpTypes, QueryContextType } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  QueryContext,
} from "@medusajs/framework/utils"
import type { RequestWithContext } from "@medusajs/medusa/api/store/products/helpers"

import {
  decorateProductsWithMeasurements,
  getMeasurementDecorationOptions,
  getMeasurementDecorationQueryFields,
} from "../../../utils/measurement-units"
import { normalizeProductSalesChannelFilter } from "../../utils/product-filters"
import type { StoreProductProjection } from "./product-graph-validation"
import { parseStoreProductListGraphResponse } from "./product-graph-validation"
import {
  decorateInventoryQuantityForProductProjections,
  decorateProductProjectionsWithTaxPrices,
} from "./product-projection-decorators"

interface StoreProductListProjectionResponse {
  count: number
  limit: number | undefined
  offset: number | undefined
  products: StoreProductProjection[]
}

const getHandler = async (
  req: RequestWithContext<HttpTypes.StoreProductParams>,
  res: MedusaResponse<StoreProductListProjectionResponse>,
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
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

  const rawProductsResult: unknown = await query.graph(
    {
      context,
      entity: "product",
      fields: productFields,
      filters: await normalizeProductSalesChannelFilter(
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
  const { metadata, products } =
    parseStoreProductListGraphResponse(rawProductsResult)

  if (withInventoryQuantity) {
    await decorateInventoryQuantityForProductProjections(req, products)
  }

  await decorateProductProjectionsWithTaxPrices(req, products)
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
