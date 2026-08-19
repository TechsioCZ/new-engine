import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { parseInvalidationDispatcherConfig } from "./invalidation-dispatcher-config.server"

const TOKEN = "urlr-invalidation-token-with-at-least-32-chars"

afterEach(() => vi.unstubAllEnvs())

describe("URL registry invalidation dispatcher config", () => {
  it("is off unless its explicit dispatch gate is enabled", () => {
    expect(parseInvalidationDispatcherConfig({ NODE_ENV: "test" })).toEqual({
      enabled: false,
    })
  })

  it("builds the exact authenticated endpoint", () => {
    expect(
      parseInvalidationDispatcherConfig({
        NODE_ENV: "test",
        URL_REGISTRY_ENABLED: "1",
        URL_REGISTRY_INVALIDATION_DISPATCH_ENABLED: "1",
        URL_REGISTRY_INVALIDATION_DISPATCH_ORIGIN: "https://herbatica.sk",
        URL_REGISTRY_INVALIDATION_ENABLED: "1",
        URL_REGISTRY_INVALIDATION_TOKEN: TOKEN,
      })
    ).toEqual({
      enabled: true,
      endpoint: "https://herbatica.sk/api/url-registry/invalidate",
      token: TOKEN,
    })
  })

  it.each([
    ["missing prerequisite gate", { URL_REGISTRY_ENABLED: "0" }],
    [
      "insecure remote origin",
      { URL_REGISTRY_INVALIDATION_DISPATCH_ORIGIN: "http://herbatica.sk" },
    ],
    [
      "origin path",
      {
        URL_REGISTRY_INVALIDATION_DISPATCH_ORIGIN: "https://herbatica.sk/path",
      },
    ],
    ["short token", { URL_REGISTRY_INVALIDATION_TOKEN: "short" }],
  ])("fails closed for %s", (_label, override) => {
    expect(() =>
      parseInvalidationDispatcherConfig({
        NODE_ENV: "test",
        URL_REGISTRY_ENABLED: "1",
        URL_REGISTRY_INVALIDATION_DISPATCH_ENABLED: "1",
        URL_REGISTRY_INVALIDATION_DISPATCH_ORIGIN: "https://herbatica.sk",
        URL_REGISTRY_INVALIDATION_ENABLED: "1",
        URL_REGISTRY_INVALIDATION_TOKEN: TOKEN,
        ...override,
      })
    ).toThrow()
  })
})
