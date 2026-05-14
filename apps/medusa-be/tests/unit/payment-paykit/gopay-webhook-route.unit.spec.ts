import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Logger } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  PaymentWebhookEvents,
} from "@medusajs/framework/utils"
import type { Response } from "express"
import { describe, expect, it, vi } from "vitest"
import { GET } from "../../../src/api/hooks/payment/paykit_gopay/route"
import {
  PAYKIT_GOPAY_WEBHOOK_PATH,
  PAYKIT_GOPAY_WEBHOOK_PROVIDER_ID,
} from "../../../src/modules/payment-paykit/config"

const createResponse = (): MedusaResponse => {
  const res = {
    json: vi.fn().mockReturnThis(),
    sendStatus: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  } satisfies Pick<Response, "json" | "sendStatus" | "status">

  return res as MedusaResponse
}

const createRequest = ({
  emit = vi.fn().mockResolvedValue(undefined),
  headers = { host: "shop.example" },
  logger = {
    debug: vi.fn(),
    error: vi.fn(),
  } satisfies Pick<Logger, "debug" | "error">,
  originalUrl = `${PAYKIT_GOPAY_WEBHOOK_PATH}?id=gopay-payment-1`,
  protocol = "https",
  url = `${PAYKIT_GOPAY_WEBHOOK_PATH}?id=gopay-payment-1`,
  webhookDelay = 25,
  webhookRetries = 2,
}: {
  emit?: ReturnType<typeof vi.fn>
  headers?: Record<string, string>
  logger?: Pick<Logger, "debug" | "error">
  originalUrl?: string
  protocol?: string
  url?: string
  webhookDelay?: number
  webhookRetries?: number
} = {}): MedusaRequest => {
  const req = {
    headers,
    originalUrl,
    protocol,
    scope: {
      resolve: vi.fn((key) => {
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

        throw new Error(`Unexpected container key: ${String(key)}`)
      }),
    },
    url,
  } satisfies Partial<MedusaRequest> & {
    originalUrl: string
    protocol: string
  }

  return req as MedusaRequest
}

describe("GoPay payment webhook route", () => {
  it("emits Medusa payment webhook events for GoPay GET callbacks", async () => {
    const emit = vi.fn().mockResolvedValue(undefined)
    const req = createRequest({ emit })
    const res = createResponse()

    await GET(req, res)

    expect(emit).toHaveBeenCalledWith(
      {
        name: PaymentWebhookEvents.WebhookReceived,
        data: {
          provider: PAYKIT_GOPAY_WEBHOOK_PROVIDER_ID,
          payload: {
            data: {
              fullUrl: `https://shop.example${PAYKIT_GOPAY_WEBHOOK_PATH}?id=gopay-payment-1`,
              url: `${PAYKIT_GOPAY_WEBHOOK_PATH}?id=gopay-payment-1`,
            },
            rawData: "",
            headers: req.headers,
          },
        },
      },
      {
        attempts: 2,
        delay: 25,
      }
    )
    expect(res.sendStatus).toHaveBeenCalledWith(200)
  })

  it("preserves explicit zero webhook retry settings", async () => {
    const emit = vi.fn().mockResolvedValue(undefined)
    const req = createRequest({
      emit,
      webhookDelay: 0,
      webhookRetries: 0,
    })
    const res = createResponse()

    await GET(req, res)

    expect(emit).toHaveBeenCalledWith(expect.any(Object), {
      attempts: 0,
      delay: 0,
    })
    expect(res.sendStatus).toHaveBeenCalledWith(200)
  })

  it("rejects callbacks without GoPay payment id", async () => {
    const emit = vi.fn().mockResolvedValue(undefined)
    const req = createRequest({
      emit,
      originalUrl: PAYKIT_GOPAY_WEBHOOK_PATH,
      url: PAYKIT_GOPAY_WEBHOOK_PATH,
    })
    const res = createResponse()

    await GET(req, res)

    expect(emit).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: "Missing GoPay payment id" })
  })

  it("logs webhook emit failures without failing the GoPay callback", async () => {
    const emit = vi.fn().mockRejectedValue(new Error("event bus unavailable"))
    const logger = {
      debug: vi.fn(),
      error: vi.fn(),
    } satisfies Pick<Logger, "debug" | "error">
    const req = createRequest({ emit, logger })
    const res = createResponse()

    await GET(req, res)

    expect(emit).toHaveBeenCalledOnce()
    expect(logger.error).toHaveBeenCalledWith(
      "Failed to emit PayKit payment webhook event",
      expect.any(Error)
    )
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(PAYKIT_GOPAY_WEBHOOK_PROVIDER_ID)
    )
    expect(res.sendStatus).toHaveBeenCalledWith(200)
  })

  it("logs webhook setup failures without failing the GoPay callback", async () => {
    const logger = {
      debug: vi.fn(),
      error: vi.fn(),
    } satisfies Pick<Logger, "debug" | "error">
    const req = createRequest()
    req.scope.resolve = vi.fn((key) => {
      if (key === ContainerRegistrationKeys.LOGGER) {
        return logger
      }

      if (key === Modules.PAYMENT) {
        throw new Error("payment module unavailable")
      }

      throw new Error(`Unexpected container key: ${String(key)}`)
    })
    const res = createResponse()

    await GET(req, res)

    expect(logger.error).toHaveBeenCalledWith(
      "Failed to emit PayKit payment webhook event",
      expect.any(Error)
    )
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(PAYKIT_GOPAY_WEBHOOK_PROVIDER_ID)
    )
    expect(res.sendStatus).toHaveBeenCalledWith(200)
  })
})
