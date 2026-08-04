import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import type { AdminUpdateApproval } from "../../../../types/approval/http"
import { requirePathParam } from "../../../../utils/path-params"
import { updateApprovalsWorkflow } from "../../../../workflows/approval/workflows"

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateApproval>,
  res: MedusaResponse
) => {
  const { user_id } = req.auth_context.app_metadata as {
    user_id: string
  }

  const approvalId = requirePathParam(req.params.id, "Approval id")
  const { status } = req.validatedBody

  const { result: approval, errors } = await updateApprovalsWorkflow(
    req.scope
  ).run({
    input: {
      status,
      handled_by: user_id,
      id: approvalId,
    },
  })

  if (errors.length > 0) {
    res.status(400).json({
      message: errors[0]?.error.message,
      code: "INVALID_DATA",
    })
    return
  }
  res.json({ approval })
}
