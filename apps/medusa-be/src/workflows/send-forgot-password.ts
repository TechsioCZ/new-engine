import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { sendNotificationStep } from "./steps/send-notification"

type WorkflowInput = {
  email: string
  reset_url: string
  store_name?: string
}

export const sendForgotPasswordWorkflow = createWorkflow(
  "send-forgot-password",
  (input: WorkflowInput) => {
    const notificationInput = transform({ input }, (data) => [
      {
        to: data.input.email,
        channel: "email",
        template: "user-forgotpwd",
        data: {
          reset_url: data.input.reset_url,
          store_name: data.input.store_name,
        },
      },
    ])
    const notification = sendNotificationStep(notificationInput)

    return new WorkflowResponse({
      notification,
    })
  }
)
