import type { MedusaContainer } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import {
  sendProductReviewRequestWorkflow,
  type SendProductReviewRequestWorkflowInput,
} from "../workflows/send-product-review-request"

export const workflowQueueNames = {
  SEND_PRODUCT_REVIEW_REQUEST: "send-product-review-request",
} as const

type WorkflowQueueRunner = (
  container: MedusaContainer,
  input: Record<string, unknown>
) => Promise<unknown>

function isSendProductReviewRequestWorkflowInput(
  input: Record<string, unknown>
): input is SendProductReviewRequestWorkflowInput {
  return typeof input.order_id === "string"
}

const workflowQueueRegistry: Record<string, WorkflowQueueRunner> = {
  [workflowQueueNames.SEND_PRODUCT_REVIEW_REQUEST]: async (
    container,
    input
  ) => {
    if (!isSendProductReviewRequestWorkflowInput(input)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid arguments for ${workflowQueueNames.SEND_PRODUCT_REVIEW_REQUEST}`
      )
    }

    return sendProductReviewRequestWorkflow(container).run({
      input,
    })
  },
}

export function getQueuedWorkflowRunner(workflow: string) {
  return workflowQueueRegistry[workflow]
}
