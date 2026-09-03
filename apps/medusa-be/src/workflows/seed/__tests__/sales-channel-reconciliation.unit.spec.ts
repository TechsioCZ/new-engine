import { describe, expect, it } from "vitest"
import {
  mergeSalesChannelMetadata,
  planSalesChannelSeedReconciliation,
  validateSalesChannelSeedInput,
} from "../steps/create-sales-channels"
import { planSalesChannelApiKeyLinks } from "../steps/link-sales-channels-api-key"

const UNIQUE_NAME_PATTERN = /unique/
const EXACTLY_ONE_DEFAULT_PATTERN = /exactly one default/

describe("sales-channel seed reconciliation", () => {
  it("preserves unrelated metadata while applying configured values", () => {
    expect(
      mergeSalesChannelMetadata(
        {
          operator_note: "keep",
          storefront_notification_markets: { old: true },
        },
        { storefront_notification_markets: { sk: true } }
      )
    ).toEqual({
      operator_note: "keep",
      storefront_notification_markets: { sk: true },
    })
  })

  it("requires unique names and exactly one default", () => {
    expect(() =>
      validateSalesChannelSeedInput([
        { name: "Default", default: true },
        { name: "Default", default: false },
      ])
    ).toThrow(UNIQUE_NAME_PATTERN)
    expect(() =>
      validateSalesChannelSeedInput([
        { name: "Default", default: true },
        { name: "POS", default: true },
      ])
    ).toThrow(EXACTLY_ONE_DEFAULT_PATTERN)
  })

  it("returns the trimmed names used by channel reconciliation", () => {
    expect(
      validateSalesChannelSeedInput([
        { name: " Default ", default: true },
        { name: " POS ", default: false },
      ])
    ).toEqual(["Default", "POS"])
  })

  it("plans exact publishable-key membership, including undesired removals", () => {
    expect(
      planSalesChannelApiKeyLinks({
        desiredIds: ["default"],
        existingIds: ["default", "pos"],
      })
    ).toEqual({ add: [], remove: ["pos"] })
  })

  it("reuses an existing sales channel by its stable seed handle", () => {
    expect(
      planSalesChannelSeedReconciliation(
        [
          {
            name: "Herbatica Storefront SK",
            default: true,
            seedHandle: "herbatica-storefront-sk",
          },
        ],
        [
          {
            id: "sc_sk",
            name: "Legacy Slovak Storefront",
            metadata: { seed_handle: "herbatica-storefront-sk" },
          },
        ]
      )
    ).toEqual([
      expect.objectContaining({
        configuredName: "Herbatica Storefront SK",
        existingId: "sc_sk",
      }),
    ])
  })

  it("rejects ambiguous sales-channel name and handle ownership", () => {
    expect(() =>
      planSalesChannelSeedReconciliation(
        [
          {
            name: "Herbatica Storefront SK",
            default: true,
            seedHandle: "herbatica-storefront-sk",
          },
        ],
        [
          {
            id: "sc_by_name",
            name: "Herbatica Storefront SK",
            metadata: {},
          },
          {
            id: "sc_by_handle",
            name: "Legacy Slovak Storefront",
            metadata: { seed_handle: "herbatica-storefront-sk" },
          },
        ]
      )
    ).toThrow("Ambiguous seed sales channel identity")
  })

  it("rejects a same-name channel owned by a different stable handle", () => {
    expect(() =>
      planSalesChannelSeedReconciliation(
        [
          {
            name: "Herbatica Storefront SK",
            default: true,
            seedHandle: "herbatica-storefront-sk",
          },
        ],
        [
          {
            id: "sc_foreign",
            name: "Herbatica Storefront SK",
            metadata: { seed_handle: "different-seed-owner" },
          },
        ]
      )
    ).toThrow("Conflicting seed sales channel handle")
  })
})
