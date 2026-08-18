import crypto from "node:crypto"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RESEND_CONFIG_MODULE } from "../../../../modules/resend-config"
import { POST } from "../route"

const runProcessResendWebhookEventWorkflow = vi.hoisted(() => vi.fn())

vi.mock(
  "../../../../workflows/resend-webhook/process-resend-webhook-event",
  () => ({
    processResendWebhookEventWorkflow: vi.fn(() => ({
      run: runProcessResendWebhookEventWorkflow,
    })),
  })
)

const payload = JSON.stringify({
  type: "email.bounced",
  data: { email_id: "email_123" },
})
const checkedPayload = JSON.stringify({
  type: "email.delivered",
  data: { email_id: "email_123" },
})

function createRequest(
  webhookSecret: string | null | Error,
  headers: Record<string, string> = {},
  requestPayload = payload
): MedusaRequest {
  const getWebhookSecret =
    webhookSecret instanceof Error
      ? vi.fn().mockRejectedValue(webhookSecret)
      : vi.fn().mockResolvedValue(webhookSecret)

  return {
    body: JSON.parse(requestPayload),
    headers,
    rawBody: Buffer.from(requestPayload),
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === RESEND_CONFIG_MODULE) {
          return { getWebhookSecret }
        }

        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  } as unknown as MedusaRequest
}

function createResponse(): MedusaResponse {
  return { json: vi.fn() } as unknown as MedusaResponse
}

function createSignedHeaders(
  secret: string,
  now: number,
  signedBody = payload
): Record<string, string> {
  const id = "message_123"
  const timestamp = String(Math.floor(now / 1000))
  const signedPayload = [id, timestamp, signedBody].join(".")
  const signature = crypto
    .createHmac("sha256", Buffer.from(secret, "base64"))
    .update(signedPayload)
    .digest("base64")

  return {
    "svix-id": id,
    "svix-signature": ["v1", signature].join(","),
    "svix-timestamp": timestamp,
  }
}

describe("Resend webhook authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    runProcessResendWebhookEventWorkflow.mockResolvedValue({
      result: { checked_count: 1, found_count: 1 },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("rejects missing Resend configuration even when the legacy environment secret exists", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "legacy-secret")

    await expect(
      POST(
        createRequest(new Error("Resend is not configured")),
        createResponse()
      )
    ).rejects.toThrow("Resend is not configured")
  })

  it("rejects stored Resend configuration without a webhook secret", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "legacy-secret")

    await expect(POST(createRequest(null), createResponse())).rejects.toThrow(
      "Resend webhook secret is not configured"
    )
  })

  it("rejects an unsigned request", async () => {
    const secret = Buffer.from("webhook-secret").toString("base64")
    const request = createRequest(["whsec_", secret].join(""))

    await expect(POST(request, createResponse())).rejects.toThrow(
      "Invalid Resend webhook signature"
    )
  })

  it("accepts a current valid signature from the stored webhook secret", async () => {
    const now = Number("1786200000000")
    const secret = Buffer.from("webhook-secret").toString("base64")
    const response = createResponse()
    const request = createRequest(
      ["whsec_", secret].join(""),
      createSignedHeaders(secret, now)
    )

    vi.spyOn(Date, "now").mockReturnValue(now)

    await POST(request, response)

    expect(response.json).toHaveBeenCalledWith({
      received: true,
      checked: false,
    })
  })

  it("processes only the event authenticated in the signed raw payload", async () => {
    const now = Number("1786200000000")
    const secret = Buffer.from("webhook-secret").toString("base64")
    const response = createResponse()
    const request = createRequest(secret, createSignedHeaders(secret, now))

    request.body = { type: "email.sent", data: { email_id: "unsigned-email" } }
    vi.spyOn(Date, "now").mockReturnValue(now)

    await POST(request, response)

    expect(response.json).toHaveBeenCalledWith({
      received: true,
      checked: false,
    })
  })

  it("rejects a valid signature outside the allowed timestamp window", async () => {
    const now = Number("1786200000000")
    const secret = Buffer.from("webhook-secret").toString("base64")
    const oldTimestamp = now - Number("301000")
    const request = createRequest(
      secret,
      createSignedHeaders(secret, oldTimestamp)
    )

    vi.spyOn(Date, "now").mockReturnValue(now)

    await expect(POST(request, createResponse())).rejects.toThrow(
      "Invalid Resend webhook signature"
    )
  })

  it("passes the signed Svix event id to the processing workflow", async () => {
    const now = Number("1786200000000")
    const secret = Buffer.from("webhook-secret").toString("base64")
    const request = createRequest(
      secret,
      createSignedHeaders(secret, now, checkedPayload),
      checkedPayload
    )

    vi.spyOn(Date, "now").mockReturnValue(now)

    await POST(request, createResponse())

    expect(runProcessResendWebhookEventWorkflow).toHaveBeenCalledWith({
      input: {
        email_id: "email_123",
        event: {
          data: { email_id: "email_123" },
          type: "email.delivered",
        },
        event_id: "message_123",
      },
    })
  })
})
