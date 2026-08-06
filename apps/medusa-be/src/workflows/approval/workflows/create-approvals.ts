import { MedusaError, Modules } from "@medusajs/framework/utils"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"
import { isRecord } from "@techsio/std/object"

import { APPROVAL_MODULE } from "../../../modules/approval"
import type { ModuleCreateApproval } from "../../../types"
import { isUnknownArray } from "../../../utils/guards"
import { createApprovalStatusStep } from "../steps/create-approval-status"
import { createApprovalStep } from "../steps/create-approvals"

const getApprovalStatusLinkData = (value: unknown) => {
  const values = isUnknownArray(value) ? value : [value]
  return values.map((status) => {
    if (
      !isRecord(status) ||
      typeof status["cart_id"] !== "string" ||
      typeof status["id"] !== "string"
    ) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Create approval status step returned an invalid record",
      )
    }
    return {
      [Modules.CART]: {
        cart_id: status["cart_id"],
      },
      [APPROVAL_MODULE]: {
        approval_status_id: status["id"],
      },
    }
  })
}

export const createApprovalsWorkflow = createWorkflow(
  "create-approvals",
  (
    input:
      | Omit<ModuleCreateApproval, "type">
      | Omit<ModuleCreateApproval, "type">[],
  ) => {
    const result = createApprovalStep(input)

    const cartIds = transform(input, (approvalInput) => {
      const approvals = Array.isArray(approvalInput)
        ? approvalInput
        : [approvalInput]
      return approvals.map((approvalItem) => approvalItem.cart_id)
    })

    const approvalStatusResult = createApprovalStatusStep(cartIds)

    const approvalLinkData = transform(result, (approval) => {
      const approvals = Array.isArray(approval) ? approval : [approval]
      return approvals.map((approvalItem) => ({
        [Modules.CART]: {
          cart_id: approvalItem.cart_id,
        },
        [APPROVAL_MODULE]: {
          approval_id: approvalItem.id,
        },
      }))
    })

    const approvalStatusLinkData = transform(
      approvalStatusResult,
      getApprovalStatusLinkData,
    )

    const linkData = transform(
      [approvalLinkData, approvalStatusLinkData],
      (data) => data.flat(),
    )

    createRemoteLinkStep(linkData)

    return new WorkflowResponse(result)
  },
)
