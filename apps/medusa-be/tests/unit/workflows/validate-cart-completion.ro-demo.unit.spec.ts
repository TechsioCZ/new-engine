import { PaymentSessionStatus } from "@medusajs/framework/utils"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const hookMocks = vi.hoisted(() => ({
  validate: vi.fn(),
}))
const graph = vi.fn()

vi.mock("@medusajs/medusa/core-flows", () => ({
  completeCartWorkflow: {
    hooks: { validate: hookMocks.validate },
  },
}))

type ValidateCartCompletionHandler = (
  input: Readonly<{ cart: Readonly<{ id: string }> }>,
  context: Readonly<{
    container: Readonly<{ resolve: () => Readonly<{ graph: typeof graph }> }>
  }>
) => Promise<unknown>

const bindingSha256 = "a".repeat(64)
const exactMarker = {
  binding_sha256: bindingSha256,
  label: "Plată demo (fără debitare)",
  locale: "ro-RO",
  market: "ro",
  payment_mode: "no-debit-demo",
  provider_id: "pp_system_default",
  schema_version: 1,
  source: "herbatika-ro-demo-commerce-v1",
}

const makePurchaseAcceptance = () => ({
  accepted: true,
  acceptedAt: new Date().toISOString(),
  cartId: "cart_ro_demo",
  market: "ro",
  privacyVersion: "2026-08-21",
  schemaVersion: 1,
  termsVersion: "2026-08-21",
})

const makeRoDemoCart = () => ({
  approvals: [],
  currency_code: "ron",
  customer_id: null,
  id: "cart_ro_demo",
  metadata: {
    checkout_purchase_acceptance: makePurchaseAcceptance(),
  },
  payment_collection: {
    payment_sessions: [
      {
        is_selected: true,
        provider_id: "pp_system_default",
        status: PaymentSessionStatus.PENDING,
      },
    ],
  },
  region: {
    countries: [{ iso_2: "ro" }],
    currency_code: "ron",
    metadata: {
      demo: true,
      demo_source: "herbatika-ro-demo-commerce-v1",
      market_code: "ro",
      ro_demo_checkout: { ...exactMarker },
      sales_channel_id: "sc_ro_demo",
    },
  },
  sales_channel_id: "sc_ro_demo",
  shipping_address: { country_code: "ro" },
  shipping_methods: [
    {
      data: {},
      shipping_option: {
        data: { ro_demo_checkout: { ...exactMarker } },
        service_zone: { fulfillment_set: { type: "shipping" } },
        type: { code: "ro-demo-cargus" },
      },
    },
  ],
  total: 100,
})

const container = { resolve: vi.fn(() => ({ graph })) }
const workflowCart = (cart: ReturnType<typeof makeRoDemoCart>) => ({
  id: cart.id,
  metadata: cart.metadata,
})

describe("RO demo cart-completion validation", () => {
  beforeAll(async () => {
    await import("../../../src/workflows/hooks/validate-cart-completion")
  })

  beforeEach(() => {
    graph.mockReset()
    container.resolve.mockClear()
  })

  const handler = () =>
    hookMocks.validate.mock.calls[0]?.[0] as ValidateCartCompletionHandler

  it("completes validation for an exact RO demo no-debit cart", async () => {
    expect(hookMocks.validate).toHaveBeenCalledOnce()
    const cart = makeRoDemoCart()
    graph.mockResolvedValue({ data: [cart] })

    await expect(
      handler()({ cart: workflowCart(cart) }, { container })
    ).resolves.toBeDefined()

    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "cart",
        fields: expect.arrayContaining([
          "currency_code",
          "metadata",
          "region.countries.iso_2",
          "region.currency_code",
          "region.metadata",
          "sales_channel_id",
          "shipping_address.country_code",
          "shipping_methods.shipping_option.data",
        ]),
        filters: { id: "cart_ro_demo" },
      })
    )
  })

  it.each([
    ["missing", undefined],
    [
      "wrong",
      {
        ...exactMarker,
        binding_sha256: "b".repeat(64),
      },
    ],
  ])("rejects a %s shipping marker", async (_case, shippingMarker) => {
    expect(hookMocks.validate).toHaveBeenCalledOnce()
    const cart = makeRoDemoCart()
    cart.shipping_methods[0].shipping_option.data = shippingMarker
      ? { ro_demo_checkout: shippingMarker }
      : {}
    graph.mockResolvedValue({ data: [cart] })

    await expect(
      handler()({ cart: workflowCart(cart) }, { container })
    ).rejects.toThrow("On-site payment requires a pickup shipping option")
  })

  it("rejects mixed pickup and unmarked carrier fulfillment", async () => {
    const cart = makeRoDemoCart()
    graph.mockResolvedValue({
      data: [
        {
          ...cart,
          shipping_methods: [
            {
              data: {},
              shipping_option: {
                data: {},
                service_zone: { fulfillment_set: { type: "pickup" } },
                type: { code: "personal-pickup" },
              },
            },
            {
              data: {},
              shipping_option: {
                data: {},
                service_zone: { fulfillment_set: { type: "shipping" } },
                type: { code: "ro-demo-cargus" },
              },
            },
          ],
        },
      ],
    })

    await expect(
      handler()({ cart: workflowCart(cart) }, { container })
    ).rejects.toThrow("On-site payment requires a pickup shipping option")
  })

  it.each([
    ["missing", null],
    [
      "stale",
      { ...makePurchaseAcceptance(), acceptedAt: "2026-08-19T00:00:00.000Z" },
    ],
    ["cross-market", { ...makePurchaseAcceptance(), market: "sk" }],
    ["tampered", { ...makePurchaseAcceptance(), termsVersion: "old" }],
  ])("rejects %s purchase acceptance immediately before completion", async (_case, acceptance) => {
    const cart = makeRoDemoCart()
    cart.metadata.checkout_purchase_acceptance = acceptance
    graph.mockResolvedValue({ data: [cart] })

    await expect(
      handler()({ cart: workflowCart(cart) }, { container })
    ).rejects.toThrow(
      "Current terms and privacy acceptance is required to complete this cart"
    )
  })

  it("rejects when the fresh cart acceptance differs from the workflow snapshot copied to the order", async () => {
    const cart = makeRoDemoCart()
    const workflowSnapshot = workflowCart(cart)
    cart.metadata = {
      checkout_purchase_acceptance: {
        ...makePurchaseAcceptance(),
        acceptedAt: new Date(Date.now() + 1000).toISOString(),
      },
    }
    graph.mockResolvedValue({ data: [cart] })

    await expect(
      handler()({ cart: workflowSnapshot }, { container })
    ).rejects.toThrow(
      "Current terms and privacy acceptance is required to complete this cart"
    )
  })
})
