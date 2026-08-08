import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import type { VerifiedCustomerAccountDeactivationToken } from "../../../utils/customer-account-deactivation"
import { verifyCustomerAccountDeactivationToken } from "../../../utils/customer-account-deactivation"

interface VerifyCustomerAccountDeactivationTokenInput {
  token: string
}

export const verifyCustomerAccountDeactivationTokenStep = createStep(
  "verify-customer-account-deactivation-token",
  async (
    input: VerifyCustomerAccountDeactivationTokenInput,
  ): Promise<StepResponse<VerifiedCustomerAccountDeactivationToken>> =>
    new StepResponse(await verifyCustomerAccountDeactivationToken(input.token)),
)
