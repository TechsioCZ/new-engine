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

const { resolveBinding } = vi.hoisted(() => ({
  resolveBinding: vi.fn(),
}))

vi.mock("@/lib/market/market-runtime.server", () => ({
  resolveConfiguredMarketRuntimeBindingByHost: resolveBinding,
}))

import { handleStorefrontMedusaRequest } from "./_proxy"

const resolveByHost = (host: string | null | undefined) => {
  if (host === "herbatica.cz") {
    return CZ_BINDING
  }
  if (host === "herbatica.sk") {
    return SK_BINDING
  }
  return null
}

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

  it("returns 421 and never reaches Medusa for an unknown Host", async () => {
    resolveBinding.mockImplementation(resolveByHost)
    const upstreamFetch = vi.fn()
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callGateway("/store/products", {
      host: "unknown.example",
    })

    expect(response.status).toBe(421)
    expect(response.headers.get("cache-control")).toContain("no-store")
    expect(upstreamFetch).not.toHaveBeenCalled()
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
    const routeFetch = vi.fn().mockResolvedValue(Response.json({ ok: true }))
    vi.stubGlobal("fetch", routeFetch)

    const response = await callGateway(path, {
      body: method === "POST" ? JSON.stringify({ value: "safe" }) : undefined,
      headers:
        method === "POST" ? { "content-type": "application/json" } : undefined,
      method,
    })

    expect(response.status).toBe(200)
    expect(routeFetch).toHaveBeenCalledOnce()
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
      message: "Storefront API response is too large.",
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
