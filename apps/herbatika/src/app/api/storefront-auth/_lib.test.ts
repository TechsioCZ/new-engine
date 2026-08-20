import { describe, expect, it, vi } from "vitest"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"

const { binding, roBinding, resolveBinding } = vi.hoisted(() => {
  const marketBinding = {
    acceptedHosts: ["herbatica.cz"],
    canonicalOrigin: "https://herbatica.cz",
    countryCode: "CZ",
    locale: "cs-CZ",
    market: "cz",
    publishableApiKey: "pk_server_cz",
    publishableApiKeyId: "pkid_cz",
    regionId: "reg_cz",
    salesChannelId: "sc_cz",
  } as const satisfies MarketRuntimeBinding
  const romanianMarketBinding = {
    acceptedHosts: ["herbatica.ro"],
    canonicalOrigin: "https://herbatica.ro",
    countryCode: "RO",
    locale: "ro-RO",
    market: "ro",
    publishableApiKey: "pk_server_ro",
    publishableApiKeyId: "pkid_ro",
    regionId: "reg_ro",
    salesChannelId: "sc_ro",
  } as const satisfies MarketRuntimeBinding

  return {
    binding: marketBinding,
    roBinding: romanianMarketBinding,
    resolveBinding: vi.fn((host: string | null | undefined) => {
      if (host === "herbatica.cz") {
        return marketBinding
      }
      if (host === "herbatica.ro") {
        return romanianMarketBinding
      }
      return null
    }),
  }
})

vi.mock("@/lib/market/market-runtime.server", () => ({
  resolveConfiguredMarketRuntimeBindingByHost: resolveBinding,
}))

import {
  buildErrorResponse,
  getPublishableHeaders,
  requireStorefrontAuthContext,
  requireStorefrontMarketBinding,
} from "./_lib"

describe("storefront auth market authority", () => {
  it("selects the server binding from the exact Host and ignores caller headers", () => {
    const request = new Request(
      "https://internal/api/storefront-auth/session",
      {
        headers: {
          host: "herbatica.cz",
          "x-forwarded-host": "herbatica.sk",
          "x-publishable-api-key": "pk_attacker",
        },
      }
    )

    const selected = requireStorefrontMarketBinding(request)
    expect(selected).toBe(binding)
    expect(getPublishableHeaders(selected)).toEqual({
      "x-publishable-api-key": "pk_server_cz",
    })
    expect(resolveBinding).toHaveBeenCalledWith("herbatica.cz")
  })

  it("fails closed for an unknown host", () => {
    expect(() =>
      requireStorefrontMarketBinding(
        new Request("https://internal/api/storefront-auth/session", {
          headers: { host: "unknown.example" },
        })
      )
    ).toThrow("Request host does not belong to an enabled storefront market")
  })

  it("derives Romanian copy and RON only from the server-authorized host", async () => {
    const context = requireStorefrontAuthContext(
      new Request("https://internal/api/storefront-auth/login", {
        headers: {
          host: "herbatica.ro",
          "x-forwarded-host": "herbatica.sk",
        },
      })
    )

    expect(context.binding).toBe(roBinding)
    expect(context.currencyCode).toBe("RON")
    expect(context.messages.emailAndPasswordRequired).toBe(
      "Adresa de e-mail și parola sunt obligatorii."
    )

    const response = await buildErrorResponse(
      Response.json({ message: "Invalid email or password" }, { status: 401 }),
      context.messages
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      message: "Adresa de e-mail sau parola este incorectă.",
    })
  })

  it("cancels private upstream error bodies after localizing them", async () => {
    const cancel = vi.fn()
    const upstream = new Response(
      new ReadableStream({
        cancel,
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode('{"message":"internal error"}')
          )
        },
      }),
      {
        headers: { "content-type": "application/json" },
        status: 400,
      }
    )
    const { messages } = requireStorefrontAuthContext(
      new Request("https://internal/api/storefront-auth/login", {
        headers: { host: "herbatica.ro" },
      })
    )

    const response = await buildErrorResponse(upstream, messages)

    expect(cancel).toHaveBeenCalledOnce()
    await expect(response.json()).resolves.toEqual({
      message: "Datele cererii de autentificare nu sunt valide.",
    })
  })
})
