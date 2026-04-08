import { applyRegion } from "../src/shared/region"

type RegionAwareInput = {
  q?: string
  region_id?: string
  country_code?: string
}

describe("applyRegion", () => {
  it("applies context region when input omits region fields", () => {
    const result = applyRegion(
      { q: "kretin" } as RegionAwareInput,
      { region_id: "reg_sk", country_code: "sk" }
    )

    expect(result).toEqual({
      q: "kretin",
      region_id: "reg_sk",
      country_code: "sk",
    })
  })

  it("uses context region when input region fields are undefined", () => {
    const result = applyRegion(
      {
        q: "kretin",
        region_id: undefined,
        country_code: undefined,
      } as RegionAwareInput,
      { region_id: "reg_sk", country_code: "sk" }
    )

    expect(result.region_id).toBe("reg_sk")
    expect(result.country_code).toBe("sk")
  })

  it("keeps explicit input region values over context region", () => {
    const result = applyRegion(
      {
        q: "kretin",
        region_id: "reg_cz",
        country_code: "cz",
      } as RegionAwareInput,
      { region_id: "reg_sk", country_code: "sk" }
    )

    expect(result.region_id).toBe("reg_cz")
    expect(result.country_code).toBe("cz")
  })

  it("returns input unchanged when context region is missing", () => {
    const input: RegionAwareInput = {
      q: "kretin",
      region_id: "reg_sk",
      country_code: "sk",
    }

    expect(applyRegion(input, null)).toBe(input)
    expect(applyRegion(input, undefined)).toBe(input)
  })
})
