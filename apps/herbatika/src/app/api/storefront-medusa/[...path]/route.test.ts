import { afterEach, describe, expect, it, vi } from "vitest"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"

const CZ_BINDING: MarketRuntimeBinding = {
  acceptedHosts: ["herbatica.cz"],
  canonicalOrigin: "https://herbatica.cz",
  countryCode: "CZ",
  locale: "cs-CZ",
  market: "cz",
  publishableApiKey: "pk_server_cz_secret",
  publishableApiKeyId: "pkid_cz",
  regionId: "reg_cz",
  salesChannelId: "sc_cz",
}

const SK_BINDING: MarketRuntimeBinding = {
  acceptedHosts: ["herbatica.sk"],
  canonicalOrigin: "https://herbatica.sk",
  countryCode: "SK",
  locale: "sk-SK",
  market: "sk",
  publishableApiKey: "pk_server_sk_secret",
  publishableApiKeyId: "pkid_sk",
  regionId: "reg_sk",
  salesChannelId: "sc_sk",
}

const HU_BINDING: MarketRuntimeBinding = {
  acceptedHosts: ["herbatica.hu"],
  canonicalOrigin: "https://herbatica.hu",
  countryCode: "HU",
  locale: "hu-HU",
  market: "hu",
  publishableApiKey: "pk_server_hu_secret",
  publishableApiKeyId: "pkid_hu",
  regionId: "reg_hu",
  salesChannelId: "sc_hu",
}

const RO_BINDING: MarketRuntimeBinding = {
  acceptedHosts: ["herbatica.ro"],
  canonicalOrigin: "https://herbatica.ro",
  countryCode: "RO",
  locale: "ro-RO",
  market: "ro",
  publishableApiKey: "pk_server_ro_secret",
  publishableApiKeyId: "pkid_ro",
  regionId: "reg_ro",
  salesChannelId: "sc_ro",
}

const MARKET_CASES = [
  ["herbatica.cz", CZ_BINDING],
  ["herbatica.sk", SK_BINDING],
  ["herbatica.hu", HU_BINDING],
  ["herbatica.ro", RO_BINDING],
] as const

const GATEWAY_ERROR_CASES = [
  [
    "herbatica.cz",
    "Cesta API obchodu není dostupná.",
    "Požadovaný zdroj obchodu není dostupný.",
    "Požadavek API obchodu selhal.",
  ],
  [
    "herbatica.sk",
    "Cesta API obchodu nie je dostupná.",
    "Požadovaný zdroj obchodu nie je dostupný.",
    "Požiadavka API obchodu zlyhala.",
  ],
  [
    "herbatica.hu",
    "Az áruházi API-útvonal nem érhető el.",
    "A kért áruházi erőforrás nem érhető el.",
    "Az áruházi API-kérés sikertelen.",
  ],
  [
    "herbatica.ro",
    "Calea API a magazinului nu este disponibilă.",
    "Resursa solicitată a magazinului nu este disponibilă.",
    "Cererea către API-ul magazinului a eșuat.",
  ],
] as const

const FOREIGN_MARKET_PAIRS = MARKET_CASES.map(
  (marketCase, index) =>
    [marketCase, MARKET_CASES[(index + 1) % MARKET_CASES.length]] as const
)

const { resolveBinding } = vi.hoisted(() => ({
  resolveBinding: vi.fn(),
}))

vi.mock("@/lib/market/market-runtime.server", () => ({
  resolveConfiguredMarketRuntimeBindingByHost: resolveBinding,
}))

import { handleStorefrontMedusaRequest } from "./_proxy"

const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const resolveByHost = (host: string | null | undefined) =>
  MARKET_CASES.find(([acceptedHost]) => acceptedHost === host)?.[1] ?? null

type GatewayRequestOptions = Readonly<{
  body?: string
  headers?: HeadersInit
  host?: string
  method?: "DELETE" | "GET" | "POST"
  params?: readonly string[]
}>

const gatewayRequest = (
  pathAndQuery: string,
  options: GatewayRequestOptions = {}
) => {
  const host = options.host ?? "herbatica.cz"
  const method = options.method ?? "GET"
  const path = pathAndQuery.split("?", 1)[0]
  const headers = new Headers(options.headers)
  headers.set("host", host)
  if (method !== "GET" && !headers.has("origin")) {
    headers.set("origin", `https://${host}`)
  }

  return {
    context: {
      params: Promise.resolve({
        path: options.params ?? path.slice(1).split("/"),
      }),
    },
    request: new Request(
      `https://${host}/api/storefront-medusa${pathAndQuery}`,
      {
        body: options.body,
        headers,
        method,
      }
    ),
  }
}

const callGateway = (pathAndQuery: string, options?: GatewayRequestOptions) => {
  const { context, request } = gatewayRequest(pathAndQuery, options)
  return handleStorefrontMedusaRequest(request, context)
}

describe("storefront Medusa gateway", () => {
  afterEach(() => {
    resolveBinding.mockReset()
    vi.unstubAllGlobals()
  })

  it("selects the publishable key from the exact request Host", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi
      .fn()
      .mockResolvedValue(Response.json({ products: [] }))
    vi.stubGlobal("fetch", upstreamFetch)

    await callGateway("/store/products?region_id=reg_cz")
    await callGateway("/store/products?region_id=reg_sk", {
      host: "herbatica.sk",
    })

    expect(resolveBinding).toHaveBeenNthCalledWith(1, "herbatica.cz")
    expect(resolveBinding).toHaveBeenNthCalledWith(2, "herbatica.sk")
    const czHeaders = new Headers(upstreamFetch.mock.calls[0][1]?.headers)
    const skHeaders = new Headers(upstreamFetch.mock.calls[1][1]?.headers)
    expect(czHeaders.get("x-publishable-api-key")).toBe("pk_server_cz_secret")
    expect(skHeaders.get("x-publishable-api-key")).toBe("pk_server_sk_secret")
  })

  it.each(
    MARKET_CASES
  )("allows only the exact path-bound region for %s", async (host, binding) => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi
      .fn()
      .mockResolvedValue(Response.json({ region: { id: binding.regionId } }))
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway(`/store/regions/${binding.regionId}`, {
      host,
    })

    expect(response.status).toBe(200)
    expect(upstreamFetch).toHaveBeenCalledOnce()
  })

  it.each(
    FOREIGN_MARKET_PAIRS
  )("rejects a foreign path-bound region on %s", async ([host], [
    ,
    foreignBinding,
  ]) => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi.fn()
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway(
      `/store/regions/${foreignBinding.regionId}`,
      { host }
    )

    expect(response.status).toBe(400)
    expect(upstreamFetch).not.toHaveBeenCalled()
  })

  it.each(
    MARKET_CASES
  )("preflights cart ids against the exact market on %s", async (host, binding) => {
    resolveBinding.mockImplementation(resolveByHost)
    const cartId = `cart_${binding.market}`
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          cart: { id: cartId, sales_channel_id: binding.salesChannelId },
        })
      )
      .mockResolvedValueOnce(Response.json({ cart: { id: cartId } }))
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway(`/store/carts/${cartId}`, { host })

    expect(response.status).toBe(200)
    expect(upstreamFetch).toHaveBeenCalledTimes(2)
    const [authorityUrl, authorityInit] = upstreamFetch.mock.calls[0]
    expect(new URL(String(authorityUrl)).searchParams.get("fields")).toBe(
      "id,sales_channel_id"
    )
    expect(
      new Headers(authorityInit?.headers).get("x-publishable-api-key")
    ).toBe(binding.publishableApiKey)
  })

  it.each(FOREIGN_MARKET_PAIRS)("rejects a foreign cart id on %s", async ([
    host,
  ], [, foreignBinding]) => {
    resolveBinding.mockImplementation(resolveByHost)
    const cartId = `cart_${foreignBinding.market}`
    const upstreamFetch = vi.fn().mockResolvedValue(
      Response.json({
        cart: {
          id: cartId,
          sales_channel_id: foreignBinding.salesChannelId,
        },
      })
    )
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway(`/store/carts/${cartId}`, { host })

    expect(response.status).toBe(404)
    expect(upstreamFetch).toHaveBeenCalledOnce()
  })

  it("prefers exact signed cart authority and forwards it without exposing the cookie", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ cart_id: "cart_cz" }))
      .mockResolvedValueOnce(Response.json({ cart: { id: "cart_cz" } }))
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway("/store/carts/cart_cz", {
      headers: {
        cookie:
          "other=value; __Host-herbatika-cart-session=Signed.Cart.Session",
      },
    })

    expect(response.status).toBe(200)
    expect(upstreamFetch).toHaveBeenCalledTimes(2)
    const [authorityUrl, authorityInit] = upstreamFetch.mock.calls[0]
    expect(new URL(String(authorityUrl)).pathname).toBe(
      "/store/cart-session/resolve"
    )
    expect(JSON.parse(String(authorityInit?.body))).toEqual({
      cart_id: "cart_cz",
    })
    const authorityHeaders = new Headers(authorityInit?.headers)
    expect(authorityHeaders.get("x-cart-session")).toBe("Signed.Cart.Session")
    expect(authorityHeaders.has("cookie")).toBe(false)
    const requestHeaders = new Headers(upstreamFetch.mock.calls[1][1]?.headers)
    expect(requestHeaders.get("x-cart-session")).toBe("Signed.Cart.Session")
    expect(requestHeaders.has("cookie")).toBe(false)
  })

  it("rejects a substituted cart identity from the authority response", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi.fn().mockResolvedValue(
      Response.json({
        cart: { id: "cart_other", sales_channel_id: CZ_BINDING.salesChannelId },
      })
    )
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway("/store/carts/cart_cz")

    expect(response.status).toBe(404)
    expect(upstreamFetch).toHaveBeenCalledOnce()
  })

  it.each(
    MARKET_CASES
  )("binds payment-collection creation to the exact signed cart on %s", async (host, binding) => {
    resolveBinding.mockImplementation(resolveByHost)
    const cartId = `cart_${binding.market}`
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ cart_id: cartId }))
      .mockResolvedValueOnce(
        Response.json({
          cart: {
            customer_id: null,
            id: cartId,
            region_id: binding.regionId,
            sales_channel_id: binding.salesChannelId,
          },
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          payment_collection: { id: `paycol_${binding.market}` },
        })
      )
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway("/store/payment-collections", {
      body: JSON.stringify({ cart_id: cartId }),
      headers: {
        "content-type": "application/json",
        cookie: `__Host-herbatika-cart-session=Signed.${binding.market}.Cart`,
      },
      host,
      method: "POST",
    })

    expect(response.status).toBe(200)
    expect(upstreamFetch).toHaveBeenCalledTimes(3)
    expect(new URL(String(upstreamFetch.mock.calls[0][0])).pathname).toBe(
      "/store/cart-session/resolve"
    )
    const cartAuthorityUrl = new URL(String(upstreamFetch.mock.calls[1][0]))
    expect(cartAuthorityUrl.pathname).toBe(`/store/carts/${cartId}`)
    expect(cartAuthorityUrl.searchParams.get("fields")).toBe(
      "id,customer_id,region_id,sales_channel_id,payment_collection.id,customer.id,customer.has_account"
    )
    expect(
      new Headers(upstreamFetch.mock.calls[1][1]?.headers).get(
        "x-publishable-api-key"
      )
    ).toBe(binding.publishableApiKey)
    expect(new URL(String(upstreamFetch.mock.calls[2][0])).pathname).toBe(
      "/store/payment-collections"
    )
  })

  it.each(
    FOREIGN_MARKET_PAIRS
  )("rejects a checkout cart bound to a foreign market on %s", async ([
    host,
    binding,
  ], [, foreignBinding]) => {
    resolveBinding.mockImplementation(resolveByHost)
    const cartId = `cart_${foreignBinding.market}`
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ cart_id: cartId }))
      .mockResolvedValueOnce(
        Response.json({
          cart: {
            customer_id: null,
            id: cartId,
            region_id: foreignBinding.regionId,
            sales_channel_id: foreignBinding.salesChannelId,
          },
        })
      )
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway("/store/payment-collections", {
      body: JSON.stringify({ cart_id: cartId }),
      headers: {
        "content-type": "application/json",
        cookie: "__Host-herbatika-cart-session=Signed.Cart.Session",
      },
      host,
      method: "POST",
    })

    expect(response.status).toBe(404)
    expect(upstreamFetch).toHaveBeenCalledTimes(2)
    expect(
      new Headers(upstreamFetch.mock.calls[1][1]?.headers).get(
        "x-publishable-api-key"
      )
    ).toBe(binding.publishableApiKey)
  })

  it.each(
    MARKET_CASES
  )("binds payment sessions to their cart, collection, provider, and market on %s", async (host, binding) => {
    resolveBinding.mockImplementation(resolveByHost)
    const cartId = `cart_${binding.market}`
    const collectionId = `paycol_${binding.market}`
    const providerId = `pp_${binding.market}`
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ cart_id: cartId }))
      .mockResolvedValueOnce(
        Response.json({
          cart: {
            customer_id: null,
            id: cartId,
            payment_collection: { id: collectionId },
            region_id: binding.regionId,
            sales_channel_id: binding.salesChannelId,
          },
        })
      )
      .mockResolvedValueOnce(
        Response.json({ payment_providers: [{ id: providerId }] })
      )
      .mockResolvedValueOnce(
        Response.json({ payment_collection: { id: collectionId } })
      )
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway(
      `/store/payment-collections/${collectionId}/payment-sessions`,
      {
        body: JSON.stringify({
          data: {
            cart_id: cartId,
            metadata: { cart_id: cartId, provider_id: providerId },
          },
          provider_id: providerId,
        }),
        headers: {
          "content-type": "application/json",
          cookie: `__Host-herbatika-cart-session=Signed.${binding.market}.Cart`,
        },
        host,
        method: "POST",
      }
    )

    expect(response.status).toBe(200)
    expect(upstreamFetch).toHaveBeenCalledTimes(4)
    const providerAuthorityUrl = new URL(String(upstreamFetch.mock.calls[2][0]))
    expect(providerAuthorityUrl.pathname).toBe("/store/payment-providers")
    expect(providerAuthorityUrl.searchParams.get("region_id")).toBe(
      binding.regionId
    )
    expect(new URL(String(upstreamFetch.mock.calls[3][0])).pathname).toBe(
      `/store/payment-collections/${collectionId}/payment-sessions`
    )
  })

  it.each(
    MARKET_CASES
  )("binds calculated shipping options to the exact signed cart on %s", async (host, binding) => {
    resolveBinding.mockImplementation(resolveByHost)
    const cartId = `cart_${binding.market}`
    const optionId = `so_${binding.market}`
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ cart_id: cartId }))
      .mockResolvedValueOnce(
        Response.json({
          cart: {
            customer_id: null,
            id: cartId,
            region_id: binding.regionId,
            sales_channel_id: binding.salesChannelId,
          },
        })
      )
      .mockResolvedValueOnce(
        Response.json({ shipping_options: [{ id: optionId }] })
      )
      .mockResolvedValueOnce(
        Response.json({ shipping_option: { id: optionId } })
      )
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway(
      `/store/shipping-options/${optionId}/calculate`,
      {
        body: JSON.stringify({ cart_id: cartId, data: {} }),
        headers: {
          "content-type": "application/json",
          cookie: `__Host-herbatika-cart-session=Signed.${binding.market}.Cart`,
        },
        host,
        method: "POST",
      }
    )

    expect(response.status).toBe(200)
    expect(upstreamFetch).toHaveBeenCalledTimes(4)
    const shippingAuthorityUrl = new URL(String(upstreamFetch.mock.calls[2][0]))
    expect(shippingAuthorityUrl.pathname).toBe("/store/shipping-options")
    expect(shippingAuthorityUrl.searchParams.get("cart_id")).toBe(cartId)
    expect(new URL(String(upstreamFetch.mock.calls[3][0])).pathname).toBe(
      `/store/shipping-options/${optionId}/calculate`
    )
  })

  it("rejects conflicting checkout resource ids before proxying", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi.fn()
    vi.stubGlobal("fetch", upstreamFetch)

    const conflictingCart = await callGateway("/store/payment-collections", {
      body: JSON.stringify({
        cart_id: "cart_cz",
        metadata: { cart_id: "cart_sk" },
      }),
      headers: {
        "content-type": "application/json",
        cookie: "__Host-herbatika-cart-session=Signed.Cart.Session",
      },
      method: "POST",
    })
    const queryOverride = await callGateway(
      "/store/payment-collections?cart_id=cart_cz",
      {
        body: JSON.stringify({ cart_id: "cart_cz" }),
        headers: {
          "content-type": "application/json",
          cookie: "__Host-herbatika-cart-session=Signed.Cart.Session",
        },
        method: "POST",
      }
    )

    expect(conflictingCart.status).toBe(404)
    expect(queryOverride.status).toBe(400)
    expect(upstreamFetch).not.toHaveBeenCalled()
  })

  it("rejects a payment collection not attached to the authorized cart", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ cart_id: "cart_cz" }))
      .mockResolvedValueOnce(
        Response.json({
          cart: {
            customer_id: null,
            id: "cart_cz",
            payment_collection: { id: "paycol_other" },
            region_id: CZ_BINDING.regionId,
            sales_channel_id: CZ_BINDING.salesChannelId,
          },
        })
      )
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway(
      "/store/payment-collections/paycol_cz/payment-sessions",
      {
        body: JSON.stringify({
          data: { cart_id: "cart_cz" },
          provider_id: "pp_cz",
        }),
        headers: {
          "content-type": "application/json",
          cookie: "__Host-herbatika-cart-session=Signed.Cart.Session",
        },
        method: "POST",
      }
    )

    expect(response.status).toBe(404)
    expect(upstreamFetch).toHaveBeenCalledTimes(2)
  })

  it("rejects a shipping option unavailable for the authorized cart", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ cart_id: "cart_cz" }))
      .mockResolvedValueOnce(
        Response.json({
          cart: {
            customer_id: null,
            id: "cart_cz",
            region_id: CZ_BINDING.regionId,
            sales_channel_id: CZ_BINDING.salesChannelId,
          },
        })
      )
      .mockResolvedValueOnce(
        Response.json({ shipping_options: [{ id: "so_other" }] })
      )
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway(
      "/store/shipping-options/so_cz/calculate",
      {
        body: JSON.stringify({ cart_id: "cart_cz", data: {} }),
        headers: {
          "content-type": "application/json",
          cookie: "__Host-herbatika-cart-session=Signed.Cart.Session",
        },
        method: "POST",
      }
    )

    expect(response.status).toBe(404)
    expect(upstreamFetch).toHaveBeenCalledTimes(3)
  })

  it("requires the authenticated owner for a registered customer cart", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ cart_id: "cart_cz" }))
      .mockResolvedValueOnce(
        Response.json({
          cart: {
            customer: { has_account: true, id: "cus_owner" },
            customer_id: "cus_owner",
            id: "cart_cz",
            region_id: CZ_BINDING.regionId,
            sales_channel_id: CZ_BINDING.salesChannelId,
          },
        })
      )
      .mockResolvedValueOnce(Response.json({ customer: { id: "cus_other" } }))
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway("/store/payment-collections", {
      body: JSON.stringify({ cart_id: "cart_cz" }),
      headers: {
        "content-type": "application/json",
        cookie:
          "__Host-herbatika-cart-session=Signed.Cart.Session; herbatika_auth_session_token=owner-session",
      },
      method: "POST",
    })

    expect(response.status).toBe(404)
    expect(upstreamFetch).toHaveBeenCalledTimes(3)
    expect(new URL(String(upstreamFetch.mock.calls[2][0])).pathname).toBe(
      "/store/customers/me"
    )
  })

  it.each(
    MARKET_CASES
  )("allows an anonymous guest cart Medusa attached a guest customer to on %s", async (host, binding) => {
    resolveBinding.mockImplementation(resolveByHost)
    const cartId = `cart_${binding.market}`
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ cart_id: cartId }))
      .mockResolvedValueOnce(
        Response.json({
          cart: {
            customer: { has_account: false, id: "cus_guest" },
            customer_id: "cus_guest",
            id: cartId,
            region_id: binding.regionId,
            sales_channel_id: binding.salesChannelId,
          },
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          payment_collection: { id: `paycol_${binding.market}` },
        })
      )
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway("/store/payment-collections", {
      body: JSON.stringify({ cart_id: cartId }),
      headers: {
        "content-type": "application/json",
        cookie: `__Host-herbatika-cart-session=Signed.${binding.market}.Cart`,
      },
      host,
      method: "POST",
    })

    expect(response.status).toBe(200)
    expect(upstreamFetch).toHaveBeenCalledTimes(3)
    // A guest cart must never trigger an authenticated-customer lookup.
    for (const call of upstreamFetch.mock.calls) {
      expect(new URL(String(call[0])).pathname).not.toBe("/store/customers/me")
    }
    expect(new URL(String(upstreamFetch.mock.calls[2][0])).pathname).toBe(
      "/store/payment-collections"
    )
  })

  it.each([
    ["the customer relation is missing", undefined],
    ["the account flag is absent", { id: "cus_owner" }],
    [
      "the account flag is not a boolean",
      { has_account: "false", id: "cus_owner" },
    ],
    [
      "the expanded customer is a different customer",
      { has_account: false, id: "cus_someone_else" },
    ],
  ])("fails closed for an unauthenticated caller when %s", async (_label, customer) => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ cart_id: "cart_cz" }))
      .mockResolvedValueOnce(
        Response.json({
          cart: {
            customer,
            customer_id: "cus_owner",
            id: "cart_cz",
            region_id: CZ_BINDING.regionId,
            sales_channel_id: CZ_BINDING.salesChannelId,
          },
        })
      )
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway("/store/payment-collections", {
      body: JSON.stringify({ cart_id: "cart_cz" }),
      headers: {
        "content-type": "application/json",
        cookie: "__Host-herbatika-cart-session=Signed.Cart.Session",
      },
      method: "POST",
    })

    // No authorization header, so the owner check rejects before any lookup.
    expect(response.status).toBe(404)
    expect(upstreamFetch).toHaveBeenCalledTimes(2)
  })

  it.each(
    MARKET_CASES
  )("requires trusted auth and exact market authority for order ids on %s", async (host, binding) => {
    resolveBinding.mockImplementation(resolveByHost)
    const orderId = `order_${binding.market}`
    const customerId = `cus_${binding.market}`
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ customer: { id: customerId } }))
      .mockResolvedValueOnce(
        Response.json({
          order: {
            customer_id: customerId,
            id: orderId,
            sales_channel_id: binding.salesChannelId,
          },
        })
      )
      .mockResolvedValueOnce(Response.json({ order: { id: orderId } }))
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway(`/store/orders/${orderId}`, {
      headers: {
        cookie: `herbatika_auth_session_token=session-token-${binding.market}`,
      },
      host,
    })

    expect(response.status).toBe(200)
    expect(upstreamFetch).toHaveBeenCalledTimes(3)
    expect(new URL(String(upstreamFetch.mock.calls[0][0])).pathname).toBe(
      "/store/customers/me"
    )
    const preflightHeaders = new Headers(
      upstreamFetch.mock.calls[1][1]?.headers
    )
    expect(preflightHeaders.get("authorization")).toBe(
      `Bearer session-token-${binding.market}`
    )
    expect(preflightHeaders.get("x-publishable-api-key")).toBe(
      binding.publishableApiKey
    )
    expect(
      new URL(String(upstreamFetch.mock.calls[1][0])).searchParams.get("fields")
    ).toBe("id,customer_id,sales_channel_id")
  })

  it.each(FOREIGN_MARKET_PAIRS)("rejects a foreign order id on %s", async ([
    host,
    binding,
  ], [, foreignBinding]) => {
    resolveBinding.mockImplementation(resolveByHost)
    const orderId = `order_${foreignBinding.market}`
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ customer: { id: `cus_${binding.market}` } })
      )
      .mockResolvedValueOnce(
        Response.json({
          order: {
            customer_id: `cus_${binding.market}`,
            id: orderId,
            sales_channel_id: foreignBinding.salesChannelId,
          },
        })
      )
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway(`/store/orders/${orderId}`, {
      headers: {
        cookie: `herbatika_auth_session_token=session-token-${binding.market}`,
      },
      host,
    })

    expect(response.status).toBe(404)
    expect(upstreamFetch).toHaveBeenCalledTimes(2)
  })

  it("rejects a syntactically valid forged auth cookie before reading an order", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ message: "unauthorized" }, { status: 401 })
      )
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway("/store/orders/order_cz", {
      headers: {
        cookie: "herbatika_auth_session_token=syntactically.valid.forgery",
      },
    })

    expect(response.status).toBe(404)
    expect(upstreamFetch).toHaveBeenCalledOnce()
    expect(new URL(String(upstreamFetch.mock.calls[0][0])).pathname).toBe(
      "/store/customers/me"
    )
  })

  it("rejects a same-market order owned by a different customer", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ customer: { id: "cus_owner" } }))
      .mockResolvedValueOnce(
        Response.json({
          order: {
            customer_id: "cus_foreign",
            id: "order_cz",
            sales_channel_id: CZ_BINDING.salesChannelId,
          },
        })
      )
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway("/store/orders/order_cz", {
      headers: { cookie: "herbatika_auth_session_token=owner-session" },
    })

    expect(response.status).toBe(404)
    expect(upstreamFetch).toHaveBeenCalledTimes(2)
  })

  it.each(
    MARKET_CASES
  )("keeps own-order list queries clean for backend market middleware on %s", async (host, binding) => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi
      .fn()
      .mockResolvedValue(Response.json({ orders: [] }))
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway("/store/orders?limit=20", {
      headers: {
        cookie: `herbatika_auth_session_token=session-token-${binding.market}`,
      },
      host,
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ orders: [] })
    const upstreamUrl = new URL(String(upstreamFetch.mock.calls[0][0]))
    expect(upstreamUrl.searchParams.get("limit")).toBe("20")
    expect(upstreamUrl.searchParams.has("sales_channel_id")).toBe(false)
  })

  it("does not expose order-by-id without a trusted auth session", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi.fn()
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway("/store/orders/order_cz")

    expect(response.status).toBe(404)
    expect(upstreamFetch).not.toHaveBeenCalled()
  })

  it("returns 421 and never reaches Medusa for an unknown Host", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi.fn()
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway("/store/products", {
      host: "unknown.example",
    })

    expect(response.status).toBe(421)
    expect(response.headers.get("cache-control")).toContain("no-store")
    expect(response.headers.get("x-request-id")).toMatch(REQUEST_ID_PATTERN)
    expect(upstreamFetch).not.toHaveBeenCalled()
  })

  it.each(
    GATEWAY_ERROR_CASES
  )("localizes rejected API paths for %s", async (host, message) => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi.fn()
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway("/store/unknown", { host })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ message })
    expect(upstreamFetch).not.toHaveBeenCalled()
  })

  it.each(
    GATEWAY_ERROR_CASES
  )("localizes unavailable resources for %s", async (host, _pathMessage, message) => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi.fn()
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway("/store/orders/order_case", { host })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ message })
    expect(upstreamFetch).not.toHaveBeenCalled()
  })

  it.each(
    GATEWAY_ERROR_CASES
  )("localizes upstream failures for %s without leaking internals", async (host, _pathMessage, _resourceMessage, message) => {
    resolveBinding.mockImplementation(resolveByHost)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("private backend credential"))
    )

    const response = await callGateway("/store/products", { host })
    const payload = await response.json()

    expect(response.status).toBe(502)
    expect(payload).toEqual({ message })
    expect(JSON.stringify(payload)).not.toContain("credential")
  })

  it("forwards and returns a safe request correlation id", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const requestId = "985d1c16-3582-4b51-8e5a-b365d74d6b07"
    const upstreamFetch = vi
      .fn()
      .mockResolvedValue(Response.json({ products: [] }))
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway("/store/products?region_id=reg_cz", {
      headers: { "x-request-id": requestId },
    })

    const upstreamHeaders = new Headers(upstreamFetch.mock.calls[0][1]?.headers)
    expect(upstreamHeaders.get("x-request-id")).toBe(requestId)
    expect(upstreamHeaders.get("x-herbatika-origin")).toBe("storefront-gateway")
    expect(response.headers.get("x-request-id")).toBe(requestId)
  })

  it("replaces an unsafe request id before forwarding it", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi
      .fn()
      .mockResolvedValue(Response.json({ products: [] }))
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway("/store/products?region_id=reg_cz", {
      headers: { "x-request-id": "private-user@example.test" },
    })

    const forwarded = new Headers(upstreamFetch.mock.calls[0][1]?.headers).get(
      "x-request-id"
    )
    expect(forwarded).toMatch(REQUEST_ID_PATTERN)
    expect(response.headers.get("x-request-id")).toBe(forwarded)
  })

  it("ignores attacker authority headers and derives bearer auth from the HttpOnly session cookie", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi
      .fn()
      .mockResolvedValue(Response.json({ customer: { id: "cus_1" } }))
    vi.stubGlobal("fetch", upstreamFetch)

    await callGateway("/store/customers/me", {
      headers: {
        authorization: "Bearer attacker-token",
        cookie: "other=value; herbatika_auth_session_token=session-token-cz",
        forwarded: "host=herbatica.sk",
        "x-forwarded-host": "herbatica.sk",
        "x-publishable-api-key": "pk_attacker",
      },
    })

    const upstreamHeaders = new Headers(upstreamFetch.mock.calls[0][1]?.headers)
    expect(upstreamHeaders.get("authorization")).toBe("Bearer session-token-cz")
    expect(upstreamHeaders.get("x-publishable-api-key")).toBe(
      "pk_server_cz_secret"
    )
    expect(upstreamHeaders.has("cookie")).toBe(false)
    expect(upstreamHeaders.has("forwarded")).toBe(false)
    expect(upstreamHeaders.has("x-forwarded-host")).toBe(false)
  })

  it("drops caller bearer auth when no trusted session cookie exists", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi.fn().mockResolvedValue(new Response(null))
    vi.stubGlobal("fetch", upstreamFetch)

    await callGateway("/store/customers/me", {
      headers: { authorization: "Bearer attacker-token" },
    })

    const upstreamHeaders = new Headers(upstreamFetch.mock.calls[0][1]?.headers)
    expect(upstreamHeaders.has("authorization")).toBe(false)
  })

  it("never leaks the selected publishable key through upstream headers or text bodies", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "key=pk_server_cz_secret" }), {
          headers: {
            "content-type": "application/json",
            "x-debug-value": "pk_server_cz_secret",
            "x-publishable-api-key": "pk_server_cz_secret",
          },
          status: 502,
        })
      )
    )

    const response = await callGateway("/store/products")
    const body = await response.text()

    expect(body).not.toContain("pk_server_cz_secret")
    expect(body).toContain("[REDACTED]")
    expect(response.headers.has("x-publishable-api-key")).toBe(false)
    expect(response.headers.get("x-debug-value")).toBe("[REDACTED]")
  })

  it.each([
    ["/auth/customer/emailpass", "POST", 404],
    ["/admin/users", "GET", 404],
    ["/store/unknown", "GET", 404],
    ["/store/products", "DELETE", 405],
    ["/store/carts/cart_1/complete", "GET", 405],
  ] as const)("rejects unknown or disallowed %s %s requests", async (path, method, expectedStatus) => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi.fn()
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway(path, { method })

    expect(response.status).toBe(expectedStatus)
    expect(upstreamFetch).not.toHaveBeenCalled()
  })

  it("rejects traversal and encoded separators before route matching", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi.fn()
    vi.stubGlobal("fetch", upstreamFetch)

    const traversal = await callGateway(
      "/store/products/prod%252fadmin/reviews",
      {
        params: ["store", "products", "prod%2fadmin", "reviews"],
      }
    )

    const dotSegment = await callGateway("/store/products", {
      params: ["store", "..", "products"],
    })

    expect(traversal.status).toBe(400)
    expect(dotSegment.status).toBe(400)
    expect(upstreamFetch).not.toHaveBeenCalled()
  })

  it.each([
    ["/store/claims", "POST"],
    ["/store/claims/order-access/request", "POST"],
    ["/store/claims/order-access/verify", "POST"],
    ["/store/carts/cart_1/transfer", "POST"],
    ["/store/gls/branches?cart_id=cart_1&limit=20&q=Praha", "GET"],
    ["/store/packeta/widget-config", "GET"],
    ["/store/ppl/widget-config", "GET"],
  ] as const)("allows the consumed browser route %s %s", async (path, method) => {
    resolveBinding.mockImplementation(resolveByHost)
    const routeFetch = vi.fn()
    if (path.startsWith("/store/carts/cart_1/")) {
      routeFetch
        .mockResolvedValueOnce(
          Response.json({
            cart: { id: "cart_1", sales_channel_id: CZ_BINDING.salesChannelId },
          })
        )
        .mockResolvedValueOnce(Response.json({ ok: true }))
    } else {
      routeFetch.mockResolvedValue(Response.json({ ok: true }))
    }
    vi.stubGlobal("fetch", routeFetch)

    const response = await callGateway(path, {
      body: method === "POST" ? JSON.stringify({ value: "safe" }) : undefined,
      headers:
        method === "POST" ? { "content-type": "application/json" } : undefined,
      method,
    })

    expect(response.status).toBe(200)
    expect(routeFetch).toHaveBeenCalledTimes(
      path.startsWith("/store/carts/cart_1/") ? 2 : 1
    )
  })

  it("requires exact same-origin evidence for unsafe requests", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi.fn()
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway("/store/carts", {
      body: JSON.stringify({ region_id: "reg_cz" }),
      headers: {
        "content-type": "application/json",
        origin: "https://attacker.example",
      },
      method: "POST",
    })

    expect(response.status).toBe(403)
    expect(upstreamFetch).not.toHaveBeenCalled()
  })

  it.each([
    ["/store/products?region_id=reg_sk", undefined],
    ["/store/products?sales_channel_id=sc_cz", undefined],
    ["/store/products?filter.sales_channel_id=sc_cz", undefined],
    ["/store/products?filter%5Bsales_channel_id%5D=sc_cz", undefined],
    ["/store/orders?sales_channel_id=sc_sk", undefined],
    ["/store/catalog/products?country_code=sk", undefined],
    ["/store/products?locale=sk-SK", undefined],
    ["/store/products?limit=101", undefined],
    ["/store/carts", { region_id: "reg_sk" }],
    ["/store/carts", { locale: "sk-SK" }],
    ["/store/carts", { sales_channel_id: "sc_cz" }],
    ["/store/carts", { metadata: { sales_channel_id: "sc_cz" } }],
  ] as const)("rejects foreign or caller-controlled market scope for %s", async (path, body) => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi.fn()
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway(path, {
      body: body ? JSON.stringify(body) : undefined,
      headers: body ? { "content-type": "application/json" } : undefined,
      method: body ? "POST" : "GET",
    })

    expect(response.status).toBe(400)
    expect(upstreamFetch).not.toHaveBeenCalled()
  })

  it("allows the category-tree limit and rejects larger requests", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi
      .fn()
      .mockResolvedValue(Response.json({ product_categories: [] }))
    vi.stubGlobal("fetch", upstreamFetch)

    const allowed = await callGateway("/store/product-categories?limit=500")
    const rejected = await callGateway("/store/product-categories?limit=501")

    expect(allowed.status).toBe(200)
    expect(rejected.status).toBe(400)
    expect(upstreamFetch).toHaveBeenCalledOnce()
  })

  it("preserves query, body, content type, status, and safe response headers", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamHeaders = new Headers({
      "content-type": "application/json; charset=utf-8",
      "set-cookie": "medusa_session=abc; Path=/; HttpOnly",
      "x-upstream-result": "created",
    })
    const upstreamFetch = vi.fn().mockResolvedValue(
      new Response('{"cart":{"id":"cart_1"}}', {
        headers: upstreamHeaders,
        status: 201,
        statusText: "Created",
      })
    )
    vi.stubGlobal("fetch", upstreamFetch)
    const requestBody = JSON.stringify({ region_id: "reg_cz" })

    const response = await callGateway("/store/carts?fields=id%2Cregion_id", {
      body: requestBody,
      headers: { "content-type": "application/json" },
      method: "POST",
    })

    const [upstreamUrl, init] = upstreamFetch.mock.calls[0]
    expect(new URL(String(upstreamUrl)).search).toBe("?fields=id%2Cregion_id")
    expect(new TextDecoder().decode(init?.body as ArrayBuffer)).toBe(
      requestBody
    )
    expect(new Headers(init?.headers).get("content-type")).toBe(
      "application/json"
    )
    expect(init).toMatchObject({
      cache: "no-store",
      credentials: "omit",
      method: "POST",
      redirect: "manual",
    })
    expect(response.status).toBe(201)
    expect(response.statusText).toBe("Created")
    expect(response.headers.get("content-type")).toBe(
      "application/json; charset=utf-8"
    )
    expect(response.headers.get("x-upstream-result")).toBe("created")
    expect(response.headers.has("set-cookie")).toBe(false)
    expect(response.headers.get("cache-control")).toContain("no-store")
    await expect(response.text()).resolves.toBe('{"cart":{"id":"cart_1"}}')
  })

  it("rejects upstream redirects instead of exposing the Medusa origin", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.redirect("http://medusa.internal:9000/admin", 302)
        )
    )

    const response = await callGateway("/store/products")

    expect(response.status).toBe(502)
    expect(response.headers.has("location")).toBe(false)
  })

  it("rejects oversized upstream responses before buffering them", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamResponse = new Response("small mocked body", {
      headers: {
        "content-length": String(10 * 1024 * 1024 + 1),
        "content-type": "text/plain",
      },
    })
    const upstreamBody = upstreamResponse.body
    if (!upstreamBody) {
      throw new Error("Expected the mocked response to have a body")
    }
    const cancelSpy = vi.spyOn(upstreamBody, "cancel")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstreamResponse))

    const response = await callGateway("/store/products")

    expect(response.status).toBe(502)
    expect(cancelSpy).toHaveBeenCalledOnce()
    await expect(response.json()).resolves.toEqual({
      message: "Odpověď API obchodu je příliš velká.",
    })
  })

  it("returns a generic gateway error without leaking secrets from fetch failures", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(new Error("pk_server_cz_secret upstream failure"))
    )

    const response = await callGateway("/store/products")
    const body = await response.text()

    expect(response.status).toBe(502)
    expect(body).not.toContain("pk_server_cz_secret")
  })
})
