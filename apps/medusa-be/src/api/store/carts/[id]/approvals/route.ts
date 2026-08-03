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
      created_by: customer_id,
      cart_id: cartId,
    },
    throwOnError: false,
  })

  if (errors.length > 0) {
    res.status(400).json({
      message: errors[0]?.error.message,
      code: "INVALID_DATA",
    })
    return
  }

  res.json({ approvals })
}
