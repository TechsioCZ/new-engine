import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { updateCartWorkflow } from "@medusajs/medusa/core-flows"
import type { UpdateCartWorkflowInput } from "@medusajs/medusa/core-flows"

import { getCartApprovalStatus } from "../../utils/get-cart-approval-status"

interface CartApprovalProjection {
  approvals?: ({ status?: string | null } | null)[] | null
}

interface CartApprovalGraphResult {
  data: CartApprovalProjection[]
}

updateCartWorkflow.hooks.validate(
  async ({ cart }: { cart: UpdateCartWorkflowInput }, { container }) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const cartId = cart.id
    if (cartId === "") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cart id is required for update validation",
      )
    }

    const queryResult: CartApprovalGraphResult = await query.graph({
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
  },
)
