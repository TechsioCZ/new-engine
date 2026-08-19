import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { ORDER_CONFIRMATION_MODULE } from "../../../../modules/order-confirmation"
import { hashOrderConfirmationToken } from "../../../../modules/order-confirmation/token"
import { createCartSessionToken } from "../../../../utils/cart-session"
import { POST as issueOrderToken } from "../issue/route"
import { POST } from "../resolve/route"

const createResponse = () => ({
  json: vi.fn(),
  setHeader: vi.fn(),
})

const OPAQUE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

describe("POST /store/order-confirmations/resolve", () => {
  it("returns a safe order projection for an exact usable guest token", async () => {
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          cart_id: "cart_1",
          customer_id: null,
          display_id: 42,
          id: "order_Case",
          items: [{ id: "item_1", title: "Tea" }],
          sales_channel_id: "sc_cz",
          total: 1200,
        },
      ],
    })
    const listOrderConfirmationAccesses = vi.fn().mockResolvedValue([
      {
        customer_id: null,
        expires_at: new Date(Date.now() + 60_000),
        id: "oca_1",
        order_id: "order_Case",
        public_order_id: "order_Case",
        sales_channel_id: "sc_cz",
        token_hash: hashOrderConfirmationToken("ExactToken"),
        used_at: null,
      },
    ])
    const request = {
      body: {
        order_token: "ExactToken",
        public_order_id: "order_Case",
      },
      headers: {},
      publishable_key_context: { sales_channel_ids: ["sc_cz"] },
      scope: {
        resolve: vi.fn((key: string) => {
          if (key === ContainerRegistrationKeys.QUERY) {
            return { graph }
          }
          if (key === ORDER_CONFIRMATION_MODULE) {
            return { listOrderConfirmationAccesses }
          }
          throw new Error(`Unexpected dependency: ${key}`)
        }),
      },
    }
    const response = createResponse()

    await POST(request as never, response as never)

    expect(response.json).toHaveBeenCalledWith({
      order: {
        display_id: 42,
        id: "order_Case",
        items: [{ id: "item_1", title: "Tea" }],
        total: 1200,
      },
    })
    expect(JSON.stringify(response.json.mock.calls)).not.toContain("ExactToken")
    expect(response.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "private, no-store"
    )
  })

  it("uses the same not-found error for wrong-case and expired values", async () => {
    const graph = vi.fn().mockResolvedValue({ data: [] })
    const request = {
      body: { order_token: "bad", public_order_id: "ORDER_case" },
      headers: {},
      publishable_key_context: { sales_channel_ids: ["sc_cz"] },
      scope: { resolve: vi.fn(() => ({ graph })) },
    }

    await expect(
      POST(request as never, createResponse() as never)
    ).rejects.toMatchObject({ type: "not_found" })
  })
})

describe("POST /store/order-confirmations/issue", () => {
  it("issues a hashed token only for the exact signed cart session", async () => {
    const previousSecret = process.env.COOKIE_SECRET
    process.env.COOKIE_SECRET = "cart-session-test-secret"
    try {
      const graph = vi.fn().mockResolvedValue({
        data: [
          {
            cart_id: "cart_Case",
            customer_id: null,
            id: "order_Case",
            sales_channel_id: "sc_cz",
          },
        ],
      })
      const createOrderConfirmationAccesses = vi
        .fn()
        .mockResolvedValue({ id: "oca_1" })
      const deleteOrderConfirmationAccesses = vi.fn()
      const listOrderConfirmationAccesses = vi.fn().mockResolvedValue([])
      const cartSession = createCartSessionToken(
        { cart_id: "cart_Case", sales_channel_id: "sc_cz" },
        process.env.COOKIE_SECRET
      )
      const response = createResponse()

      await issueOrderToken(
        {
          body: {
            cart_id: "cart_Case",
            public_order_id: "order_Case",
          },
          headers: { "x-cart-session": cartSession },
          publishable_key_context: { sales_channel_ids: ["sc_cz"] },
          scope: {
            resolve: vi.fn((key: string) => {
              if (key === ContainerRegistrationKeys.QUERY) {
                return { graph }
              }
              if (key === ORDER_CONFIRMATION_MODULE) {
                return {
                  createOrderConfirmationAccesses,
                  deleteOrderConfirmationAccesses,
                  listOrderConfirmationAccesses,
                }
              }
              throw new Error(`Unexpected dependency: ${key}`)
            }),
          },
        } as never,
        response as never
      )

      const payload = response.json.mock.calls[0]?.[0] as {
        order_token: string
      }
      expect(payload.order_token).toMatch(OPAQUE_TOKEN_PATTERN)
      expect(createOrderConfirmationAccesses).toHaveBeenCalledWith(
        expect.objectContaining({
          order_id: "order_Case",
          token_hash: hashOrderConfirmationToken(payload.order_token),
        })
      )
      expect(
        JSON.stringify(createOrderConfirmationAccesses.mock.calls)
      ).not.toContain(payload.order_token)
      expect(deleteOrderConfirmationAccesses).not.toHaveBeenCalled()
    } finally {
      if (previousSecret === undefined) {
        Reflect.deleteProperty(process.env, "COOKIE_SECRET")
      } else {
        process.env.COOKIE_SECRET = previousSecret
      }
    }
  })
})
