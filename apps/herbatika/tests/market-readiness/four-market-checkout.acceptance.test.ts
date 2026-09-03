import { createMedusaCartService } from "@techsio/storefront-data/cart/medusa-service"
import { createMedusaCheckoutService } from "@techsio/storefront-data/checkout/medusa-service"
import { afterEach, describe, expect, it, vi } from "vitest"
import { POST as postOrderPaymentQr } from "@/app/api/storefront/orders/[id]/qr-payment/route"
import { filterPaymentProvidersForShipping } from "@/components/checkout/checkout-payment-compatibility"
import {
  createMarketRuntime,
  resolveMarketRuntimeByHost,
} from "@/lib/market/market-runtime"
import { getHerbatikaMarketContext } from "@/lib/storefront/market-context"
import { createMarketSdkAuthority } from "@/lib/storefront/market-sdk-authority"
import { hasOrderPaymentQrAuthority } from "@/lib/storefront/order-payment-qr"
import {
  FOUR_MARKET_CHECKOUT_ENVIRONMENT,
  FOUR_MARKET_CHECKOUT_FIXTURES,
  type FourMarketCheckoutFixture,
} from "./four-market-checkout-fixture"
import {
  checkoutCartFor,
  createFourMarketCheckoutAudit,
  createFourMarketMockSdk,
} from "./four-market-checkout-mocks"

vi.mock("server-only", () => ({}))

const { resolveBinding } = vi.hoisted(() => ({
  resolveBinding: vi.fn(),
}))

vi.mock("@/lib/market/market-runtime.server", () => ({
  resolveConfiguredMarketRuntimeBindingByHost: resolveBinding,
}))

const callQrRoute = (fixture: FourMarketCheckoutFixture, body: unknown) =>
  postOrderPaymentQr(
    new Request(
      `https://${fixture.host}/api/storefront/orders/order_${fixture.market}/qr-payment`,
      {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json", host: fixture.host },
        method: "POST",
      }
    ),
    { params: Promise.resolve({ id: `order_${fixture.market}` }) }
  )

describe("four-market checkout acceptance matrix", () => {
  const runtime = createMarketRuntime(FOUR_MARKET_CHECKOUT_ENVIRONMENT)

  afterEach(() => {
    resolveBinding.mockReset()
    vi.unstubAllGlobals()
  })

  it.each(
    FOUR_MARKET_CHECKOUT_FIXTURES
  )("$market binds Host to PK, sales channel, region, currency, and isolated checkout reads", async (fixture) => {
    const audit = createFourMarketCheckoutAudit()
    const binding = resolveMarketRuntimeByHost(runtime, fixture.host)
    expect(binding).toMatchObject({
      countryCode: fixture.countryCode,
      locale: fixture.locale,
      market: fixture.market,
      publishableApiKey: fixture.publishableKey,
      publishableApiKeyId: fixture.publishableKeyId,
      regionId: fixture.regionId,
      salesChannelId: fixture.salesChannelId,
    })
    expect(getHerbatikaMarketContext(fixture.market).currencyCode).toBe(
      fixture.currencyCode
    )

    const authority = createMarketSdkAuthority({
      baseUrl: "https://medusa.mock.invalid",
      createSdk: ({ baseUrl, publishableKey }) => {
        expect(baseUrl).toBe("https://medusa.mock.invalid")
        expect(publishableKey).toBe(fixture.publishableKey)
        return createFourMarketMockSdk(fixture, audit)
      },
      runtime,
    })
    const entry = authority(fixture.market)
    const cartService = createMedusaCartService(entry.sdk as never)
    const checkoutService = createMedusaCheckoutService(entry.sdk as never)

    expect(
      await cartService.createCart({
        region_id: fixture.regionId,
      })
    ).toMatchObject(checkoutCartFor(fixture))
    expect(audit.cartCreateRequests).toEqual([{ region_id: fixture.regionId }])
    expect(
      await cartService.retrieveCart(`cart_${fixture.market}`)
    ).toMatchObject(checkoutCartFor(fixture))
    const foreignMarket = FOUR_MARKET_CHECKOUT_FIXTURES.find(
      (candidate) => candidate.market !== fixture.market
    )
    expect(
      await cartService.retrieveCart(`cart_${foreignMarket?.market}`)
    ).toBeNull()

    const shippingOptions = await checkoutService.listShippingOptions(
      `cart_${fixture.market}`
    )
    expect(shippingOptions).toHaveLength(1)
    expect(shippingOptions[0]?.id).toBe(`so_${fixture.market}`)
    expect(audit.shippingRequests).toEqual([
      { cart_id: `cart_${fixture.market}` },
    ])
    const providers = await checkoutService.listPaymentProviders(
      fixture.regionId
    )
    expect(audit.providerRequests).toEqual([{ region_id: fixture.regionId }])
    expect(
      filterPaymentProvidersForShipping({
        paymentProviders: providers,
        shippingOption: shippingOptions[0],
      }).map((provider) => provider.id)
    ).toEqual([fixture.market === "ro" ? "pp_system_default" : "pp_gopay_card"])

    await checkoutService.completeCart?.(`cart_${fixture.market}`)
    expect(audit.completionRequests).toEqual([`cart_${fixture.market}`])
    expect(audit.orderWrites).toEqual([])
    expect(audit.paymentWrites).toEqual([])
  })

  it.each(
    FOUR_MARKET_CHECKOUT_FIXTURES
  )("$market returns QR only after guest ownership and exact Host binding", async (fixture) => {
    const binding = runtime.bindings[fixture.market]
    resolveBinding.mockImplementation((host) =>
      host === fixture.host ? binding : null
    )
    expect(hasOrderPaymentQrAuthority({ isAuthenticated: false })).toBe(false)

    const noAuthorityFetch = vi.fn()
    vi.stubGlobal("fetch", noAuthorityFetch)
    const denied = await callQrRoute(fixture, {})
    expect(denied.status).toBe(404)
    expect(denied.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0"
    )
    expect(noAuthorityFetch).not.toHaveBeenCalled()

    const orderToken = `signed.guest.${fixture.market}`
    expect(
      hasOrderPaymentQrAuthority({ isAuthenticated: false, orderToken })
    ).toBe(true)
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ order: { id: `order_${fixture.market}` } })
      )
      .mockResolvedValueOnce(
        Response.json({
          order: {
            currency_code: fixture.currencyCode,
            id: `order_${fixture.market}`,
            payment_collections: [],
            region_id: fixture.regionId,
            sales_channel_id: fixture.salesChannelId,
          },
        })
      )
    vi.stubGlobal("fetch", upstreamFetch)
    const allowed = await callQrRoute(fixture, { order_token: orderToken })
    expect(allowed.status).toBe(200)
    expect(await allowed.json()).toEqual({
      qr_payment: null,
      status: "not_applicable",
    })
    expect(upstreamFetch).toHaveBeenCalledTimes(2)
    for (const [, init] of upstreamFetch.mock.calls) {
      expect(
        new Headers((init as RequestInit).headers).get("x-publishable-api-key")
      ).toBe(fixture.publishableKey)
    }
  })
})
