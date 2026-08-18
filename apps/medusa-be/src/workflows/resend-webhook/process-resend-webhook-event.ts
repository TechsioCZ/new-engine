import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { processResendWebhookEventStep } from "./steps/process-resend-webhook-event"
import type { ProcessResendWebhookEventInput } from "./types"

export const processResendWebhookEventWorkflow = createWorkflow(
  "process-resend-webhook-event",
  (input: ProcessResendWebhookEventInput) =>
    new WorkflowResponse(processResendWebhookEventStep(input))
)
