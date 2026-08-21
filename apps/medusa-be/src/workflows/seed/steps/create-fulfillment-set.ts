import type {
  CreateFulfillmentSetDTO,
  FulfillmentSetDTO,
  IFulfillmentModuleService,
  Logger,
  ServiceZoneDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  assertSeedResourceNameAvailable,
  buildSeedResourceMetadata,
  type SeedResourceIdentity,
  selectExactOwnedSeedResource,
} from "./seed-resource-identity"

export type CreateFulfillmentSetStepInput = {
  name: string
  type: string
  seedIdentity?: SeedResourceIdentity
  serviceZones: {
    name: string
    seedIdentity?: SeedResourceIdentity
    geoZones: {
      countryCode: string
    }[]
  }[]
}

type SeededFulfillmentSetMutation = CreateFulfillmentSetDTO & {
  id?: string
  metadata?: Record<string, unknown> | null
  service_zones?: SeededServiceZoneMutation[]
}

type SeededServiceZoneMutation = {
  fulfillment_set_id?: string
  geo_zones: Array<{
    country_code: string
    type: "country"
  }>
  id?: string
  metadata?: Record<string, unknown> | null
  name: string
}

function normalizeCountryCodes(
  serviceZoneName: string,
  geoZones: CreateFulfillmentSetStepInput["serviceZones"][number]["geoZones"]
): string[] {
  const countries = geoZones.map(({ countryCode }) =>
    countryCode.trim().toLowerCase()
  )
  if (
    countries.length === 0 ||
    countries.some((countryCode) => !/^[a-z]{2}$/.test(countryCode)) ||
    new Set(countries).size !== countries.length
  ) {
    throw new Error(
      `Fulfillment service zone "${serviceZoneName}" requires unique ISO-2 country codes`
    )
  }
  return countries
}

function validateSeedIdentityTopology(input: CreateFulfillmentSetStepInput) {
  if (!input.seedIdentity) {
    if (input.serviceZones.some(({ seedIdentity }) => seedIdentity)) {
      throw new Error(
        "Fulfillment service-zone seed identities require a fulfillment-set seed identity"
      )
    }
    return
  }
  if (input.serviceZones.some(({ seedIdentity }) => !seedIdentity)) {
    throw new Error(
      "Owned fulfillment sets require a seed identity for every service zone"
    )
  }
  const handles = input.serviceZones.map(
    ({ seedIdentity }) => seedIdentity?.handle
  )
  if (new Set(handles).size !== handles.length) {
    throw new Error("Fulfillment service-zone seed handles must be unique")
  }
}

export function buildServiceZoneMutation(
  inputZone: CreateFulfillmentSetStepInput["serviceZones"][number],
  existingZone?: ServiceZoneDTO
): SeededServiceZoneMutation {
  const countries = normalizeCountryCodes(inputZone.name, inputZone.geoZones)
  const existingGeoZones = new Map<
    string,
    ServiceZoneDTO["geo_zones"][number]
  >()
  for (const geoZone of existingZone?.geo_zones ?? []) {
    if (geoZone.type !== "country" || !geoZone.country_code) {
      continue
    }
    const countryCode = geoZone.country_code.toLowerCase()
    if (existingGeoZones.has(countryCode)) {
      throw new Error(
        `Owned fulfillment service zone "${inputZone.name}" has duplicate country binding ${countryCode}`
      )
    }
    existingGeoZones.set(countryCode, geoZone)
  }

  return {
    ...(existingZone ? { id: existingZone.id } : {}),
    name: inputZone.name,
    ...(inputZone.seedIdentity
      ? {
          metadata: buildSeedResourceMetadata(
            inputZone.seedIdentity,
            existingZone?.metadata
          ),
        }
      : {}),
    geo_zones: countries.map((countryCode) => {
      const existing = existingGeoZones.get(countryCode)
      return existing
        ? { id: existing.id }
        : { country_code: countryCode, type: "country" as const }
    }) as SeededServiceZoneMutation["geo_zones"],
  }
}

export function resolveOwnedFulfillmentTopology(
  existingFulfillmentSets: FulfillmentSetDTO[],
  input: CreateFulfillmentSetStepInput
): {
  fulfillmentSet?: FulfillmentSetDTO
  serviceZones: Array<{
    input: CreateFulfillmentSetStepInput["serviceZones"][number]
    existing?: ServiceZoneDTO
  }>
} {
  validateSeedIdentityTopology(input)
  if (!input.seedIdentity) {
    const matching = existingFulfillmentSets.filter(
      (candidateSet) => candidateSet.name === input.name
    )
    if (matching.length > 1) {
      throw new Error(`Multiple fulfillment sets named "${input.name}"`)
    }
    return {
      fulfillmentSet: matching[0],
      serviceZones: input.serviceZones.map((inputZone) => ({
        input: inputZone,
        existing: matching[0]?.service_zones?.find(
          (serviceZone) => serviceZone.name === inputZone.name
        ),
      })),
    }
  }

  const fulfillmentSet = selectExactOwnedSeedResource(
    existingFulfillmentSets,
    input.seedIdentity,
    "Fulfillment set"
  )
  assertSeedResourceNameAvailable(
    existingFulfillmentSets,
    input.name,
    fulfillmentSet?.id,
    "Fulfillment set"
  )
  const allServiceZones = existingFulfillmentSets.flatMap(
    (candidate) => candidate.service_zones ?? []
  )
  const serviceZones = input.serviceZones.map((inputZone) => {
    const identity = inputZone.seedIdentity
    if (!identity) {
      throw new Error("Owned service zone is missing a seed identity")
    }
    const existing = selectExactOwnedSeedResource(
      allServiceZones,
      identity,
      "Fulfillment service zone"
    )
    assertSeedResourceNameAvailable(
      allServiceZones,
      inputZone.name,
      existing?.id,
      "Fulfillment service zone"
    )
    if (
      existing &&
      (!fulfillmentSet || existing.fulfillment_set_id !== fulfillmentSet.id)
    ) {
      throw new Error(
        `Fulfillment service-zone seed identity ${identity.owner}/${identity.handle} belongs to another fulfillment set`
      )
    }
    return { input: inputZone, existing }
  })

  if (fulfillmentSet) {
    const expectedZoneIds = new Set(
      serviceZones.flatMap(({ existing }) => (existing ? [existing.id] : []))
    )
    const unmanagedZoneIds = (fulfillmentSet.service_zones ?? [])
      .filter((serviceZone) => !expectedZoneIds.has(serviceZone.id))
      .map(({ id }) => id)
    if (unmanagedZoneIds.length > 0) {
      throw new Error(
        `Owned fulfillment set ${fulfillmentSet.id} contains unmanaged service zones: ${unmanagedZoneIds.join(", ")}`
      )
    }
  }

  return { fulfillmentSet, serviceZones }
}

const CreateFulfillmentSetStepId = "create-fulfillment-set-seed-step"
export const createFulfillmentSetStep = createStep(
  CreateFulfillmentSetStepId,
  async (input: CreateFulfillmentSetStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const fulfillmentModuleService =
      container.resolve<IFulfillmentModuleService>(Modules.FULFILLMENT)

    const existingFulfillmentSets =
      await fulfillmentModuleService.listFulfillmentSets(
        input.seedIdentity ? {} : { name: input.name },
        {
          relations: ["service_zones", "service_zones.geo_zones"],
          take: input.seedIdentity ? 10_000 : undefined,
        }
      )
    const topology = resolveOwnedFulfillmentTopology(
      existingFulfillmentSets,
      input
    )

    let fulfillmentSet: FulfillmentSetDTO
    if (topology.fulfillmentSet) {
      logger.info("Updating existing fulfillment set...")
      await fulfillmentModuleService.updateFulfillmentSets({
        id: topology.fulfillmentSet.id,
        name: input.name,
        type: input.type,
        ...(input.seedIdentity
          ? {
              metadata: buildSeedResourceMetadata(
                input.seedIdentity,
                topology.fulfillmentSet.metadata
              ),
            }
          : {}),
      } as Parameters<IFulfillmentModuleService["updateFulfillmentSets"]>[0])

      for (const { input: inputZone, existing } of topology.serviceZones) {
        const mutation = buildServiceZoneMutation(inputZone, existing)
        if (existing) {
          await fulfillmentModuleService.updateServiceZones(
            existing.id,
            mutation as Parameters<
              IFulfillmentModuleService["updateServiceZones"]
            >[1]
          )
        } else {
          await fulfillmentModuleService.createServiceZones({
            ...mutation,
            fulfillment_set_id: topology.fulfillmentSet.id,
          } as Parameters<IFulfillmentModuleService["createServiceZones"]>[0])
        }
      }

      fulfillmentSet = await fulfillmentModuleService.retrieveFulfillmentSet(
        topology.fulfillmentSet.id,
        { relations: ["service_zones", "service_zones.geo_zones"] }
      )
    } else {
      logger.info("Creating fulfillment sets...")

      const createData: SeededFulfillmentSetMutation = {
        name: input.name,
        type: input.type,
        ...(input.seedIdentity
          ? { metadata: buildSeedResourceMetadata(input.seedIdentity) }
          : {}),
        service_zones: topology.serviceZones.map(({ input: inputZone }) =>
          buildServiceZoneMutation(inputZone)
        ),
      }

      fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets(
        createData as CreateFulfillmentSetDTO
      )
    }

    const primaryZoneIdentity = input.serviceZones[0]?.seedIdentity
    const serviceZone = primaryZoneIdentity
      ? selectExactOwnedSeedResource(
          fulfillmentSet.service_zones ?? [],
          primaryZoneIdentity,
          "Fulfillment service zone"
        )
      : fulfillmentSet.service_zones?.find(
          (zone) => zone.name === input.serviceZones[0]?.name
        )

    if (!serviceZone?.id) {
      throw new Error("Could not find service zone in fulfillment set")
    }

    return new StepResponse({
      fulfillmentSet,
      result: [fulfillmentSet],
      serviceZone,
    })
  }
)
