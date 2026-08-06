import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { updateCartWorkflow } from "@medusajs/medusa/core-flows"
import { isRecord } from "@techsio/std/object"

import { getCartApprovalStatus } from "../../utils/get-cart-approval-status"

interface CartWithApprovals {
  approvals?: ({ status?: string | null } | null)[] | null
}

updateCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const cartId: unknown = isRecord(cart) ? cart["id"] : undefined
  if (typeof cartId !== "string" || cartId === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Cart id is required for update validation",
    )
  }

  const queryResult: { data: CartWithApprovals[] } = await query.graph({
    entity: "cart",
    fields: ["approvals.*"],
    filters: {
      id: cartId,
    },
  })
  const [queryCart] = queryResult.data

  if (queryCart === undefined) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart "${cartId}" was not found`,
    )
  }

  const { isPendingApproval } = getCartApprovalStatus(queryCart)

  if (isPendingApproval) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Cart is pending approval",
    )
  }

  return new StepResponse(undefined, null)
})
