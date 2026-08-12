import { validateAndTransformQuery } from "@medusajs/framework"
import {
  applyDefaultFilters,
  authenticate,
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
} from "../../catalog/products/validators"
import { StoreSearchAutocompleteSchema } from "./validators"

export const storeSearchAutocompleteRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/store/search/autocomplete",

    middlewares: [
      authenticate("customer", ["session", "bearer"], {
        allowUnauthenticated: true,
      }),
      validateAndTransformQuery(StoreSearchAutocompleteSchema, {
        defaults: STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
        allowed: STORE_CATALOG_PRODUCTS_ALLOWED_FIELDS,
        isList: true,
      }),
      filterByValidSalesChannels(),
      applyDefaultFilters({ status: ProductStatus.PUBLISHED }),
      normalizeDataForContext(),
      setPricingContext(),
      setTaxContext(),
    ],
  },
]
