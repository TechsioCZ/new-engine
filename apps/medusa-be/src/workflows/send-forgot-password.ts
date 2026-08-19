import type { CreateNotificationDTO } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { resolveCustomerNotificationMarketContext } from "../utils/customer-notification-market-context"
import { resolveNotificationMarketContext } from "../utils/notification-market-context"
import { buildStorefrontPublicFlowUrl } from "../utils/storefront-public-flow-url"
import { sendNotificationStep } from "./steps/send-notification"

type WorkflowInput = {
  email: string
  storefrontMarketCode?: string
  token: string
}

const buildForgotPasswordNotificationStep = createStep(
  "build-forgot-password-notification",
  async (input: WorkflowInput, { container }) => {
    const email = input.email.trim()
    const token = input.token.trim()

    if (!email) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Password reset email is missing."
      )
    }

    if (!token) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Password reset token is missing."
      )
    }

    const storefrontMarketCode = input.storefrontMarketCode?.trim()
    const marketContext = storefrontMarketCode
      ? await resolveNotificationMarketContext(container, {
          countryCode: storefrontMarketCode,
        })
      : await resolveCustomerNotificationMarketContext(container, { email })
    const resetUrl = buildStorefrontPublicFlowUrl({
      marketCode: marketContext.market_code,
      storefrontBaseUrl: marketContext.storefront_base_url,
      target: { kind: "account", section: "resetPassword", value: token },
    })
    resetUrl.searchParams.set("email", email)
    const notification: CreateNotificationDTO = {
      channel: "email",
      data: {
        ...marketContext,
        reset_url: resetUrl.toString(),
      },
      template: "user-forgotpwd",
      to: email,
      trigger_type: "customer.password_reset_requested",
    }

    return new StepResponse([notification])
  }
)

export const sendForgotPasswordWorkflow = createWorkflow(
  "send-forgot-password",
  (input: WorkflowInput) => {
    const notificationInput = buildForgotPasswordNotificationStep(input)
    const notification = sendNotificationStep(notificationInput)

    return new WorkflowResponse({ notification })
  }
)
