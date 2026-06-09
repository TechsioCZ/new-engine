import type { MedusaRequest } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

type AuthContext = {
  actor_id?: string
  actor_type?: string
}

type CustomerRecord = {
  first_name?: null | string
  id: string
  last_name?: null | string
}

type ProductRecord = {
  id: string
}

export const getCustomerId = (req: MedusaRequest) => {
  const authContext =
    "auth_context" in req
      ? (req.auth_context as AuthContext | undefined)
      : undefined

  if (authContext?.actor_type !== "customer" || !authContext.actor_id) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Product reviews require an authenticated customer."
    )
  }

  return authContext.actor_id
}

export const retrieveCustomer = async (
  req: MedusaRequest,
  customerId: string
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "first_name", "last_name"],
    filters: {
      id: customerId,
    },
  })

  return (data as CustomerRecord[])[0]
}

export const ensureProductExists = async (
  req: MedusaRequest,
  productId: string
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {
      id: productId,
    },
  })

  if (!(data as ProductRecord[])[0]?.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product "${productId}" was not found.`
    )
  }
}
