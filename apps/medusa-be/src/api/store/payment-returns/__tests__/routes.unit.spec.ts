import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PAYMENT_RETURN_STATE_MODULE } from "../../../../modules/payment-return-state"
import { createCartSessionToken } from "../../../../utils/cart-session"
import { POST as bindPaymentReturn } from "../bind/route"
import { MAX_PAYMENT_RETURN_RESOLUTIONS } from "../helpers"
import { POST as issuePaymentReturn } from "../issue/route"
import { POST as resolvePaymentReturn } from "../resolve/route"
import { POST as resolvePaymentResult } from "../result/route"

const PROVIDER_ID = "pp_paykit_gopay"
const CART_ID = "cart_Case"
const SESSION_ID = "payses_Case"
const SALES_CHANNEL_ID = "sc_cz"
const OPAQUE_RESULT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

const createResponse = () => ({
  json: vi.fn(),
  setHeader: vi.fn(),
  status: vi.fn().mockReturnThis(),
})

type StateRecord = Record<string, unknown> & {
  id: string
  response_count: number
  state_hash: string
}

const createHarness = () => {
  let record: StateRecord | undefined
  let orderId: string | undefined
  let sessionAmbiguous = false
  let sessionSelected = true
  const service = {
    createPaymentReturnStates: vi.fn(async (input: Record<string, unknown>) => {
      record = { ...input, id: "payret_1", response_count: 0 } as StateRecord
      return record
    }),
    deletePaymentReturnStates: vi.fn(async () => {
      record = undefined
    }),
    listPaymentReturnStates: vi.fn(
      async (filters: Record<string, unknown> = {}) => {
        if (!record) {
          return []
        }
        if (filters.state_hash && filters.state_hash !== record.state_hash) {
          return []
        }
        if (filters.cart_id && filters.cart_id !== record.cart_id) {
          return []
        }
        if (filters.provider_id && filters.provider_id !== record.provider_id) {
          return []
        }
        return [record]
      }
    ),
    updatePaymentReturnStates: vi.fn(async (input: Record<string, unknown>) => {
      record = { ...record, ...input } as StateRecord
      return record
    }),
  }
  const graph = vi.fn(async (input: { entity: string }) => {
    if (input.entity === "cart") {
      return {
        data: [
          {
            completed_at: orderId ? new Date() : null,
            id: CART_ID,
            items: [{ id: "item_1" }],
            payment_collection: {
              payment_sessions: [
                {
                  id: SESSION_ID,
                  is_selected: sessionSelected,
                  provider_id: PROVIDER_ID,
                  status: "authorized",
                },
                ...(sessionAmbiguous
                  ? [
                      {
                        id: "payses_ambiguous",
                        is_selected: false,
                        provider_id: PROVIDER_ID,
                        status: "authorized",
                      },
                    ]
                  : []),
              ],
            },
            sales_channel_id: SALES_CHANNEL_ID,
          },
        ],
      }
    }
    if (input.entity === "order") {
      return {
        data: orderId
          ? [
              {
                cart_id: CART_ID,
                id: orderId,
                sales_channel_id: SALES_CHANNEL_ID,
              },
            ]
          : [],
      }
    }
    throw new Error(`Unexpected graph entity: ${input.entity}`)
  })
  const cartSession = createCartSessionToken(
    { cart_id: CART_ID, sales_channel_id: SALES_CHANNEL_ID },
    process.env.COOKIE_SECRET as string
  )
  const request = (body: Record<string, unknown>) => ({
    body,
    headers: { "x-cart-session": cartSession },
    publishable_key_context: { sales_channel_ids: [SALES_CHANNEL_ID] },
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === ContainerRegistrationKeys.QUERY) {
          return { graph }
        }
        if (key === PAYMENT_RETURN_STATE_MODULE) {
          return service
        }
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  })

  return {
    graph,
    request,
    service,
    setSessionAmbiguous: (value: boolean) => {
      sessionAmbiguous = value
    },
    setOrderId: (value: string) => {
      orderId = value
    },
    setSessionSelected: (value: boolean) => {
      sessionSelected = value
    },
  }
}

describe("payment-return store contract", () => {
  beforeEach(() => {
    process.env.COOKIE_SECRET = "payment-return-test-secret"
  })

  afterEach(() => {
    Reflect.deleteProperty(process.env, "COOKIE_SECRET")
  })

  it("issues, binds, resolves, and safely replays one exact return state", async () => {
    const harness = createHarness()
    const issueResponse = createResponse()
    await issuePaymentReturn(
      harness.request({ cart_id: CART_ID, provider_id: PROVIDER_ID }) as never,
      issueResponse as never
    )
    const issued = issueResponse.json.mock.calls[0]?.[0] as {
      provider: string
      state: string
    }

    expect(issued.provider).toBe("gopay")
    expect(issued.state).not.toContain(CART_ID)
    expect(issueResponse.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "private, no-store"
    )

    const bindResponse = createResponse()
    await bindPaymentReturn(
      harness.request({
        cart_id: CART_ID,
        payment_session_id: SESSION_ID,
        provider_id: PROVIDER_ID,
        state: issued.state,
      }) as never,
      bindResponse as never
    )
    expect(bindResponse.json).toHaveBeenCalledWith({
      cart_id: CART_ID,
      payment_session_id: SESSION_ID,
      provider_id: PROVIDER_ID,
    })

    const firstResolve = createResponse()
    await resolvePaymentReturn(
      harness.request({
        cart_id: CART_ID,
        provider_id: PROVIDER_ID,
        state: issued.state,
      }) as never,
      firstResolve as never
    )
    expect(firstResolve.json).toHaveBeenCalledWith({
      cart_id: CART_ID,
      payment_session_id: SESSION_ID,
      provider_id: PROVIDER_ID,
      result_token: expect.stringMatching(OPAQUE_RESULT_TOKEN_PATTERN),
      status: "authorized",
    })

    harness.setOrderId("order_Case")
    const completedResolve = createResponse()
    await resolvePaymentReturn(
      harness.request({
        cart_id: CART_ID,
        payment_session_id: SESSION_ID,
        provider_id: PROVIDER_ID,
        state: issued.state,
      }) as never,
      completedResolve as never
    )
    expect(completedResolve.json).toHaveBeenCalledWith({
      cart_id: CART_ID,
      payment_session_id: SESSION_ID,
      provider_id: PROVIDER_ID,
      public_order_id: "order_Case",
      result_token: expect.stringMatching(OPAQUE_RESULT_TOKEN_PATTERN),
      status: "completed",
    })
    const completedPayload = completedResolve.json.mock.calls[0]?.[0] as {
      result_token: string
    }

    const resultResponse = createResponse()
    await resolvePaymentResult(
      harness.request({
        result_token: completedPayload.result_token,
      }) as never,
      resultResponse as never
    )
    expect(resultResponse.json).toHaveBeenCalledWith({
      cart_id: CART_ID,
      payment_session_id: SESSION_ID,
      provider_id: PROVIDER_ID,
      public_order_id: "order_Case",
      status: "completed",
    })

    const replayResponse = createResponse()
    await resolvePaymentReturn(
      harness.request({
        cart_id: CART_ID,
        provider_id: PROVIDER_ID,
        state: issued.state,
      }) as never,
      replayResponse as never
    )
    expect(replayResponse.json).toHaveBeenCalledWith(
      completedResolve.json.mock.calls[0]?.[0]
    )
    expect(JSON.stringify(replayResponse.json.mock.calls)).not.toContain(
      issued.state
    )
  })

  it("uses uniform not-found errors for tampering and binding mismatches", async () => {
    const harness = createHarness()
    const issueResponse = createResponse()
    await issuePaymentReturn(
      harness.request({ cart_id: CART_ID, provider_id: PROVIDER_ID }) as never,
      issueResponse as never
    )
    const state = (issueResponse.json.mock.calls[0]?.[0] as { state: string })
      .state

    await expect(
      bindPaymentReturn(
        harness.request({
          cart_id: CART_ID,
          payment_session_id: "payses_wrong",
          provider_id: PROVIDER_ID,
          state,
        }) as never,
        createResponse() as never
      )
    ).rejects.toMatchObject({ type: "not_found" })

    await expect(
      bindPaymentReturn(
        harness.request({
          cart_id: CART_ID,
          payment_session_id: SESSION_ID,
          provider_id: PROVIDER_ID,
          state: `${state.slice(0, -1)}x`,
        }) as never,
        createResponse() as never
      )
    ).rejects.toMatchObject({ type: "not_found" })

    harness.setSessionAmbiguous(true)
    harness.setSessionSelected(false)
    await expect(
      bindPaymentReturn(
        harness.request({
          cart_id: CART_ID,
          payment_session_id: SESSION_ID,
          provider_id: PROVIDER_ID,
          state,
        }) as never,
        createResponse() as never
      )
    ).rejects.toMatchObject({ type: "not_found" })

    const wrongMarketRequest = harness.request({
      cart_id: CART_ID,
      payment_session_id: SESSION_ID,
      provider_id: PROVIDER_ID,
      state,
    })
    wrongMarketRequest.publishable_key_context = {
      sales_channel_ids: ["sc_wrong"],
    }
    await expect(
      bindPaymentReturn(wrongMarketRequest as never, createResponse() as never)
    ).rejects.toMatchObject({ type: "not_found" })
  })

  it("bounds non-terminal callback-state replay", async () => {
    const harness = createHarness()
    const issueResponse = createResponse()
    await issuePaymentReturn(
      harness.request({ cart_id: CART_ID, provider_id: PROVIDER_ID }) as never,
      issueResponse as never
    )
    const state = (issueResponse.json.mock.calls[0]?.[0] as { state: string })
      .state
    await bindPaymentReturn(
      harness.request({
        cart_id: CART_ID,
        payment_session_id: SESSION_ID,
        provider_id: PROVIDER_ID,
        state,
      }) as never,
      createResponse() as never
    )

    for (let attempt = 0; attempt < MAX_PAYMENT_RETURN_RESOLUTIONS; attempt++) {
      const response = createResponse()
      await resolvePaymentReturn(
        harness.request({
          cart_id: CART_ID,
          provider_id: PROVIDER_ID,
          state,
        }) as never,
        response as never
      )
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: "authorized" })
      )
    }

    await expect(
      resolvePaymentReturn(
        harness.request({
          cart_id: CART_ID,
          provider_id: PROVIDER_ID,
          state,
        }) as never,
        createResponse() as never
      )
    ).rejects.toMatchObject({ type: "not_found" })
  })

  it("returns a generic 503 without leaking infrastructure errors", async () => {
    const harness = createHarness()
    harness.graph.mockRejectedValueOnce(new Error("db password"))
    const response = createResponse()
    await issuePaymentReturn(
      harness.request({ cart_id: CART_ID, provider_id: PROVIDER_ID }) as never,
      response as never
    )

    expect(response.status).toHaveBeenCalledWith(503)
    expect(response.json).toHaveBeenCalledWith({
      message: "Payment return verification is temporarily unavailable.",
    })
    expect(JSON.stringify(response.json.mock.calls)).not.toContain("password")
  })
})
