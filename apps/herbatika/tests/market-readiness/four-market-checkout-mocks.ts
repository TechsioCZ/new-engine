import { vi } from "vitest"
import {
  buildRoNoDebitShippingData,
  type FourMarketCheckoutFixture,
} from "./four-market-checkout-fixture"

export type FourMarketCheckoutAudit = {
  cartCreateRequests: unknown[]
  cartReadRequests: string[]
  completionRequests: string[]
  orderWrites: unknown[]
  paymentWrites: unknown[]
  providerRequests: unknown[]
  shippingRequests: unknown[]
}

export const createFourMarketCheckoutAudit = (): FourMarketCheckoutAudit => ({
  cartCreateRequests: [],
  cartReadRequests: [],
  completionRequests: [],
  orderWrites: [],
  paymentWrites: [],
  providerRequests: [],
  shippingRequests: [],
})

export const checkoutCartFor = (fixture: FourMarketCheckoutFixture) => ({
  id: `cart_${fixture.market}`,
  region_id: fixture.regionId,
  sales_channel_id: fixture.salesChannelId,
})

const shippingFor = (fixture: FourMarketCheckoutFixture) => ({
  data:
    fixture.market === "ro"
      ? buildRoNoDebitShippingData()
      : { code: "carrier" },
  id: `so_${fixture.market}`,
  provider_id: `fulfillment_${fixture.market}`,
  service_zone: { fulfillment_set: { type: "shipping" } },
})

export const createFourMarketMockSdk = (
  fixture: FourMarketCheckoutFixture,
  audit: FourMarketCheckoutAudit
) => ({
  client: {
    fetch: vi.fn((path: string, options?: { query?: unknown }) => {
      if (path.startsWith("/store/carts/")) {
        const cartId = path.slice("/store/carts/".length)
        audit.cartReadRequests.push(cartId)
        if (cartId !== `cart_${fixture.market}`) {
          throw Object.assign(new Error("Foreign market cart"), { status: 404 })
        }
        return { cart: checkoutCartFor(fixture) }
      }
      if (path === "/store/shipping-options") {
        audit.shippingRequests.push(options?.query)
        return { shipping_options: [shippingFor(fixture)] }
      }
      if (path === "/store/payment-providers") {
        audit.providerRequests.push(options?.query)
        return {
          payment_providers: [
            { id: "pp_gopay_card" },
            { id: "pp_cash_on_delivery_default" },
            { id: "pp_system_default" },
          ],
        }
      }
      throw new Error(`Unexpected mocked Medusa read: ${path}`)
    }),
  },
  store: {
    cart: {
      complete: vi.fn((cartId: string) => {
        audit.completionRequests.push(cartId)
        return {
          cart: { id: cartId },
          error: { message: "mock only", name: "MockOnly", type: "mock" },
          type: "cart",
        }
      }),
      create: vi.fn((params: unknown) => {
        audit.cartCreateRequests.push(params)
        return { cart: checkoutCartFor(fixture) }
      }),
    },
    payment: {
      initiatePaymentSession: vi.fn((...input: unknown[]) => {
        audit.paymentWrites.push(input)
        throw new Error("Payment writes are forbidden in acceptance tests")
      }),
    },
  },
})
