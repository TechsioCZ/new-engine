import { Modules, PaymentWebhookEvents } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { GET } from "../../../src/api/hooks/payment/paykit_gopay/route"
import {
  PAYKIT_GOPAY_WEBHOOK_PATH,
  PAYKIT_GOPAY_WEBHOOK_PROVIDER_ID,
} from "../../../src/modules/payment-paykit/config"

const createResponse = () =>
  ({
    json: vi.fn().mockReturnThis(),
    sendStatus: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  }) as any

const createRequest = ({
  emit = vi.fn().mockResolvedValue(undefined),
  headers = { host: "shop.example" },
  originalUrl = `${PAYKIT_GOPAY_WEBHOOK_PATH}?id=gopay-payment-1`,
  protocol = "https",
  url = `${PAYKIT_GOPAY_WEBHOOK_PATH}?id=gopay-payment-1`,
}: {
  emit?: ReturnType<typeof vi.fn>
  headers?: Record<string, string>
  originalUrl?: string
  protocol?: string
  url?: string
} = {}) =>
  ({
    headers,
    originalUrl,
    protocol,
    scope: {
      resolve: vi.fn((key) => {
        if (key === Modules.PAYMENT) {
          return {
            options: {
              webhook_delay: 25,
              webhook_retries: 2,
            },
          }
        }

        if (key === Modules.EVENT_BUS) {
          return { emit }
        }

        throw new Error(`Unexpected container key: ${String(key)}`)
      }),
    },
    url,
  }) as any

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
})
