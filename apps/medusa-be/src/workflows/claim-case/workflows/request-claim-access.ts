import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { sendNotificationStep } from "../../steps/send-notification"
import { requestClaimAccessStep } from "../steps/request-claim-access"
import type { RequestClaimAccessInput } from "../types"

export const requestClaimAccessWorkflow = createWorkflow(
  "request-claim-access",
  (input: RequestClaimAccessInput) => {
    const prepared = requestClaimAccessStep(input)
    sendNotificationStep(prepared.notification_input)
    return new WorkflowResponse(prepared.result)
  }
)
