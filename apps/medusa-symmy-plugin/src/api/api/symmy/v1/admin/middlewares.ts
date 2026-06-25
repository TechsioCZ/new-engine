import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
  MiddlewareRoute,
} from "@medusajs/framework/http"
import {
  authenticate,
  maybeApplyLinkFilter,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import { PolicyOperation } from "@medusajs/framework/utils"
import {
  Entities as CustomersEntities,
  listTransformQueryConfig as customersListTransformQueryConfig,
} from "@medusajs/medusa/api/admin/customers/query-config"
import { AdminCustomersParams } from "@medusajs/medusa/api/admin/customers/validators"
import {
  Entities as OrdersEntities,
  listTransformQueryConfig as ordersListTransformQueryConfig,
} from "@medusajs/medusa/api/admin/orders/query-config"
import { AdminGetOrdersParams } from "@medusajs/medusa/api/admin/orders/validators"
import {
  listProductQueryConfig,
  Entities as ProductsEntities,
} from "@medusajs/medusa/api/admin/products/query-config"
import { maybeApplyPriceListsFilter } from "@medusajs/medusa/api/admin/products/utils/maybe-apply-price-lists-filter"
import { AdminGetProductsParams } from "@medusajs/medusa/api/admin/products/validators"
import {
  Entities as RegionsEntities,
  listTransformQueryConfig as regionsListTransformQueryConfig,
} from "@medusajs/medusa/api/admin/regions/query-config"
import { AdminGetRegionsParams } from "@medusajs/medusa/api/admin/regions/validators"
import {
  Entities as UsersEntities,
  retrieveTransformQueryConfig as usersRetrieveTransformQueryConfig,
} from "@medusajs/medusa/api/admin/users/query-config"
import { AdminGetUserParams } from "@medusajs/medusa/api/admin/users/validators"

export const symmyAdminRoutes: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/api/symmy/v1/admin/orders",
    middlewares: [
      authenticate("user", ["bearer", "session", "api-key"]),
      validateAndTransformQuery(
        AdminGetOrdersParams,
        ordersListTransformQueryConfig
      ),
    ],
    policies: [
      {
        resource: OrdersEntities.order,
        operation: PolicyOperation.read,
      },
    ],
  },
  {
    method: ["GET"],
    matcher: "/api/symmy/v1/admin/customers",
    middlewares: [
      authenticate("user", ["bearer", "session", "api-key"]),
      validateAndTransformQuery(
        AdminCustomersParams,
        customersListTransformQueryConfig
      ),
    ],
    policies: [
      {
        resource: CustomersEntities.customer,
        operation: PolicyOperation.read,
      },
    ],
  },
  {
    method: ["GET"],
    matcher: "/api/symmy/v1/admin/products",
    middlewares: [
      authenticate("user", ["bearer", "session", "api-key"]),
      validateAndTransformQuery(AdminGetProductsParams, listProductQueryConfig),
      (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
        if (
          !req.filterableFields ||
          Object.keys(req.filterableFields).length === 0
        ) {
          return next()
        }

        return maybeApplyLinkFilter({
          entryPoint: "product_sales_channel",
          resourceId: "product_id",
          filterableField: "sales_channel_id",
        })(req, res, next)
      },
      maybeApplyPriceListsFilter(),
    ],
    policies: [
      {
        resource: ProductsEntities.product,
        operation: PolicyOperation.read,
      },
    ],
  },
  {
    method: ["GET"],
    matcher: "/api/symmy/v1/admin/regions",
    middlewares: [
      authenticate("user", ["bearer", "session", "api-key"]),
      validateAndTransformQuery(
        AdminGetRegionsParams,
        regionsListTransformQueryConfig
      ),
    ],
    policies: [
      {
        resource: RegionsEntities.region,
        operation: PolicyOperation.read,
      },
    ],
  },
  {
    method: ["GET"],
    matcher: "/api/symmy/v1/admin/users/me",
    middlewares: [
      authenticate("user", ["bearer", "session", "api-key"]),
      validateAndTransformQuery(
        AdminGetUserParams,
        usersRetrieveTransformQueryConfig
      ),
    ],
    policies: [
      {
        resource: UsersEntities.user,
        operation: PolicyOperation.read,
      },
    ],
  },
]
