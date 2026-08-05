import { describe, expect, it } from "vitest"

import { validateSalesChannelSeedInput } from "../steps/create-sales-channels"
import { planSalesChannelApiKeyLinks } from "../steps/link-sales-channels-api-key"

const UNIQUE_NAME_PATTERN = /unique/
const EXACTLY_ONE_DEFAULT_PATTERN = /exactly one default/

describe("sales-channel seed reconciliation", () => {
  it("requires unique names and exactly one default", () => {
    expect(() =>
      validateSalesChannelSeedInput([
        { default: true, name: "Default" },
        { default: false, name: "Default" },
      ])
    ).toThrow(UNIQUE_NAME_PATTERN)
    expect(() =>
      validateSalesChannelSeedInput([
        { default: true, name: "Default" },
        { default: true, name: "POS" },
      ])
    ).toThrow(EXACTLY_ONE_DEFAULT_PATTERN)
  })

  it("returns the trimmed names used by channel reconciliation", () => {
    expect(
      validateSalesChannelSeedInput([
        { default: true, name: " Default " },
        { default: false, name: " POS " },
      ])
    ).toStrictEqual(["Default", "POS"])
  })

  it("plans exact publishable-key membership, including undesired removals", () => {
    expect(
      planSalesChannelApiKeyLinks({
        desiredIds: ["default"],
        existingIds: ["default", "pos"],
      })
    ).toStrictEqual({ add: [], remove: ["pos"] })
  })
})
