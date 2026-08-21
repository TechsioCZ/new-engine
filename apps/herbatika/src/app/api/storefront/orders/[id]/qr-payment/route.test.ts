import { afterEach, describe, expect, it, vi } from "vitest"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { ORDER_PAYMENT_QR_FIELDS } from "@/lib/storefront/order-payment-qr-response"

vi.mock("server-only", () => ({}))

const CZ_BINDING: MarketRuntimeBinding = {
  acceptedHosts: ["herbatica.cz"],
  canonicalOrigin: "https://herbatica.cz",
  countryCode: "CZ",
  locale: "cs-CZ",
  market: "cz",
  publishableApiKey: "pk_server_cz",
  publishableApiKeyId: "pkid_cz",
  regionId: "reg_cz",
  salesChannelId: "sc_cz",
}

const { resolveBinding } = vi.hoisted(() => ({
  resolveBinding: vi.fn(),
}))

vi.mock("@/lib/market/market-runtime.server", () => ({
  resolveConfiguredMarketRuntimeBindingByHost: resolveBinding,
}))

import { AUTH_SESSION_COOKIE_NAME } from "@/app/api/storefront-auth/_lib"
import { POST } from "./route"

const request = (
  body: unknown,
  options: Readonly<{ cookie?: string; host?: string }> = {}
) =>
  new Request(
    `https://${options.host ?? "herbatica.cz"}/api/storefront/orders/order_Case/qr-payment`,
    {
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        host: options.host ?? "herbatica.cz",
        ...(options.cookie ? { cookie: options.cookie } : {}),
      },
      method: "POST",
    }
  )

const callQr = (
  body: unknown,
  options?: Readonly<{ cookie?: string; host?: string; id?: string }>
) =>
  POST(request(body, options), {
    params: Promise.resolve({ id: options?.id ?? "order_Case" }),
  })

const authorizedOrderResponse = (overrides: Record<string, unknown> = {}) =>
  Response.json({
    order: {
      currency_code: "CZK",
      id: "order_Case",
      payment_collections: [
        {
          payments: [
            {
              data: {
                payment_qr_spayd:
                  "SPD*1.0*ACC:CZ6508000000192000145399*AM:123.45*CC:CZK*X-VS:42",
              },
              provider_id: "pp_qr_manual_default",
            },
          ],
        },
      ],
      region_id: "reg_cz",
      sales_channel_id: "sc_cz",
      total: 12_345,
      ...overrides,
    },
  })

const readFailureProjection = async (response: Response) => ({
  body: await response.json(),
  cacheControl: response.headers.get("cache-control"),
  pragma: response.headers.get("pragma"),
  status: response.status,
})

const GENERIC_FAILURE_PROJECTION = {
  body: { message: "Order payment details unavailable." },
  cacheControl: "private, no-store, max-age=0",
  pragma: "no-cache",
  status: 404,
} as const

describe("order QR payment bridge", () => {
  afterEach(() => {
    resolveBinding.mockReset()
    vi.unstubAllGlobals()
  })

  it("resolves exact guest ownership before returning Host-bound QR data", async () => {
    resolveBinding.mockReturnValue(CZ_BINDING)
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ order: { id: "order_Case" } }))
      .mockResolvedValueOnce(authorizedOrderResponse())
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callQr({ order_token: "Guest.Token-Exact" })

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0"
    )
    const payload = await response.json()
    expect(payload).toMatchObject({
      qr_payment: {
        currency_code: "CZK",
        order_id: "order_Case",
        provider_id: "pp_qr_manual_default",
      },
      status: "ready",
    })

    expect(upstreamFetch).toHaveBeenCalledTimes(2)
    const [accessUrl, accessInit] = upstreamFetch.mock.calls[0] as [
      string,
      RequestInit,
    ]
    const accessHeaders = new Headers(accessInit.headers)
    expect(accessUrl).toBe(
      "http://localhost:9000/store/order-confirmations/resolve"
    )
    expect(accessHeaders.get("x-publishable-api-key")).toBe("pk_server_cz")
    expect(accessHeaders.has("authorization")).toBe(false)
    expect(JSON.parse(String(accessInit.body))).toEqual({
      order_token: "Guest.Token-Exact",
      public_order_id: "order_Case",
    })

    const [orderUrl, orderInit] = upstreamFetch.mock.calls[1] as [
      URL,
      RequestInit,
    ]
    expect(orderUrl.searchParams.get("fields")?.split(",")).toEqual(
      ORDER_PAYMENT_QR_FIELDS
    )
    expect(orderUrl.toString()).not.toContain("Guest.Token-Exact")
    expect(new Headers(orderInit.headers).get("x-publishable-api-key")).toBe(
      "pk_server_cz"
    )
  })

  it("uses only the HttpOnly customer session for registered ownership", async () => {
    resolveBinding.mockReturnValue(CZ_BINDING)
    const upstreamFetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ order: { id: "order_Case" } }))
      .mockResolvedValueOnce(authorizedOrderResponse())
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await callQr(
      {},
      {
        cookie: `${AUTH_SESSION_COOKIE_NAME}=Customer.JWT`,
      }
    )

    expect(response.status).toBe(200)
    const [, accessInit] = upstreamFetch.mock.calls[0] as [string, RequestInit]
    expect(new Headers(accessInit.headers).get("authorization")).toBe(
      "Bearer Customer.JWT"
    )
    expect(JSON.parse(String(accessInit.body))).toEqual({
      public_order_id: "order_Case",
    })
    expect(await response.text()).not.toContain("Customer.JWT")
  })

  it.each([
    ["missing authority", {}, { host: "herbatica.cz" }],
    [
      "unknown Host",
      { order_token: "Guest.Token-Exact" },
      { host: "evil.test" },
    ],
    [
      "ambiguous body",
      { extra: "value", order_token: "Guest.Token-Exact" },
      {},
    ],
    ["non-exact token", { order_token: " Guest.Token-Exact" }, {}],
  ] as const)("fails closed before Medusa for %s", async (_name, body, options) => {
    resolveBinding.mockImplementation((host) =>
      host === "herbatica.cz" ? CZ_BINDING : null
    )
    const upstreamFetch = vi.fn()
    vi.stubGlobal("fetch", upstreamFetch)

    expect(await readFailureProjection(await callQr(body, options))).toEqual(
      GENERIC_FAILURE_PROJECTION
    )
    expect(upstreamFetch).not.toHaveBeenCalled()
  })

  it.each([
    ["ownership not found", [new Response(null, { status: 404 })]],
    ["ownership outage", [new Response(null, { status: 503 })]],
    [
      "case-mismatched ownership",
      [Response.json({ order: { id: "ORDER_case" } })],
    ],
    [
      "order lookup not found",
      [
        Response.json({ order: { id: "order_Case" } }),
        new Response(null, { status: 404 }),
      ],
    ],
    [
      "foreign sales channel",
      [
        Response.json({ order: { id: "order_Case" } }),
        authorizedOrderResponse({ sales_channel_id: "sc_sk" }),
      ],
    ],
    [
      "foreign region",
      [
        Response.json({ order: { id: "order_Case" } }),
        authorizedOrderResponse({ region_id: "reg_sk" }),
      ],
    ],
  ] as const)("uses the same private failure for %s", async (_name, responses) => {
    resolveBinding.mockReturnValue(CZ_BINDING)
    const upstreamFetch = vi.fn()
    for (const response of responses) {
      upstreamFetch.mockResolvedValueOnce(response)
    }
    vi.stubGlobal("fetch", upstreamFetch)

    expect(
      await readFailureProjection(
        await callQr({ order_token: "Guest.Token-Exact" })
      )
    ).toEqual(GENERIC_FAILURE_PROJECTION)
  })
})
