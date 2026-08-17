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
import {
  STORE_CATALOG_PRODUCTS_ALLOWED_FIELDS,
  STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
  StoreCatalogProductsSchema,
  type StoreCatalogProductsSchemaType,
} from "./validators"

export const CATALOG_RESPONSE_FIELDS_PROPERTY = "catalogResponseFields"

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
