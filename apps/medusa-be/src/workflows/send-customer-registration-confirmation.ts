import type { CreateNotificationDTO } from "@medusajs/framework/types"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { resendEmailTemplates } from "../modules/resend/templates"
import { resolveCustomerNotificationMarketContext } from "../utils/customer-notification-market-context"
import { sendNotificationStep } from "./steps/send-notification"

type WorkflowInput = {
  customer_id: string
  customer_name?: string
  email: string
}

const buildCustomerRegistrationConfirmationNotificationStep = createStep(
  "build-customer-registration-confirmation-notification",
  async (
    input: WorkflowInput,
    { container }
  ): Promise<StepResponse<CreateNotificationDTO[]>> => {
    const marketContext = await resolveCustomerNotificationMarketContext(
      container,
      {
        customerId: input.customer_id,
        email: input.email,
      }
    )

    return new StepResponse([
      {
        to: input.email,
        channel: "email",
        template: resendEmailTemplates.CUSTOMER_REGISTRATION_CONFIRMATION,
        data: {
          ...marketContext,
          customer_id: input.customer_id,
          customer_name: input.customer_name,
        },
        receiver_id: input.customer_id,
        resource_id: input.customer_id,
        resource_type: "customer",
        trigger_type: "customer.registration_confirmed",
      },
    ])
  }
)

export const sendCustomerRegistrationConfirmationWorkflow = createWorkflow(
  "send-customer-registration-confirmation",
  (input: WorkflowInput) => {
    const notificationInput =
      buildCustomerRegistrationConfirmationNotificationStep(input)
    const notification = sendNotificationStep(notificationInput)

    return new WorkflowResponse({
      notification,
    })
  }
)
