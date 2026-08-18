import { describe, expect, it } from "vitest"
import {
  DEFAULT_URL_REGISTRY_DISPATCH_SCHEDULE,
  parseUrlRegistryDispatcherConfig,
  readUrlRegistryDispatchSchedule,
} from "../dispatcher-config"

const TOKEN = "urlr-lifecycle-token-with-at-least-32-characters"

describe("parseUrlRegistryDispatcherConfig", () => {
  it.each([
    undefined,
    "",
    "0",
    "true",
    " 1 ",
  ])("stays disabled unless the shared gate is exactly 1: %s", (enabled) => {
    expect(
      parseUrlRegistryDispatcherConfig({
        URL_REGISTRY_PRODUCT_LIFECYCLE_ENABLED: enabled,
      })
    ).toEqual({ enabled: false })
  })

  it("validates private dispatcher settings only after enablement", () => {
    expect(
      parseUrlRegistryDispatcherConfig({
        URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN: "http://herbatika:3001",
        URL_REGISTRY_PRODUCT_LIFECYCLE_ENABLED: "1",
        URL_REGISTRY_PRODUCT_LIFECYCLE_TOKEN: TOKEN,
      })
    ).toEqual({
      enabled: true,
      endpoint:
        "http://herbatika:3001/api/internal/url-registry/product-lifecycle",
      token: TOKEN,
    })
  })

  it.each([
    undefined,
    "herbatika:3001",
    "ftp://herbatika:3001",
    "http://user:pass@herbatika:3001",
    "http://herbatika:3001/private",
    "http://herbatika:3001/?key=value",
    "http://herbatika:3001/#fragment",
  ])("rejects an invalid internal origin: %s", (origin) => {
    expect(() =>
      parseUrlRegistryDispatcherConfig({
        URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN: origin,
        URL_REGISTRY_PRODUCT_LIFECYCLE_ENABLED: "1",
        URL_REGISTRY_PRODUCT_LIFECYCLE_TOKEN: TOKEN,
      })
    ).toThrow("URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN")
  })

  it.each([
    undefined,
    "",
    "short",
    ` ${TOKEN}`,
    `${TOKEN} `,
  ])("rejects a missing or malformed lifecycle token: %s", (token) => {
    expect(() =>
      parseUrlRegistryDispatcherConfig({
        URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN: "https://internal.test",
        URL_REGISTRY_PRODUCT_LIFECYCLE_ENABLED: "1",
        URL_REGISTRY_PRODUCT_LIFECYCLE_TOKEN: token,
      })
    ).toThrow("URL_REGISTRY_PRODUCT_LIFECYCLE_TOKEN")
  })
})

describe("readUrlRegistryDispatchSchedule", () => {
  it("defaults to every minute", () => {
    expect(readUrlRegistryDispatchSchedule({})).toBe(
      DEFAULT_URL_REGISTRY_DISPATCH_SCHEDULE
    )
  })

  it("accepts a bounded five-field cron schedule", () => {
    expect(
      readUrlRegistryDispatchSchedule({
        URL_REGISTRY_PRODUCT_LIFECYCLE_DISPATCH_SCHEDULE: "*/5 * * * *",
      })
    ).toBe("*/5 * * * *")
  })

  it.each([
    "",
    "* * * *",
    "* * * * * *",
    "* * * * *\nsecret",
  ])("rejects an invalid schedule: %s", (schedule) => {
    expect(() =>
      readUrlRegistryDispatchSchedule({
        URL_REGISTRY_PRODUCT_LIFECYCLE_DISPATCH_SCHEDULE: schedule,
      })
    ).toThrow("URL_REGISTRY_PRODUCT_LIFECYCLE_DISPATCH_SCHEDULE")
  })
})
