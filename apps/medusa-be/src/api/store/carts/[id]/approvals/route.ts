import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import { requirePathParam } from "../../../../../utils/path-params"
import { createApprovalsWorkflow } from "../../../../../workflows/approval/workflows"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const cartId = requirePathParam(req.params["id"], "Cart id")
  const { customer_id } = req.auth_context.app_metadata as {
    customer_id: string
  }

  const { result: approvals, errors } = await createApprovalsWorkflow(
    req.scope
  ).run({
    input: {
      cart_id: cartId,
      created_by: customer_id,
    },
    throwOnError: false,
  })

  if (errors.length > 0) {
    res.status(400).json({
      code: "INVALID_DATA",
      message: errors[0]?.error.message,
    })
    return
  }

  res.json({ approvals })
}
