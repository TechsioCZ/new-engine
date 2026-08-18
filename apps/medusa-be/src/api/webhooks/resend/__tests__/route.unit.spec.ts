import crypto from "node:crypto"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { afterEach, describe, expect, it, vi } from "vitest"
import { RESEND_CONFIG_MODULE } from "../../../../modules/resend-config"
import { POST } from "../route"

type ResendRuntimeConfig = {
  webhook_secret: string | null
}

const payload = JSON.stringify({
  type: "email.bounced",
  data: { email_id: "email_123" },
})

function createRequest(
  config: ResendRuntimeConfig | Error,
  headers: Record<string, string> = {}
): MedusaRequest {
  const getRuntimeConfig =
    config instanceof Error
      ? vi.fn().mockRejectedValue(config)
      : vi.fn().mockResolvedValue(config)

  return {
    body: JSON.parse(payload),
    headers,
    rawBody: Buffer.from(payload),
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === RESEND_CONFIG_MODULE) {
          return { getRuntimeConfig }
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
  now: number
): Record<string, string> {
  const id = "message_123"
  const timestamp = String(Math.floor(now / 1000))
  const signedPayload = [id, timestamp, payload].join(".")
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

function createEnabledConfig(secret: string): ResendRuntimeConfig {
  return { webhook_secret: secret }
}

describe("Resend webhook authentication", () => {
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

  it("rejects disabled Resend configuration", async () => {
    await expect(
      POST(createRequest(new Error("Resend is disabled")), createResponse())
    ).rejects.toThrow("Resend is disabled")
  })

  it("rejects enabled Resend configuration without a webhook secret", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "legacy-secret")

    await expect(
      POST(createRequest({ webhook_secret: null }), createResponse())
    ).rejects.toThrow("Resend webhook secret is not configured")
  })

  it("rejects an unsigned request", async () => {
    const secret = Buffer.from("webhook-secret").toString("base64")
    const request = createRequest(
      createEnabledConfig(["whsec_", secret].join(""))
    )

    await expect(POST(request, createResponse())).rejects.toThrow(
      "Invalid Resend webhook signature"
    )
  })

  it("accepts a current valid signature from the enabled Resend configuration", async () => {
    const now = Number("1786200000000")
    const secret = Buffer.from("webhook-secret").toString("base64")
    const response = createResponse()
    const config = createEnabledConfig(["whsec_", secret].join(""))
    const request = createRequest(config, createSignedHeaders(secret, now))

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
    const config = createEnabledConfig(secret)
    const request = createRequest(config, createSignedHeaders(secret, now))

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
    const config = createEnabledConfig(secret)
    const request = createRequest(
      config,
      createSignedHeaders(secret, oldTimestamp)
    )

    vi.spyOn(Date, "now").mockReturnValue(now)

    await expect(POST(request, createResponse())).rejects.toThrow(
      "Invalid Resend webhook signature"
    )
  })
})
