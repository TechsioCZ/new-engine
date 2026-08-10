import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { isRecord, getRecordValue } from "@techsio/std/object"

import { requirePathParam } from "../../../../../utils/path-params"
import { createApprovalsWorkflow } from "../../../../../workflows/approval/workflows/create-approvals"

const postRoute = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const cartId = requirePathParam(req.params["id"], "Cart id")
  const customerIdValue = isRecord(req.auth_context.app_metadata)
    ? req.auth_context.app_metadata["customer_id"]
    : undefined
  const customerId = requirePathParam(
    typeof customerIdValue === "string" ? customerIdValue : undefined,
    "Customer id",
  )

  const workflowResult: unknown = await createApprovalsWorkflow(req.scope).run({
    input: {
      cart_id: cartId,
      created_by: customerId,
    },
    throwOnError: false,
  })

  if (!isRecord(workflowResult)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Approval creation returned an invalid result",
    )
  }

  const errors = getRecordValue(workflowResult, "errors")
  if (Array.isArray(errors) && errors.length > 0) {
    const errorItems: unknown[] = errors
    const [firstError] = errorItems
    const errorDetail = isRecord(firstError)
      ? getRecordValue(firstError, "error")
      : undefined
    const message =
      isRecord(errorDetail) &&
      typeof getRecordValue(errorDetail, "message") === "string"
        ? getRecordValue(errorDetail, "message")
        : "Approval creation failed"

    res.status(400).json({
      code: "INVALID_DATA",
      message,
    })
    return
  }

  res.json({ approvals: getRecordValue(workflowResult, "result") })
}

export { postRoute as POST }
