import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  type VerifiedCustomerAccountDeactivationToken,
  verifyCustomerAccountDeactivationToken,
} from "../../../utils/customer-account-deactivation"

type VerifyCustomerAccountDeactivationTokenInput = {
  token: string
}

export const verifyCustomerAccountDeactivationTokenStep = createStep(
  "verify-customer-account-deactivation-token",
  async (
    input: VerifyCustomerAccountDeactivationTokenInput
  ): Promise<StepResponse<VerifiedCustomerAccountDeactivationToken>> =>
    new StepResponse(await verifyCustomerAccountDeactivationToken(input.token))
)
