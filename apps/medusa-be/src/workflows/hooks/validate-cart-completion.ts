import { completeCartWorkflow } from "@medusajs/core-flows"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { checkSpendingLimit } from "../../utils/check-spending-limit"
import { getCartApprovalStatus } from "../../utils/get-cart-approval-status"

completeCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [queryCart],
  } = await query.graph({
    entity: "cart",
    fields: ["approvals.*", "customer_id", "total"],
    filters: {
      id: cart.id,
    },
  })

  // Check if cart is pending approval
  const { isPendingApproval } = getCartApprovalStatus(queryCart)

  if (isPendingApproval) {
    throw new Error("Cart is pending approval")
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

    if (customer.employee?.spending_limit) {
      const spendLimitExceeded = checkSpendingLimit(
        queryCart as any,
        customer as any
      )

      if (spendLimitExceeded) {
        throw new Error("Cart total exceeds spending limit")
      }
    }
  }

  return new StepResponse(undefined, null)
})
