import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { checkSpendingLimit } from "../../utils/check-spending-limit"
import { getCartApprovalStatus } from "../../utils/get-cart-approval-status"

completeCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const {
    data: [queryCart],
  } = await query.graph({
    entity: "cart",
    fields: ["approvals.*", "customer_id", "total"],
    filters: {
      id: cart.id,
    },
  })

  if (!queryCart) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart "${cart.id}" was not found`
    )
  }

  // Check if cart is pending approval
  const { isPendingApproval } = getCartApprovalStatus(queryCart)

  if (isPendingApproval) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Cart is pending approval"
    )
  }

  // Check if spending limit will be exceeded
  if (queryCart.customer_id) {
    const {
      data: [customer],
    } = await query.graph({
      entity: "customer",
      fields: ["employee.spending_limit"],
      filters: {
        id: queryCart.customer_id,
      },
    })

    if (!customer) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Customer "${queryCart.customer_id}" was not found`
      )
    }

    if (customer.employee?.spending_limit) {
      const spendLimitExceeded = checkSpendingLimit(queryCart, customer)

      if (spendLimitExceeded) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "Cart total exceeds spending limit"
        )
      }
    }
  }

  return new StepResponse(undefined, null)
})
