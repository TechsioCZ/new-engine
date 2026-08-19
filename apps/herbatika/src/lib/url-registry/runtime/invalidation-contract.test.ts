import { describe, expect, it } from "vitest"
import { MAX_URL_REGISTRY_INVALIDATION_TAGS } from "../invalidation-tags"
import {
  parseUrlRegistryInvalidationDeliveryJson,
  parseUrlRegistryInvalidationDeliveryV1,
} from "./invalidation-contract"

const delivery = () => ({
  outboxEventId: "12345",
  schemaVersion: 1,
  tags: ["feed:sk", "market:sk", "route-family:sk:product", "sitemap:sk"],
})

describe("URL registry invalidation delivery contract", () => {
  it("accepts the exact versioned and canonical delivery", () => {
    expect(parseUrlRegistryInvalidationDeliveryV1(delivery())).toEqual(
      delivery()
    )
    expect(
      parseUrlRegistryInvalidationDeliveryJson(JSON.stringify(delivery()))
    ).toEqual(delivery())
  })

  it.each([
    null,
    [],
    { ...delivery(), extra: true },
    { ...delivery(), schemaVersion: 2 },
    { ...delivery(), outboxEventId: "event with spaces" },
    { ...delivery(), tags: [] },
    { ...delivery(), tags: ["market:sk", "market:sk"] },
    { ...delivery(), tags: ["sitemap:sk", "market:sk"] },
    { ...delivery(), tags: [" market:sk"] },
    { ...delivery(), tags: ["market:sk "] },
    { ...delivery(), tags: ["market:sk", 42] },
  ])("rejects a non-canonical boundary %#", (value) => {
    expect(parseUrlRegistryInvalidationDeliveryV1(value)).toBeNull()
  })

  it("enforces the Next cache tag count bound", () => {
    expect(
      parseUrlRegistryInvalidationDeliveryV1({
        ...delivery(),
        tags: Array.from(
          { length: MAX_URL_REGISTRY_INVALIDATION_TAGS + 1 },
          (_, index) => `route:sk:product:${String(index).padStart(3, "0")}`
        ),
      })
    ).toBeNull()
  })

  it("rejects malformed JSON without throwing", () => {
    expect(parseUrlRegistryInvalidationDeliveryJson("{")).toBeNull()
  })
})
