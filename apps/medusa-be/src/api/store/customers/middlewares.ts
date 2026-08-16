import {
  type AuthenticatedMedusaRequest,
  type MedusaNextFunction,
  type MedusaResponse,
  type MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework"
import { authenticate } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { hasArrayData } from "../../../utils/guards"
import {
  StoreConfirmDeactivateCustomerAccountSchema,
  StoreCreateCustomerAccountSchema,
  StoreDeactivateCustomerAccountSchema,
} from "./validators"

const customerAuth = authenticate("customer", ["session", "bearer"])

type CustomerAccountState = {
  deleted_at?: Date | string | null
  has_account?: boolean | null
  id: string
}

export const ensureActiveCustomerAccount = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const customerResult: unknown = await query.graph({
    entity: "customer",
    fields: ["id", "has_account", "deleted_at"],
    filters: { id: req.auth_context.actor_id },
    withDeleted: true,
  })

  if (!hasArrayData<CustomerAccountState>(customerResult)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Unexpected response shape while validating customer account."
    )
  }

  const customer = customerResult.data[0]
  if (!customer || customer.deleted_at || customer.has_account === false) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  return next()
}

export const storeCustomersMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store/customers",
    middlewares: [
      authenticate("customer", ["session", "bearer"], {
        allowUnregistered: true,
      }),
      validateAndTransformBody(StoreCreateCustomerAccountSchema),
    ],
  },
  {
    method: "ALL",
    matcher: "/store/customers/me*",
    middlewares: [ensureActiveCustomerAccount],
  },
  {
    method: ["POST"],
    matcher: "/store/customers/me/deactivate",
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreDeactivateCustomerAccountSchema),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/customers/deactivate/confirm",
    middlewares: [
      validateAndTransformBody(StoreConfirmDeactivateCustomerAccountSchema),
    ],
  },
]
