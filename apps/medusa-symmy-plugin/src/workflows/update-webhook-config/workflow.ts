import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import type { UpdateSymmyWebhookConfigInput } from "../../modules/webhook-config"
import { symmyUpdateWebhookConfigStep } from "./steps/update-webhook-config"

export const symmyUpdateWebhookConfigWorkflow = createWorkflow(
  "symmy-update-webhook-config",
  (input: UpdateSymmyWebhookConfigInput) =>
    new WorkflowResponse(symmyUpdateWebhookConfigStep(input))
)
