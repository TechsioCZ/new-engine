import {
  createWorkflow,
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
  ({ email, reset_url, store_name }: WorkflowInput) => {
    const notification = sendNotificationStep([
      {
        to: email,
        channel: "email",
        template: "user-forgotpwd",
        data: {
          reset_url,
          store_name,
        },
      },
    ])

    return new WorkflowResponse({
      notification,
    })
  }
)
