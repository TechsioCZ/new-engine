import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { sendNotificationStep } from "../../steps/send-notification"
import { createClaimStep } from "../steps/create-claim"
import type { CreateClaimInput } from "../types"

export const createClaimWorkflow = createWorkflow(
  "create-claim",
  (input: CreateClaimInput) => {
    const prepared = createClaimStep(input)
    sendNotificationStep(prepared.notification_input)
    return new WorkflowResponse(prepared.result)
  }
)
