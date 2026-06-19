import type {
  CreateFulfillmentSetDTO,
  FulfillmentSetDTO,
  IFulfillmentModuleService,
  Logger,
  UpdateFulfillmentSetDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export type CreateFulfillmentSetStepInput = {
  name: string
  type: string
  serviceZones: {
    name: string
    geoZones: {
      countryCode: string
    }[]
  }[]
}

const CreateFulfillmentSetStepId = "create-fulfillment-set-seed-step"
export const createFulfillmentSetStep = createStep(
  CreateFulfillmentSetStepId,
  async (input: CreateFulfillmentSetStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const fulfillmentModuleService =
      container.resolve<IFulfillmentModuleService>(Modules.FULFILLMENT)

    // Fetch existing fulfillment sets with their service zones to avoid cascade deletions
    const existingFulfillmentSets =
      await fulfillmentModuleService.listFulfillmentSets(
        {
          name: input.name,
        },
        {
          relations: ["service_zones", "service_zones.geo_zones"],
        }
      )

    const result: FulfillmentSetDTO[] = []
    if (existingFulfillmentSets.length === 0) {
      logger.info("Creating fulfillment sets...")

      const createData: CreateFulfillmentSetDTO = {
        name: input.name,
        type: input.type,
        service_zones: input.serviceZones.map((i) => ({
          name: i.name,
          geo_zones: i.geoZones.map((j) => ({
            country_code: j.countryCode,
            type: "country" as const,
          })),
        })),
      }

      const fulfillmentSet =
        await fulfillmentModuleService.createFulfillmentSets(createData)
      result.push(fulfillmentSet)
    } else {
      logger.info("Updating existing fulfillment sets...")

      for (const existingFulfillmentSet of existingFulfillmentSets) {
        const existingZonesByName = new Map(
          existingFulfillmentSet.service_zones?.map((sz) => [sz.name, sz]) ?? []
        )

        const serviceZonesUpdate: UpdateFulfillmentSetDTO["service_zones"] =
          input.serviceZones.map((inputZone) => {
            const existingZone = existingZonesByName.get(inputZone.name)

            if (existingZone) {
              // Existing zone found - include ID to preserve it and update geo_zones
              const existingGeoZonesByCountryCode = new Map(
                (existingZone.geo_zones ?? [])
                  .filter((gz) => "country_code" in gz)
                  .map((gz) => [
                    (gz as { country_code: string }).country_code,
                    gz,
                  ])
              )

              return {
                id: existingZone.id,
                name: inputZone.name,
                geo_zones: inputZone.geoZones.map((inputGz) => {
                  const existingGz = existingGeoZonesByCountryCode.get(
                    inputGz.countryCode
                  )
                  if (existingGz) {
                    return { id: existingGz.id }
                  }
                  return {
                    country_code: inputGz.countryCode,
                    type: "country" as const,
                  }
                }),
              }
            }

            // New zone - create it
            return {
              name: inputZone.name,
              geo_zones: inputZone.geoZones.map((j) => ({
                country_code: j.countryCode,
                type: "country" as const,
              })),
            }
          })

        const updateData: UpdateFulfillmentSetDTO = {
          id: existingFulfillmentSet.id,
          name: input.name,
          type: input.type,
          service_zones: serviceZonesUpdate,
        }

        const updateResult =
          await fulfillmentModuleService.updateFulfillmentSets(updateData)
        result.push(updateResult)
      }
    }

    const fulfillmentSet = result[0]
    const serviceZone = fulfillmentSet?.service_zones?.[0]

    if (!fulfillmentSet) {
      throw new Error("Could not find fulfillment set")
    }

    if (!serviceZone?.id) {
      throw new Error("Could not find service zone in fulfillment set")
    }

    return new StepResponse({
      fulfillmentSet,
      result,
      serviceZone,
    })
  }
)
