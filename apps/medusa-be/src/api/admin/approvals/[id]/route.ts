import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import type { AdminUpdateApproval } from "../../../../types/approval/http"
import { requirePathParam } from "../../../../utils/path-params"
import { updateApprovalsWorkflow } from "../../../../workflows/approval/workflows"

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateApproval>,
  res: MedusaResponse,
) => {
  const { user_id } = req.auth_context.app_metadata as {
    user_id: string
  }

  const approvalId = requirePathParam(req.params["id"], "Approval id")
  const { status } = req.validatedBody

  const { result: approval, errors } = await updateApprovalsWorkflow(
    req.scope,
  ).run({
    input: {
      handled_by: user_id,
      id: approvalId,
      status,
    },
  })

  if (errors.length > 0) {
    res.status(400).json({
      code: "INVALID_DATA",
      message: errors[0]?.error.message,
    })
    return
  }
  res.json({ approval })
}
