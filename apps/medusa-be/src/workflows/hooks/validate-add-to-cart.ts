import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { z } from "@medusajs/framework/zod"
import { addToCartWorkflow } from "@medusajs/medusa/core-flows"

import { getCartApprovalStatus } from "../../utils/get-cart-approval-status"

const addToCartHookInputSchema = z.object({
  cart: z.object({ id: z.string().min(1) }),
})
const cartQuerySchema = z.object({
  data: z.array(
    z.object({
      approvals: z
        .array(
          z.object({ status: z.string().nullable().optional() }).nullable(),
        )
        .nullable()
        .optional(),
    }),
  ),
})

addToCartWorkflow.hooks.validate(async (hookInput, { container }) => {
  const { cart } = addToCartHookInputSchema.parse(hookInput)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const queryResult: unknown = await query.graph({
    entity: "cart",
    fields: ["approvals.*"],
    filters: {
      id: cart.id,
    },
  })
  const [queryCart] = cartQuerySchema.parse(queryResult).data

  if (queryCart === undefined) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart "${cart.id}" was not found`,
    )
  }

  const approvals = queryCart.approvals?.map((approval) => {
    if (approval === null || approval.status === undefined) {
      return approval === null ? null : {}
    }
    return { status: approval.status }
  })
  const cartWithApprovals = approvals === undefined ? {} : { approvals }
  const { isPendingApproval } = getCartApprovalStatus(cartWithApprovals)

  if (isPendingApproval) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Cart is pending approval",
    )
  }

  return new StepResponse(undefined, null)
})
