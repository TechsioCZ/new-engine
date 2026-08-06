import { describe, expect, it } from "vitest"
import {
  getSegment,
  getSegmentLabel,
  resolveKindFromSegment,
  SEGMENTS,
} from "./segments"
import { RESERVED_SLUGS } from "./slug"
import { MARKETS } from "./types"

const ASCII_SEGMENT_PATTERN = /^[a-z0-9-]+$/

const TOP_LEVEL_KEYS = Object.keys(SEGMENTS).filter(
  (key) => !key.includes(".")
) as Array<keyof typeof SEGMENTS>

describe("localized segment registry", () => {
  it("has a collision-free ASCII top-level namespace in every market", () => {
    for (const market of MARKETS) {
      const values = TOP_LEVEL_KEYS.map((key) => SEGMENTS[key][market])
      expect(new Set(values).size).toBe(values.length)
      expect(
        Object.values(SEGMENTS).every((valuesByMarket) =>
          ASCII_SEGMENT_PATTERN.test(valuesByMarket[market])
        )
      ).toBe(true)
      expect(
        Object.values(SEGMENTS).some((valuesByMarket) =>
          RESERVED_SLUGS.includes(valuesByMarket[market] as never)
        )
      ).toBe(false)
    }
  })

  it("resolves all entity and flow first segments", () => {
    expect(resolveKindFromSegment("sk", "produkty")).toBe("product")
    expect(resolveKindFromSegment("hu", "kategoriak")).toBe("category")
    expect(resolveKindFromSegment("ro", "finalizare-comanda")).toBe("checkout")
    expect(resolveKindFromSegment("cz", "ucet")).toBe("account")
    expect(resolveKindFromSegment("sk", "unknown")).toBeUndefined()
  })

  it("keeps native display labels separate from ASCII URL values", () => {
    expect(getSegment("hu", "collections")).toBe("gyujtemenyek")
    expect(getSegmentLabel("hu", "collections")).toBe("Gyűjtemények")
    expect(getSegment("ro", "cart")).toBe("cos")
    expect(getSegmentLabel("ro", "cart")).toBe("Coș")
    expect(getSegmentLabel("sk", "search")).toBe("Vyhľadávanie")
  })
})
