import { describe, expect, it } from "vitest"
import { resolveClientMedusaGatewayBaseUrl } from "./client-medusa-gateway"

describe("resolveClientMedusaGatewayBaseUrl", () => {
  it("uses only the browser transport origin and a fixed same-origin path", () => {
    expect(
      resolveClientMedusaGatewayBaseUrl("https://herbatica.hu/some/path")
    ).toBe("https://herbatica.hu/api/storefront-medusa")
  })

  it("fails away from Medusa when evaluated by a server import", () => {
    expect(resolveClientMedusaGatewayBaseUrl()).toBe(
      "https://client-medusa-gateway.invalid/api/storefront-medusa"
    )
  })
})
