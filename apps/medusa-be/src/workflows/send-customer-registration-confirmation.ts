import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { resendEmailTemplates } from "../modules/resend/templates"
import { sendNotificationStep } from "./steps/send-notification"

type WorkflowInput = {
  customer_id: string
  customer_name?: string
  email: string
}

export const sendCustomerRegistrationConfirmationWorkflow = createWorkflow(
  "send-customer-registration-confirmation",
  (input: WorkflowInput) => {
    const notificationInput = transform({ input }, (data) => [
      {
        to: data.input.email,
        channel: "email",
        template: resendEmailTemplates.CUSTOMER_REGISTRATION_CONFIRMATION,
        data: {
          customer_id: data.input.customer_id,
          customer_name: data.input.customer_name,
        },
        receiver_id: data.input.customer_id,
        resource_id: data.input.customer_id,
        resource_type: "customer",
        trigger_type: "customer.registration_confirmed",
      },
    ])
    const notification = sendNotificationStep(notificationInput)

    return new WorkflowResponse({
      notification,
    })
  }
)
