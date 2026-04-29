import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { sendForgotPasswordWorkflow } from "../workflows/send-order-confirmation"

type ResetPasswordEvent = {
  entity_id: string
  token: string
  actor_type: string
}

export default async function resetPasswordHandler({
  event: { data },
  container,
}: SubscriberArgs<ResetPasswordEvent>) {
  const storefrontUrl = process.env.STOREFRONT_URL
  if (!storefrontUrl) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "STOREFRONT_URL env var is not set — cannot build password reset link"
    )
  }

  await sendForgotPasswordWorkflow(container).run({
    input: {
      email: data.entity_id,
      reset_url: `${storefrontUrl}/reset-password?token=${data.token}&email=${data.entity_id}`,
    },
  })
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
