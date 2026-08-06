import type {
  CreateFulfillmentSetDTO,
  FulfillmentSetDTO,
  IFulfillmentModuleService,
  Logger,
  UpdateFulfillmentSetDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export interface CreateFulfillmentSetStepInput {
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
        },
      )

    const result: FulfillmentSetDTO[] = []
    if (existingFulfillmentSets.length === 0) {
      logger.info("Creating fulfillment sets...")

      const createData: CreateFulfillmentSetDTO = {
        name: input.name,
        service_zones: input.serviceZones.map((i) => ({
          geo_zones: i.geoZones.map((j) => ({
            country_code: j.countryCode,
            type: "country" as const,
          })),
          name: i.name,
        })),
        type: input.type,
      }

      const fulfillmentSet =
        await fulfillmentModuleService.createFulfillmentSets(createData)
      result.push(fulfillmentSet)
    } else {
      logger.info("Updating existing fulfillment sets...")

      const processSet = async function processSet(
        index: number,
      ): Promise<void> {
        const existingFulfillmentSet = existingFulfillmentSets[index]
        if (existingFulfillmentSet === undefined) {
          return
        }

        const existingZonesByName = new Map(
          existingFulfillmentSet.service_zones?.map((sz) => [sz.name, sz]),
        )

        const serviceZonesUpdate: UpdateFulfillmentSetDTO["service_zones"] =
          input.serviceZones.map((inputZone) => {
            const existingZone = existingZonesByName.get(inputZone.name)

            if (existingZone) {
              // Existing zone found - include ID to preserve it and update geo_zones
              const existingGeoZonesByCountryCode = new Map<
                string,
                { id: string }
              >()
              for (const geoZone of existingZone.geo_zones ?? []) {
                if (typeof geoZone !== "object" || geoZone === null) {
                  continue
                }
                const countryCode: unknown = Reflect.get(
                  geoZone,
                  "country_code",
                )
                const id: unknown = Reflect.get(geoZone, "id")
                if (typeof countryCode === "string" && typeof id === "string") {
                  existingGeoZonesByCountryCode.set(countryCode, { id })
                }
              }

              return {
                geo_zones: inputZone.geoZones.map((inputGz) => {
                  const existingGz = existingGeoZonesByCountryCode.get(
                    inputGz.countryCode,
                  )
                  if (existingGz) {
                    return { id: existingGz.id }
                  }
                  return {
                    country_code: inputGz.countryCode,
                    type: "country" as const,
                  }
                }),
                id: existingZone.id,
                name: inputZone.name,
              }
            }

            // New zone - create it
            return {
              geo_zones: inputZone.geoZones.map((j) => ({
                country_code: j.countryCode,
                type: "country" as const,
              })),
              name: inputZone.name,
            }
          })

        const updateData: UpdateFulfillmentSetDTO = {
          id: existingFulfillmentSet.id,
          name: input.name,
          service_zones: serviceZonesUpdate,
          type: input.type,
        }

        const updateResult =
          await fulfillmentModuleService.updateFulfillmentSets(updateData)
        result.push(updateResult)
        await processSet(index + 1)
      }

      await processSet(0)
    }

    const [fulfillmentSet] = result
    const serviceZone = fulfillmentSet?.service_zones?.[0]

    if (!fulfillmentSet) {
      throw new Error("Could not find fulfillment set")
    }

    if (serviceZone?.id === undefined || serviceZone.id.length === 0) {
      throw new Error("Could not find service zone in fulfillment set")
    }

    return new StepResponse({
      fulfillmentSet,
      result,
      serviceZone,
    })
  },
)
