import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import type { ResendConfigUpdateInput } from "../../modules/resend-config"
import { updateResendConfigStep } from "./steps/update-resend-config"

export const updateResendConfigWorkflow = createWorkflow(
  "update-resend-config",
  (input: ResendConfigUpdateInput) =>
    new WorkflowResponse(updateResendConfigStep(input))
)
