import { Modules } from "@medusajs/framework/utils"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"
import { APPROVAL_MODULE } from "../../../modules/approval"
import type { ModuleCreateApproval } from "../../../types"
import { createApprovalStep } from "../steps"
import { createApprovalStatusStep } from "../steps/create-approval-status"

export const createApprovalsWorkflow = createWorkflow(
  "create-approvals",
  (input: ModuleCreateApproval | ModuleCreateApproval[]) => {
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

    const approvalStatusLinkData = transform(approvalStatusResult, (status) => {
      const statuses = Array.isArray(status) ? status : [status]
      return statuses.map((statusItem) => ({
        [Modules.CART]: {
          cart_id: statusItem.cart_id,
        },
        [APPROVAL_MODULE]: {
          approval_status_id: statusItem.id,
        },
      }))
    })

    const linkData = transform(
      [approvalLinkData, approvalStatusLinkData],
      (data) => data.flat()
    )

    createRemoteLinkStep(linkData)

    return new WorkflowResponse(result)
  }
)
