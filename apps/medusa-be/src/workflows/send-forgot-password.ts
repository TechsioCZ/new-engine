import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { sendNotificationStep } from "./steps/send-notification"

interface WorkflowInput {
  email: string
  reset_url: string
  store_name?: string
}

export const sendForgotPasswordWorkflow = createWorkflow(
  "send-forgot-password",
  (input: WorkflowInput) => {
    const notificationInput = transform({ input }, (data) => [
      {
        channel: "email",
        data: {
          reset_url: data.input.reset_url,
          store_name: data.input.store_name,
        },
        template: "user-forgotpwd",
        to: data.input.email,
      },
    ])
    const notification = sendNotificationStep(notificationInput)

    return new WorkflowResponse({
      notification,
    })
  },
)
