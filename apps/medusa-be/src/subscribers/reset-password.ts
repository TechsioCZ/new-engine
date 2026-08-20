import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendForgotPasswordWorkflow } from "../workflows/send-forgot-password"

type ResetPasswordEvent = {
  entity_id: string
  token: string
  actor_type: string
  metadata?: Record<string, unknown>
}

export default async function resetPasswordHandler({
  event: { data },
  container,
}: SubscriberArgs<ResetPasswordEvent>) {
  if (data.actor_type !== "customer") {
    return
  }

  const storefrontMarketCode =
    typeof data.metadata?.storefront_market_code === "string"
      ? data.metadata.storefront_market_code.trim()
      : ""

  await sendForgotPasswordWorkflow(container).run({
    input: {
      email: data.entity_id,
      ...(storefrontMarketCode ? { storefrontMarketCode } : {}),
      token: data.token,
    },
  })
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
