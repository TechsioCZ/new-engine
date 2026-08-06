import { describe, expect, it } from "vitest"
import { SEGMENTS } from "../src/lib/url/segments"
import { RESERVED_SLUGS } from "../src/lib/url/slug"
import { MARKETS } from "../src/lib/url/types"

const ASCII_SEGMENT_PATTERN = /^[a-z0-9-]+$/
const SEGMENT_KEYS = Object.keys(SEGMENTS) as Array<keyof typeof SEGMENTS>
const SIBLING_NAMESPACES = [
  SEGMENT_KEYS.filter((key) => !key.includes(".")),
  SEGMENT_KEYS.filter((key) => key.startsWith("checkout.")),
  SEGMENT_KEYS.filter((key) => key.startsWith("account.")),
  SEGMENT_KEYS.filter((key) => key.startsWith("reviews.")),
]

describe("URL segment CI guardrail", () => {
  for (const market of MARKETS) {
    it(`${market} has valid, non-reserved segments`, () => {
      for (const key of SEGMENT_KEYS) {
        const segment = SEGMENTS[key][market]
        expect(segment, `${market}.${key} must be lowercase ASCII`).toMatch(
          ASCII_SEGMENT_PATTERN
        )
        expect(RESERVED_SLUGS, `${market}.${key} is reserved`).not.toContain(
          segment
        )
      }
    })

    it(`${market} has collision-free sibling namespaces`, () => {
      for (const keys of SIBLING_NAMESPACES) {
        const owners = new Map<string, string>()
        for (const key of keys) {
          const segment = SEGMENTS[key][market]
          expect(
            owners.get(segment),
            `${market}.${key} collides with ${owners.get(segment)}`
          ).toBeUndefined()
          owners.set(segment, key)
        }
      }
    })
  }
})
