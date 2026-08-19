import { describe, expect, it } from "vitest"
import {
  resolveHostMarketContext,
  resolveMarketRequestHost,
} from "./market-context"

describe("resolveHostMarketContext", () => {
  it("resolves every canonical storefront host", () => {
    expect(resolveHostMarketContext({ host: "herbatica.sk" })?.code).toBe("sk")
    expect(
      resolveHostMarketContext({ host: "www.herbatica.cz:443" })?.code
    ).toBe("cz")
    expect(resolveHostMarketContext({ host: "herbatika.hu" })?.code).toBe("hu")
    expect(resolveHostMarketContext({ host: "herbatica.ro" })?.code).toBe("ro")
  })

  it("fails closed for unknown and multi-value hosts", () => {
    expect(resolveHostMarketContext({ host: "unknown.example" })).toBeNull()
    expect(
      resolveHostMarketContext({ host: "herbatica.sk, attacker.example" })
    ).toBeNull()
  })

  it("resolves only explicitly configured generated deployment hosts", () => {
    const generatedHost = "example-project-herbatika-deploy.example.test"

    expect(resolveHostMarketContext({ host: generatedHost })).toBeNull()
    expect(
      resolveHostMarketContext({
        host: generatedHost,
        hostAliases: {
          sk: "https://example-project-herbatika-deploy.example.test",
        },
      })?.code
    ).toBe("sk")
    expect(
      resolveHostMarketContext({
        host: generatedHost,
        hostAliases: { sk: generatedHost, cz: generatedHost },
      })
    ).toBeNull()
  })

  it("uses a configured deployment alias from a trusted proxy host only", () => {
    const generatedHost = "example-project-herbatika-deploy.example.test"
    const trustedHost = resolveMarketRequestHost({
      forwardedHost: generatedHost,
      host: "zn-herbatika:3000",
      trustProxyHost: true,
    })
    const untrustedHost = resolveMarketRequestHost({
      forwardedHost: generatedHost,
      host: "zn-herbatika:3000",
      trustProxyHost: false,
    })

    expect(
      resolveHostMarketContext({
        host: trustedHost,
        hostAliases: { sk: generatedHost },
      })?.code
    ).toBe("sk")
    expect(
      resolveHostMarketContext({
        host: untrustedHost,
        hostAliases: { sk: generatedHost },
      })
    ).toBeNull()
  })

  it("allows the Slovak fallback only for explicit development hosts", () => {
    expect(
      resolveHostMarketContext({
        allowDevelopmentFallback: true,
        host: "localhost:3001",
      })?.code
    ).toBe("sk")
    expect(
      resolveHostMarketContext({
        allowDevelopmentFallback: true,
        host: "unknown.example",
      })
    ).toBeNull()
    expect(
      resolveHostMarketContext({
        allowDevelopmentFallback: false,
        host: "localhost:3001",
      })
    ).toBeNull()
  })
})
