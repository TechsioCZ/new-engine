import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { z } from "@medusajs/framework/zod"

import { requirePathParam } from "../../../../utils/path-params"
import { updateApprovalsWorkflow } from "../../../../workflows/approval/workflows/update-approval"
import type { StoreUpdateApprovalType } from "../validators"

const authMetadataSchema = z.object({ customer_id: z.string().min(1) })
const workflowErrorSchema = z.object({
  error: z.object({ message: z.string() }),
})
const workflowErrorsSchema = z.array(z.unknown())

const updateApproval = async (
  req: AuthenticatedMedusaRequest<StoreUpdateApprovalType>,
  res: MedusaResponse,
) => {
  const { customer_id } = authMetadataSchema.parse(
    req.auth_context.app_metadata,
  )

  const approvalId = requirePathParam(req.params["id"], "Approval id")
  const { status } = req.validatedBody

  const { result: approval, errors } = await updateApprovalsWorkflow(
    req.scope,
  ).run({
    input: {
      handled_by: customer_id,
      id: approvalId,
      status,
    },
  })

  const [firstError] = workflowErrorsSchema.parse(errors)

  if (firstError !== undefined) {
    const { error } = workflowErrorSchema.parse(firstError)
    res.status(400).json({
      code: "INVALID_DATA",
      message: error.message,
    })
    return
  }
  res.json({ approval })
}

export { updateApproval as POST }
