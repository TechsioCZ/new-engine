import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { ApprovalStatusType } from "../../../../../types/approval"
import { createApprovalsWorkflow } from "../../../../../workflows/approval/workflows"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const cartId = req.params.id

  if (!cartId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Cart id is required"
    )
  }

  const { customer_id } = req.auth_context.app_metadata as {
    customer_id: string
  }

  const { result: approvals, errors } = await createApprovalsWorkflow.run({
    input: {
      created_by: customer_id,
      cart_id: cartId,
      status: ApprovalStatusType.PENDING,
    },
    container: req.scope,
    throwOnError: false,
  })

  const workflowError = errors[0]

  if (workflowError) {
    res.status(400).json({
      message:
        workflowError.error instanceof Error
          ? workflowError.error.message
          : "INVALID_DATA",
      code: "INVALID_DATA",
    })
    return
  }

  res.json({ approvals })
}
