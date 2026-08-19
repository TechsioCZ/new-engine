import { createHmac } from "node:crypto"
import type { TaskConfig } from "payload"
import { getEnvString } from "../utils/env"
import { createRequestTimeout } from "../utils/request"

const TRAILING_SLASH_REGEX = /\/$/

export type MedusaCmsInvalidationInput = {
  collection: string
  doc: Record<string, unknown>
  eventId: string
  occurredAt: string
  operation: string
  sourceVersion: string
}

export const deliverMedusaCmsInvalidation = async (
  input: MedusaCmsInvalidationInput
) => {
  const baseUrl = getEnvString("MEDUSA_BACKEND_URL")?.replace(
    TRAILING_SLASH_REGEX,
    ""
  )
  if (!baseUrl) {
    throw new Error("MEDUSA_BACKEND_URL is required for CMS outbox delivery")
  }

  const webhookSecret = getEnvString("PAYLOAD_WEBHOOK_SECRET")
  if (!webhookSecret) {
    throw new Error(
      "PAYLOAD_WEBHOOK_SECRET is required for CMS outbox delivery"
    )
  }

  const body = JSON.stringify(input)
  const signature = createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex")
  const { controller, clearTimeout } = createRequestTimeout(10_000)

  try {
    const response = await fetch(`${baseUrl}/hooks/cms/invalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-payload-event-id": input.eventId,
        "x-payload-signature": signature,
      },
      body,
      signal: controller.signal,
    })

    if (!response.ok) {
      const message = await response.text().catch(() => "")
      throw new Error(
        `CMS invalidation delivery failed (${response.status}): ${message}`
      )
    }
  } finally {
    clearTimeout()
  }
}

export const medusaCmsInvalidationTask: TaskConfig<{
  input: MedusaCmsInvalidationInput
  output: { eventId: string }
}> = {
  slug: "deliver-medusa-cms-invalidation",
  label: "Deliver Medusa CMS invalidation",
  inputSchema: [
    { name: "collection", type: "text", required: true },
    { name: "doc", type: "json", required: true },
    { name: "eventId", type: "text", required: true },
    { name: "occurredAt", type: "date", required: true },
    { name: "operation", type: "text", required: true },
    { name: "sourceVersion", type: "text", required: true },
  ],
  outputSchema: [{ name: "eventId", type: "text", required: true }],
  retries: {
    attempts: 8,
    backoff: { delay: 1000, type: "exponential" },
  },
  handler: async ({ input }) => {
    await deliverMedusaCmsInvalidation(input)
    return { output: { eventId: input.eventId } }
  },
}
