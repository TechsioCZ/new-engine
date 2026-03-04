import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import type { AdminUpdateApproval } from "../../../../types/approval/http"
import { updateApprovalsWorkflow } from "../../../../workflows/approval/workflows"

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateApproval>,
  res: MedusaResponse
) => {
  const approvalId = req.params.id

  if (!approvalId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Approval id is required"
    )
  }

  const { user_id } = req.auth_context.app_metadata as {
    user_id: string
  }

  const { status } = req.validatedBody

  const { result: approval, errors } = await updateApprovalsWorkflow.run({
    input: {
      status,
      handled_by: user_id,
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
