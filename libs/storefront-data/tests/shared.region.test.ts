import { describe, expect, it } from "vitest"

import { applyRegion } from "../src/shared/region"

interface RegionAwareInput {
  q?: string
  region_id?: string
  country_code?: string
}

describe(applyRegion, () => {
  it("applies context region when input omits region fields", () => {
    const result = applyRegion(
      { q: "kretin" },
      {
        country_code: "sk",
        region_id: "reg_sk",
      }
    )

    expect(result).toStrictEqual({
      country_code: "sk",
      q: "kretin",
      region_id: "reg_sk",
    })
  })

  it("uses context region when input region fields are undefined", () => {
    const input: RegionAwareInput = { q: "kretin" }
    const result = applyRegion(input, {
      country_code: "sk",
      region_id: "reg_sk",
    })

    expect(result.region_id).toBe("reg_sk")
    expect(result.country_code).toBe("sk")
  })

  it("keeps explicit input region values over context region", () => {
    const result = applyRegion(
      {
        country_code: "cz",
        q: "kretin",
        region_id: "reg_cz",
      },
      { country_code: "sk", region_id: "reg_sk" }
    )

    expect(result.region_id).toBe("reg_cz")
    expect(result.country_code).toBe("cz")
  })

  it("returns input unchanged when context region is missing", () => {
    const input: RegionAwareInput = {
      country_code: "sk",
      q: "kretin",
      region_id: "reg_sk",
    }

    expect(applyRegion(input, null)).toBe(input)
    expect(applyRegion(input)).toBe(input)
  })
})
