import { validateAndTransformQuery } from "@medusajs/framework"
import {
  applyDefaultFilters,
  authenticate,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
  type MiddlewareRoute,
} from "@medusajs/framework/http"
import { ProductStatus } from "@medusajs/framework/utils"
import { filterByValidSalesChannels } from "@medusajs/medusa/api/utils/middlewares/products/filter-by-valid-sales-channels"
import { normalizeDataForContext } from "@medusajs/medusa/api/utils/middlewares/products/normalize-data-for-context"
import { setPricingContext } from "@medusajs/medusa/api/utils/middlewares/products/set-pricing-context"
import { setTaxContext } from "@medusajs/medusa/api/utils/middlewares/products/set-tax-context"
import { enforceExactStorefrontMarketSalesChannel } from "../../storefront-market-sales-channel"
import {
  STORE_CATALOG_PRODUCTS_ALLOWED_FIELDS,
  STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
  StoreCatalogProductsSchema,
  type StoreCatalogProductsSchemaType,
} from "./validators"

export const CATALOG_RESPONSE_FIELDS_PROPERTY = "catalogResponseFields"
export const CATALOG_SALES_CHANNEL_IDS_PROPERTY =
  "catalogPublishableSalesChannelIds"

const CATALOG_PRICING_FIELD = "variants.calculated_price.*"

const shouldForceCatalogPricingContext = (
  query: Partial<StoreCatalogProductsSchemaType> | undefined
): boolean =>
  Boolean(
    query?.on_sale ||
      query?.sort === "price-asc" ||
      query?.sort === "price-desc"
  )

const ensureCatalogPricingContextFields = (
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const request = req as MedusaRequest & {
    [CATALOG_RESPONSE_FIELDS_PROPERTY]?: string[]
    queryConfig?: { fields?: string[] }
    validatedQuery?: Partial<StoreCatalogProductsSchemaType>
  }
  const fields = request.queryConfig?.fields

  if (Array.isArray(fields)) {
    request[CATALOG_RESPONSE_FIELDS_PROPERTY] = [...fields]
  }

  if (
    Array.isArray(fields) &&
    shouldForceCatalogPricingContext(request.validatedQuery) &&
    !fields.some(
      (field) =>
        field === CATALOG_PRICING_FIELD ||
        field.startsWith("variants.calculated_price.")
    )
  ) {
    fields.push(CATALOG_PRICING_FIELD)
  }

  next()
}

const preserveCatalogSalesChannelContext = (
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const request = req as MedusaRequest & {
    publishable_key_context?: { sales_channel_ids?: unknown }
    [CATALOG_SALES_CHANNEL_IDS_PROPERTY]?: string[]
  }
  const salesChannelIds = request.publishable_key_context?.sales_channel_ids

  if (Array.isArray(salesChannelIds)) {
    request[CATALOG_SALES_CHANNEL_IDS_PROPERTY] = salesChannelIds.filter(
      (salesChannelId): salesChannelId is string =>
        typeof salesChannelId === "string" && salesChannelId.length > 0
    )
  }

  next()
}

export const storeCatalogProductsRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/store/catalog/products",
    middlewares: [
      authenticate("customer", ["session", "bearer"], {
        allowUnauthenticated: true,
      }),
      validateAndTransformQuery(StoreCatalogProductsSchema, {
        defaults: STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
        allowed: STORE_CATALOG_PRODUCTS_ALLOWED_FIELDS,
        isList: true,
      }),
      ensureCatalogPricingContextFields,
      enforceExactStorefrontMarketSalesChannel,
      preserveCatalogSalesChannelContext,
      filterByValidSalesChannels(),
      applyDefaultFilters({
        status: ProductStatus.PUBLISHED,
      }),
      normalizeDataForContext(),
      setPricingContext(),
      setTaxContext(),
    ],
  },
]
