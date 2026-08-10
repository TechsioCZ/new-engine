import type { MedusaContainer } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import { sendProductReviewRequestWorkflow } from "../workflows/send-product-review-request"
import type { SendProductReviewRequestWorkflowInput } from "../workflows/send-product-review-request"

export const workflowQueueNames = {
  SEND_PRODUCT_REVIEW_REQUEST: "send-product-review-request",
} as const

type WorkflowQueueRunner = (
  container: MedusaContainer,
  input: unknown,
) => Promise<unknown>

const SendProductReviewRequestWorkflowInputSchema = z.object({
  order_id: z.string(),
})

const workflowQueueRegistry: Record<string, WorkflowQueueRunner> = {
  [workflowQueueNames.SEND_PRODUCT_REVIEW_REQUEST]: async (
    container,
    input,
  ) => {
    const parsed = SendProductReviewRequestWorkflowInputSchema.safeParse(input)
    if (!parsed.success) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid arguments for ${workflowQueueNames.SEND_PRODUCT_REVIEW_REQUEST}`,
      )
    }

    const workflowInput: SendProductReviewRequestWorkflowInput = parsed.data
    return await sendProductReviewRequestWorkflow(container).run({
      input: workflowInput,
    })
  },
}

export const getQueuedWorkflowRunner = (workflow: string) =>
  workflowQueueRegistry[workflow]
