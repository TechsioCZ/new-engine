import { afterEach, describe, expect, it } from "vitest"
import { normalizeRequestHost, resolveMarketFromHost } from "./market"

const originalAllowedMarkets = process.env.ALLOWED_MARKETS
const originalAllowedCzHosts = process.env.HERBATICA_ALLOWED_HOSTS_CZ
const originalAllowedSkHosts = process.env.HERBATICA_ALLOWED_HOSTS_SK

afterEach(() => {
  if (originalAllowedMarkets === undefined) {
    Reflect.deleteProperty(process.env, "ALLOWED_MARKETS")
  } else {
    process.env.ALLOWED_MARKETS = originalAllowedMarkets
  }
  if (originalAllowedCzHosts === undefined) {
    Reflect.deleteProperty(process.env, "HERBATICA_ALLOWED_HOSTS_CZ")
  } else {
    process.env.HERBATICA_ALLOWED_HOSTS_CZ = originalAllowedCzHosts
  }
  if (originalAllowedSkHosts === undefined) {
    Reflect.deleteProperty(process.env, "HERBATICA_ALLOWED_HOSTS_SK")
  } else {
    process.env.HERBATICA_ALLOWED_HOSTS_SK = originalAllowedSkHosts
  }
})

describe("SEO request market resolution", () => {
  it.each([
    ["herbatica.sk", "sk"],
    ["HERBATICA.CZ:3000", "cz"],
    ["herbatica.hu.", "hu"],
    ["herbatica.ro:443", "ro"],
  ] as const)("resolves validated Host %s", (host, market) => {
    expect(resolveMarketFromHost(host)).toBe(market)
  })

  it("honors deployment market and explicit host allowlists", () => {
    process.env.ALLOWED_MARKETS = "cz"
    process.env.HERBATICA_ALLOWED_HOSTS_CZ = "preview.example.test"
    expect(resolveMarketFromHost("preview.example.test:3000")).toBe("cz")
    expect(resolveMarketFromHost("herbatica.sk")).toBeNull()
  })

  it("rejects a host configured for multiple markets", () => {
    process.env.HERBATICA_ALLOWED_HOSTS_SK = "preview.example.test"
    process.env.HERBATICA_ALLOWED_HOSTS_CZ = "preview.example.test"
    expect(resolveMarketFromHost("preview.example.test")).toBeNull()
  })

  it.each([
    null,
    "",
    "unknown.example",
    "herbatica.sk, attacker.example",
    "https://herbatica.sk",
    "user@herbatica.sk",
    "herbatica.sk?attacker.example",
    "herbatica.sk#attacker.example",
    "herbatica.sk:",
    "herbatica.sk:65536",
  ])("rejects absent, unknown, or ambiguous Host %s", (host) => {
    expect(resolveMarketFromHost(host)).toBeNull()
  })

  it("normalizes only a single hostname and optional port", () => {
    expect(normalizeRequestHost(" HERBATICA.SK:3000 ")).toBe("herbatica.sk")
    expect(normalizeRequestHost("herbatica.sk/path")).toBeNull()
  })
})
