import { describe, expect, it } from "vitest"
import {
  resolveUniqueActivePublishableKey,
  toSeedPublishableKeyIdentity,
  validatePublishableKeySeedInput,
} from "../steps/create-publishable-key"
import {
  resolveExclusivePublishableKeySalesChannels,
  resolveLegacySharedPublishableKeySalesChannels,
  validateExclusivePublishableKeyAssociations,
} from "../steps/link-sales-channels-api-key"
import { resolveSeedPublishableKeysInput } from "../workflows/seed-database"

const KEYS = [
  {
    title: "Herbatica Storefront SK Publishable Key",
    salesChannelNames: ["Herbatica Storefront SK"],
  },
  {
    title: "Herbatica Storefront CZ Publishable Key",
    salesChannelNames: ["Herbatica Storefront CZ"],
  },
]

describe("publishable-key seed reconciliation", () => {
  it("accepts distinct stable key titles with one exclusive channel each", () => {
    expect(validatePublishableKeySeedInput(KEYS)).toEqual(KEYS)
  })

  it("preserves shared-channel behavior only for the explicit legacy mode", () => {
    const legacy = [
      {
        associationMode: "legacy-shared" as const,
        salesChannelNames: ["Default Sales Channel", "Point of Sale"],
        title: "Webshop",
      },
    ]
    expect(validatePublishableKeySeedInput(legacy)).toEqual(legacy)
    expect(
      resolveLegacySharedPublishableKeySalesChannels({
        publishableKeys: [
          {
            ...legacy[0],
            publishableApiKey: { id: "pk_legacy" },
          },
        ],
        salesChannels: [
          { id: "sc_default", name: "Default Sales Channel" },
          { id: "sc_pos", name: "Point of Sale" },
        ],
      })
    ).toEqual({
      publishableKeyId: "pk_legacy",
      salesChannelIds: ["sc_default", "sc_pos"],
    })
  })

  it("validates mutually exclusive key modes outside workflow transforms", () => {
    expect(() =>
      resolveSeedPublishableKeysInput({
        legacySharedPublishableKey: { title: "Legacy" },
        publishableKeys: KEYS,
        salesChannels: [{ default: true, name: "Default Sales Channel" }],
      })
    ).toThrow(
      "Seed input must define legacySharedPublishableKey or publishableKeys, not both"
    )

    expect(
      resolveSeedPublishableKeysInput({
        legacySharedPublishableKey: { title: "Legacy" },
        salesChannels: [
          { default: true, name: "Default Sales Channel" },
          { default: false, name: "Point of Sale" },
        ],
      })
    ).toEqual([
      {
        associationMode: "legacy-shared",
        salesChannelNames: ["Default Sales Channel", "Point of Sale"],
        title: "Legacy",
      },
    ])
  })

  it("rejects duplicate key identities and shared desired channels", () => {
    expect(() =>
      validatePublishableKeySeedInput([{ title: "Unassociated key" }])
    ).toThrow("must target exactly one sales channel")
    expect(() =>
      validatePublishableKeySeedInput([
        KEYS[0],
        { ...KEYS[1], title: KEYS[0].title },
      ])
    ).toThrow("titles must be unique")
    expect(() =>
      validatePublishableKeySeedInput([
        KEYS[0],
        { ...KEYS[1], salesChannelNames: KEYS[0].salesChannelNames },
      ])
    ).toThrow("must not share sales channels")
  })

  it("rejects multiple active keys with the same stable title", () => {
    expect(() =>
      resolveUniqueActivePublishableKey(
        "Herbatica Storefront SK Publishable Key",
        [
          { id: "pk_sk_a", revoked_at: null },
          { id: "pk_sk_b", revoked_at: null },
        ]
      )
    ).toThrow("Ambiguous active publishable API keys")
    expect(
      resolveUniqueActivePublishableKey(
        "Herbatica Storefront SK Publishable Key",
        [
          { id: "pk_sk_active", revoked_at: null },
          { id: "pk_sk_revoked", revoked_at: new Date("2026-01-01") },
        ]
      )
    ).toEqual({ id: "pk_sk_active", revoked_at: null })
  })

  it("exposes only key identity fields to the seed workflow", () => {
    const apiKey = {
      id: "pk_sk",
      token: "must-not-escape",
    }
    const identity = toSeedPublishableKeyIdentity(apiKey)

    expect(identity).toEqual({ id: "pk_sk" })
    expect(JSON.stringify(identity)).not.toContain("must-not-escape")
  })

  it("rejects pre-existing shared or multiple key-channel linkage", () => {
    expect(() =>
      validateExclusivePublishableKeyAssociations({
        desired: [
          { publishableKeyId: "pk_sk", salesChannelId: "sc_sk" },
          { publishableKeyId: "pk_cz", salesChannelId: "sc_cz" },
        ],
        existing: [
          { publishableKeyId: "pk_sk", salesChannelId: "sc_sk" },
          { publishableKeyId: "pk_shared", salesChannelId: "sc_sk" },
        ],
      })
    ).toThrow("Ambiguous publishable-key sales-channel linkage")

    expect(() =>
      validateExclusivePublishableKeyAssociations({
        desired: [
          { publishableKeyId: "pk_sk", salesChannelId: "sc_sk" },
          { publishableKeyId: "pk_cz", salesChannelId: "sc_cz" },
        ],
        existing: [
          { publishableKeyId: "pk_sk", salesChannelId: "sc_sk" },
          { publishableKeyId: "pk_sk", salesChannelId: "sc_other" },
        ],
      })
    ).toThrow("Ambiguous publishable-key sales-channel linkage")
  })

  it("resolves every key to exactly its one named sales channel", () => {
    expect(
      resolveExclusivePublishableKeySalesChannels({
        publishableKeys: [
          {
            publishableApiKey: { id: "pk_sk" },
            salesChannelNames: ["Herbatica Storefront SK"],
            title: KEYS[0].title,
          },
          {
            publishableApiKey: { id: "pk_cz" },
            salesChannelNames: ["Herbatica Storefront CZ"],
            title: KEYS[1].title,
          },
        ],
        salesChannels: [
          { id: "sc_sk", name: "Herbatica Storefront SK" },
          { id: "sc_cz", name: "Herbatica Storefront CZ" },
        ],
      })
    ).toEqual([
      { publishableKeyId: "pk_sk", salesChannelId: "sc_sk" },
      { publishableKeyId: "pk_cz", salesChannelId: "sc_cz" },
    ])
  })
})
