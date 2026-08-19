import { describe, expect, it, vi } from "vitest"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"

const { binding, resolveBinding } = vi.hoisted(() => {
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

  return {
    binding: marketBinding,
    resolveBinding: vi.fn((host: string | null | undefined) =>
      host === "herbatica.cz" ? marketBinding : null
    ),
  }
})

vi.mock("@/lib/market/market-runtime.server", () => ({
  resolveConfiguredMarketRuntimeBindingByHost: resolveBinding,
}))

import { getPublishableHeaders, requireStorefrontMarketBinding } from "./_lib"

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
})
