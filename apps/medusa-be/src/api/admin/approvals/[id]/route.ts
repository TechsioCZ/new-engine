import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { getErrorMessage, isRecord } from "@techsio/std/object"

import type { AdminUpdateApproval } from "../../../../types/approval/http"
import { requirePathParam } from "../../../../utils/path-params"
import { updateApprovalsWorkflow } from "../../../../workflows/approval/workflows/update-approval"

const updateApproval = async (
  req: AuthenticatedMedusaRequest<AdminUpdateApproval>,
  res: MedusaResponse,
) => {
  const appMetadata: unknown = req.auth_context.app_metadata
  if (
    !isRecord(appMetadata) ||
    typeof appMetadata["user_id"] !== "string" ||
    appMetadata["user_id"].length === 0
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Approval updates require an authenticated admin user.",
    )
  }
  const userId = appMetadata["user_id"]

  const approvalId = requirePathParam(req.params["id"], "Approval id")
  const { status } = req.validatedBody

  const { result: approval, errors } = await updateApprovalsWorkflow(
    req.scope,
  ).run({
    input: {
      handled_by: userId,
      id: approvalId,
      status,
    },
  })

  if (errors.length > 0) {
    const workflowError: unknown = errors[0]?.error
    res.status(400).json({
      code: "INVALID_DATA",
      message: getErrorMessage(workflowError),
    })
    return
  }
  res.json({ approval })
}

export { updateApproval as POST }
