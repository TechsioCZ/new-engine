import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { requirePathParam } from "../../../../utils/path-params"
import { updateApprovalsWorkflow } from "../../../../workflows/approval/workflows"
import type { StoreUpdateApprovalType } from "../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreUpdateApprovalType>,
  res: MedusaResponse
) => {
  const { customer_id } = req.auth_context.app_metadata as {
    customer_id: string
  }

  const approvalId = requirePathParam(req.params.id, "Approval id")
  const { status } = req.validatedBody

  const { result: approval, errors } = await updateApprovalsWorkflow(
    req.scope
  ).run({
    input: {
      status,
      handled_by: customer_id,
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
