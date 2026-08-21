import type {
  FulfillmentSetDTO,
  ServiceZoneDTO,
  ShippingOptionDTO,
} from "@medusajs/framework/types"
import { describe, expect, it } from "vitest"
import {
  buildServiceZoneMutation,
  type CreateFulfillmentSetStepInput,
  resolveOwnedFulfillmentTopology,
} from "../steps/create-fulfillment-set"
import {
  type CreateShippingOptionsStepInput,
  resolveShippingOptionSeedResources,
} from "../steps/create-shipping-options"
import {
  buildSeedResourceMetadata,
  type SeedResourceIdentity,
} from "../steps/seed-resource-identity"

const SET_IDENTITY = {
  owner: "herbatika",
  kind: "fulfillment-set",
  handle: "herbatika-four-market-delivery",
  version: 1,
} as const satisfies SeedResourceIdentity

const ZONE_IDENTITY = {
  owner: "herbatika",
  kind: "service-zone",
  handle: "herbatika-sk-cz-hu-ro",
  version: 1,
} as const satisfies SeedResourceIdentity

const SHIPPING_IDENTITY = {
  owner: "herbatika",
  kind: "shipping-option",
  handle: "herbatika-standard-shipping",
  version: 1,
} as const satisfies SeedResourceIdentity

const input = (): CreateFulfillmentSetStepInput => ({
  name: "Herbatika four-market delivery",
  type: "shipping",
  seedIdentity: SET_IDENTITY,
  serviceZones: [
    {
      name: "Herbatika SK/CZ/HU/RO",
      seedIdentity: ZONE_IDENTITY,
      geoZones: ["sk", "cz", "hu", "ro"].map((countryCode) => ({
        countryCode,
      })),
    },
  ],
})

function serviceZone(overrides: Partial<ServiceZoneDTO> = {}): ServiceZoneDTO {
  return {
    id: "serzo_owned",
    name: "Herbatika SK/CZ/HU/RO",
    metadata: buildSeedResourceMetadata(ZONE_IDENTITY),
    fulfillment_set_id: "fuset_owned",
    geo_zones: [],
    ...overrides,
  } as ServiceZoneDTO
}

function fulfillmentSet(
  overrides: Partial<FulfillmentSetDTO> = {}
): FulfillmentSetDTO {
  return {
    id: "fuset_owned",
    name: "Herbatika four-market delivery",
    type: "shipping",
    metadata: buildSeedResourceMetadata(SET_IDENTITY),
    service_zones: [serviceZone()],
    ...overrides,
  } as FulfillmentSetDTO
}

describe("fulfillment seed identity reconciliation", () => {
  it("does not hijack a generic Europe topology or the first fulfillment set", () => {
    const unrelated = fulfillmentSet({
      id: "fuset_unrelated",
      name: "European Warehouse delivery",
      metadata: null,
      service_zones: [
        serviceZone({
          id: "serzo_unrelated",
          name: "Europe",
          metadata: null,
          fulfillment_set_id: "fuset_unrelated",
        }),
      ],
    })

    expect(resolveOwnedFulfillmentTopology([unrelated], input())).toEqual({
      fulfillmentSet: undefined,
      serviceZones: [{ input: input().serviceZones[0], existing: undefined }],
    })
  })

  it("idempotently reuses only the exact owned set and service zone", () => {
    const owned = fulfillmentSet()
    const unrelated = fulfillmentSet({
      id: "fuset_unrelated",
      name: "Unrelated delivery",
      metadata: null,
      service_zones: [],
    })

    const result = resolveOwnedFulfillmentTopology([unrelated, owned], input())

    expect(result.fulfillmentSet?.id).toBe("fuset_owned")
    expect(result.serviceZones[0]?.existing?.id).toBe("serzo_owned")
  })

  it("fails closed when an unrelated resource occupies a canonical name", () => {
    const unrelated = fulfillmentSet({
      id: "fuset_unrelated",
      metadata: null,
      service_zones: [],
    })

    expect(() => resolveOwnedFulfillmentTopology([unrelated], input())).toThrow(
      "resource is not owned by this seed"
    )
  })

  it("fails closed on incompatible markers in the same owner/handle namespace", () => {
    const incompatible = fulfillmentSet({
      metadata: buildSeedResourceMetadata({
        ...SET_IDENTITY,
        kind: "service-zone",
      }),
      service_zones: [],
    })

    expect(() =>
      resolveOwnedFulfillmentTopology([incompatible], input())
    ).toThrow("incompatible marker")
  })

  it("fails closed when the owned service-zone handle belongs to another set", () => {
    const owned = fulfillmentSet({ service_zones: [] })
    const other = fulfillmentSet({
      id: "fuset_other",
      name: "Other",
      metadata: null,
      service_zones: [serviceZone({ fulfillment_set_id: "fuset_other" })],
    })

    expect(() =>
      resolveOwnedFulfillmentTopology([owned, other], input())
    ).toThrow("belongs to another fulfillment set")
  })

  it("refuses to delete unmanaged zones from an owned set", () => {
    const owned = fulfillmentSet({
      service_zones: [
        serviceZone(),
        serviceZone({
          id: "serzo_unmanaged",
          name: "Manual zone",
          metadata: null,
        }),
      ],
    })

    expect(() => resolveOwnedFulfillmentTopology([owned], input())).toThrow(
      "contains unmanaged service zones"
    )
  })

  it("reconciles the owned service zone to exactly SK/CZ/HU/RO", () => {
    const ownedZoneInput = input().serviceZones.at(0)
    if (!ownedZoneInput) {
      throw new Error("Expected the canonical owned service zone input")
    }
    const mutation = buildServiceZoneMutation(
      ownedZoneInput,
      serviceZone({
        geo_zones: [
          { id: "geo_sk", type: "country", country_code: "sk" },
          { id: "geo_de", type: "country", country_code: "de" },
        ] as ServiceZoneDTO["geo_zones"],
      })
    )

    expect(mutation.geo_zones).toEqual([
      { id: "geo_sk" },
      { country_code: "cz", type: "country" },
      { country_code: "hu", type: "country" },
      { country_code: "ro", type: "country" },
    ])
    expect(mutation.geo_zones).not.toContainEqual({ id: "geo_de" })
  })
})

function shippingInput(): CreateShippingOptionsStepInput {
  return [
    {
      name: "Herbatika Standard Shipping",
      seedIdentity: SHIPPING_IDENTITY,
      providerId: "manual_manual",
      serviceZoneId: "serzo_owned",
      shippingProfileId: "sp_owned",
      regions: [],
      type: {
        label: "Standard",
        description: "Standard delivery",
        code: "standard",
      },
      prices: [{ currencyCode: "eur", amount: 5 }],
      rules: [],
      data: { supports_cod: true },
    },
  ]
}

function shippingOption(
  overrides: Partial<ShippingOptionDTO> = {}
): ShippingOptionDTO {
  return {
    id: "so_owned",
    name: "Herbatika Standard Shipping",
    data: buildSeedResourceMetadata(SHIPPING_IDENTITY, {
      supports_cod: true,
    }),
    ...overrides,
  } as ShippingOptionDTO
}

describe("shipping-option seed identity reconciliation", () => {
  it("reuses the exact data marker independently of list order", () => {
    const owned = shippingOption()
    const unrelated = shippingOption({
      id: "so_unrelated",
      name: "Other option",
      data: null,
    })

    const result = resolveShippingOptionSeedResources(
      [unrelated, owned],
      shippingInput()
    )

    expect(result[0]?.existing?.id).toBe("so_owned")
  })

  it("does not hijack an unrelated shipping option with the canonical name", () => {
    const unrelated = shippingOption({ id: "so_unrelated", data: null })

    expect(() =>
      resolveShippingOptionSeedResources([unrelated], shippingInput())
    ).toThrow("resource is not owned by this seed")
  })

  it("fails closed on a marker with the right namespace but wrong kind", () => {
    const incompatible = shippingOption({
      data: buildSeedResourceMetadata({
        ...SHIPPING_IDENTITY,
        kind: "service-zone",
      }),
    })

    expect(() =>
      resolveShippingOptionSeedResources([incompatible], shippingInput())
    ).toThrow("incompatible marker")
  })
})
