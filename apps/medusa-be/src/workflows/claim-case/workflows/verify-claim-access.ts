import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { verifyClaimAccessStep } from "../steps/verify-claim-access"
import type { VerifyClaimAccessInput } from "../types"

export const verifyClaimAccessWorkflow = createWorkflow(
  "verify-claim-access",
  (input: VerifyClaimAccessInput) =>
    new WorkflowResponse(verifyClaimAccessStep(input))
)
