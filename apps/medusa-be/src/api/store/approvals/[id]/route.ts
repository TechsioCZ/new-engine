import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { updateApprovalsWorkflow } from "../../../../workflows/approval/workflows"
import type { StoreUpdateApprovalType } from "../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreUpdateApprovalType>,
  res: MedusaResponse
) => {
  const approvalId = req.params.id

  if (!approvalId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Approval id is required"
    )
  }

  const { customer_id } = req.auth_context.app_metadata as {
    customer_id: string
  }

  const { status } = req.validatedBody

  const { result: approval, errors } = await updateApprovalsWorkflow.run({
    input: {
      status,
      handled_by: customer_id,
      id: approvalId,
    },
    container: req.scope,
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
  res.json({ approval })
}
