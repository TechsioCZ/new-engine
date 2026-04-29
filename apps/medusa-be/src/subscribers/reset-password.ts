import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendForgotPasswordWorkflow } from "../workflows/send-order-confirmation"

type ResetPasswordEvent = {
  entity_id: string
  token: string
  actor_type: string
}

type ConfigModule = {
  admin?: {
    backendUrl?: string
    path?: string
    storefrontUrl?: string
  }
}

export default async function resetPasswordHandler({
  event: { data },
  container,
}: SubscriberArgs<ResetPasswordEvent>) {
  const configModule = container.resolve<ConfigModule>("configModule")
  const storefrontUrl =
    configModule.admin?.storefrontUrl || "http://localhost:3000"

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
