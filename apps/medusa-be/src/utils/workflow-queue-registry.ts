import type { MedusaContainer } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import { sendProductReviewRequestWorkflow } from "../workflows/send-product-review-request"
import type { SendProductReviewRequestWorkflowInput } from "../workflows/send-product-review-request"

export const workflowQueueNames = {
  SEND_PRODUCT_REVIEW_REQUEST: "send-product-review-request",
} as const

type WorkflowQueueRunner = (
  container: MedusaContainer,
  input: Record<string, unknown>,
) => Promise<unknown>

const isSendProductReviewRequestWorkflowInput = (
  input: unknown,
): input is SendProductReviewRequestWorkflowInput =>
  isRecord(input) && typeof input["order_id"] === "string"

const workflowQueueRegistry: Record<string, WorkflowQueueRunner> = {
  [workflowQueueNames.SEND_PRODUCT_REVIEW_REQUEST]: async (
    container,
    input,
  ) => {
    if (!isSendProductReviewRequestWorkflowInput(input)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid arguments for ${workflowQueueNames.SEND_PRODUCT_REVIEW_REQUEST}`,
      )
    }

    return await sendProductReviewRequestWorkflow(container).run({
      input,
    })
  },
}

export const getQueuedWorkflowRunner = (workflow: string) =>
  workflowQueueRegistry[workflow]
