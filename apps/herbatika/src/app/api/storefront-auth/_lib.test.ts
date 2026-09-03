import { NextResponse } from "next/server"
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
  AUTH_SESSION_COOKIE_NAME,
  applyStorefrontAuthResponsePolicy,
  badRequest,
  buildErrorResponse,
  clearSessionTokenCookie,
  getPublishableHeaders,
  getSessionTokenFromCookieHeader,
  marketAuthorityError,
  requireStorefrontAuthContext,
  requireStorefrontMarketBinding,
  setSessionTokenCookie,
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

describe("storefront auth response policy", () => {
  it("marks auth responses private and varies them by Cookie", () => {
    const response = new NextResponse(null, {
      headers: { vary: "Accept-Encoding" },
      status: 204,
    })

    expect(applyStorefrontAuthResponsePolicy(response)).toBe(response)
    applyStorefrontAuthResponsePolicy(response)

    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("vary")).toBe("Accept-Encoding, Cookie")
  })

  it("applies the response policy to centralized auth errors", () => {
    for (const response of [
      badRequest("Bad request"),
      marketAuthorityError(),
    ]) {
      expect(response.headers.get("cache-control")).toBe("private, no-store")
      expect(response.headers.get("vary")).toBe("Cookie")
    }
  })
})

describe("storefront auth session cookie", () => {
  it("keeps an explicit non-production cookie for local HTTP tests", () => {
    const response = NextResponse.json({ ok: true })

    setSessionTokenCookie(response, "local-token")

    expect(AUTH_SESSION_COOKIE_NAME).toBe("herbatika_auth_session_token")
    expect(response.headers.get("set-cookie")).toContain(
      "herbatika_auth_session_token=local-token"
    )
    expect(response.headers.get("set-cookie")).not.toContain("Secure")
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("vary")).toBe("Cookie")
  })

  it("uses a Secure __Host- cookie in production without Domain scope", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.resetModules()

    try {
      const productionLib = await import("./_lib")
      const response = NextResponse.json({ ok: true })

      productionLib.setSessionTokenCookie(response, "production-token")

      const setCookie = response.headers.get("set-cookie")
      expect(productionLib.AUTH_SESSION_COOKIE_NAME).toBe(
        "__Host-herbatika_auth_session_token"
      )
      expect(setCookie).toContain(
        "__Host-herbatika_auth_session_token=production-token"
      )
      expect(setCookie).toContain("Path=/")
      expect(setCookie).toContain("Secure")
      expect(setCookie).toContain("HttpOnly")
      expect(setCookie).not.toContain("Domain=")
    } finally {
      vi.unstubAllEnvs()
      vi.resetModules()
    }
  })

  it("rejects duplicate session cookies even when their values agree", () => {
    expect(
      getSessionTokenFromCookieHeader(
        `${AUTH_SESSION_COOKIE_NAME}=one; ${AUTH_SESSION_COOKIE_NAME}=one`
      )
    ).toBeNull()
    expect(
      getSessionTokenFromCookieHeader(
        `${AUTH_SESSION_COOKIE_NAME}=; ${AUTH_SESSION_COOKIE_NAME}=two`
      )
    ).toBeNull()
  })

  it("round-trips one encoded session cookie and clears it safely", () => {
    expect(
      getSessionTokenFromCookieHeader(
        `another=value; ${AUTH_SESSION_COOKIE_NAME}=token%3Dvalue`
      )
    ).toBe("token=value")

    const response = NextResponse.json({ ok: true })
    clearSessionTokenCookie(response)
    expect(response.headers.get("set-cookie")).toContain(
      `${AUTH_SESSION_COOKIE_NAME}=;`
    )
    expect(response.headers.get("cache-control")).toBe("private, no-store")
  })
})
