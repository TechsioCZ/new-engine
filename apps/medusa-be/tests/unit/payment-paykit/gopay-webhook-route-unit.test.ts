import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Logger } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  PaymentWebhookEvents,
} from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"

import { GET } from "../../../src/api/hooks/payment/paykit_gopay/route"
import {
  PAYKIT_GOPAY_WEBHOOK_PATH,
  PAYKIT_GOPAY_WEBHOOK_PROVIDER_ID,
} from "../../../src/modules/payment-paykit/constants"

/**
 * Asserts that a plain mock object contains the given keys before narrowing
 * it to a framework type. Building the mock as `unknown` first avoids
 * requiring every property of the huge Node request/response interfaces
 * while still validating the shape the route handler reads at runtime.
 */
const assertMockShape: <T>(
  candidate: unknown,
  requiredKeys: readonly (keyof T)[],
) => asserts candidate is T = (candidate, requiredKeys) => {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError("Expected a mock object")
  }

  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock object missing required key: ${String(key)}`)
    }
  }
}

type EmitMock = ReturnType<
  typeof vi.fn<(event: unknown, options?: unknown) => Promise<void>>
>

const createEmitMock = () =>
  vi.fn<(event: unknown, options?: unknown) => Promise<void>>()

const createLogger = (): Pick<Logger, "debug" | "error"> => ({
  debug: vi.fn<Logger["debug"]>(),
  error: vi.fn<Logger["error"]>(),
})

const createResponse = () => {
  const json = vi.fn<MedusaResponse["json"]>().mockReturnThis()
  const sendStatus = vi.fn<MedusaResponse["sendStatus"]>().mockReturnThis()
  const status = vi.fn<MedusaResponse["status"]>().mockReturnThis()
  const candidate: unknown = { json, sendStatus, status }

  assertMockShape<MedusaResponse>(candidate, ["json", "sendStatus", "status"])
  return { json, response: candidate, sendStatus, status }
}

const createRequest = ({
  emit = createEmitMock().mockResolvedValue(),
  headers = { host: "shop.example" },
  logger = createLogger(),
  originalUrl = `${PAYKIT_GOPAY_WEBHOOK_PATH}?id=gopay-payment-1`,
  protocol = "https",
  url = `${PAYKIT_GOPAY_WEBHOOK_PATH}?id=gopay-payment-1`,
  webhookDelay = 25,
  webhookRetries = 2,
}: {
  emit?: EmitMock
  headers?: Record<string, string>
  logger?: Pick<Logger, "debug" | "error">
  originalUrl?: string
  protocol?: string
  url?: string
  webhookDelay?: number
  webhookRetries?: number
} = {}): MedusaRequest => {
  const candidate: unknown = {
    headers,
    originalUrl,
    protocol,
    scope: {
      resolve: vi.fn<(key: string) => unknown>((key) => {
        if (key === Modules.PAYMENT) {
          return {
            options: {
              webhook_delay: webhookDelay,
              webhook_retries: webhookRetries,
            },
          }
        }

        if (key === Modules.EVENT_BUS) {
          return { emit }
        }

        if (key === ContainerRegistrationKeys.LOGGER) {
          return logger
        }

        throw new Error(`Unexpected container key: ${key}`)
      }),
    },
    url,
  }

  assertMockShape<MedusaRequest>(candidate, [
    "headers",
    "originalUrl",
    "protocol",
    "scope",
    "url",
  ])
  return candidate
}

describe("GoPay payment webhook route", () => {
  it("emits Medusa payment webhook events for GoPay GET callbacks", async () => {
    const emit = createEmitMock().mockResolvedValue()
    const req = createRequest({ emit })
    const res = createResponse()

    await GET(req, res.response)

    expect(emit).toHaveBeenCalledWith(
      {
        data: {
          payload: {
            data: {
              fullUrl: `https://shop.example${PAYKIT_GOPAY_WEBHOOK_PATH}?id=gopay-payment-1`,
              url: `${PAYKIT_GOPAY_WEBHOOK_PATH}?id=gopay-payment-1`,
            },
            headers: req.headers,
            rawData: "",
          },
          provider: PAYKIT_GOPAY_WEBHOOK_PROVIDER_ID,
        },
        name: PaymentWebhookEvents.WebhookReceived,
      },
      {
        attempts: 2,
        delay: 25,
      },
    )
    expect(res.sendStatus).toHaveBeenCalledWith(200)
  })

  it("preserves explicit zero webhook retry settings", async () => {
    const emit = createEmitMock().mockResolvedValue()
    const req = createRequest({
      emit,
      webhookDelay: 0,
      webhookRetries: 0,
    })
    const res = createResponse()

    await GET(req, res.response)

    expect(emit).toHaveBeenCalledWith(expect.any(Object), {
      attempts: 0,
      delay: 0,
    })
    expect(res.sendStatus).toHaveBeenCalledWith(200)
  })

  it("rejects callbacks without GoPay payment id", async () => {
    const emit = createEmitMock().mockResolvedValue()
    const req = createRequest({
      emit,
      originalUrl: PAYKIT_GOPAY_WEBHOOK_PATH,
      url: PAYKIT_GOPAY_WEBHOOK_PATH,
    })
    const res = createResponse()

    await GET(req, res.response)

    expect(emit).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: "Missing GoPay payment id" })
  })

  it("logs webhook emit failures without failing the GoPay callback", async () => {
    const emit = createEmitMock().mockRejectedValue(
      new Error("event bus unavailable"),
    )
    const logger = createLogger()
    const req = createRequest({ emit, logger })
    const res = createResponse()

    await GET(req, res.response)

    expect(emit).toHaveBeenCalledOnce()
    expect(logger.error).toHaveBeenCalledWith(
      "Failed to emit PayKit payment webhook event",
      expect.any(Error),
    )
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(PAYKIT_GOPAY_WEBHOOK_PROVIDER_ID),
    )
    expect(res.sendStatus).toHaveBeenCalledWith(200)
  })

  it("logs webhook setup failures without failing the GoPay callback", async () => {
    const logger = createLogger()
    const req = createRequest()
    vi.spyOn(req.scope, "resolve").mockImplementation((key) => {
      if (key === ContainerRegistrationKeys.LOGGER) {
        return logger
      }

      if (key === Modules.PAYMENT) {
        throw new Error("payment module unavailable")
      }

      throw new Error(`Unexpected container key: ${key}`)
    })
    const res = createResponse()

    await GET(req, res.response)

    expect(logger.error).toHaveBeenCalledWith(
      "Failed to emit PayKit payment webhook event",
      expect.any(Error),
    )
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(PAYKIT_GOPAY_WEBHOOK_PROVIDER_ID),
    )
    expect(res.sendStatus).toHaveBeenCalledWith(200)
  })
})
