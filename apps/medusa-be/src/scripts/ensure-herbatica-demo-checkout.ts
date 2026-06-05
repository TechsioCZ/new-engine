import type { Link } from "@medusajs/framework/modules-sdk"
import type {
  ExecArgs,
  FulfillmentSetDTO,
  IFulfillmentModuleService,
  IRegionModuleService,
  IStockLocationService,
  Logger,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  updateShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  HERBATICA_COUNTRIES,
  HERBATICA_DEFAULT_FULFILLMENT_SET,
  HERBATICA_DEFAULT_SHIPPING_PROFILE,
  HERBATICA_DEFAULT_STOCK_LOCATION,
  HERBATICA_WORKFLOW_DEFAULTS,
} from "./herbatica-seed-config"

const COURIER_OPTION_NAME = "Kuriér na adresu"
const COURIER_TYPE_CODE = "herbatica-courier"
const COURIER_PRICES = {
  czk: 99,
  eur: 3.9,
  usd: 4,
} as const

export default async function ensureHerbaticaDemoCheckout({
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  logger.info("Ensuring Herbatica local demo checkout data...")

  const stockLocation = await ensureStockLocation(container, logger)
  const fulfillmentSet = await ensureFulfillmentSet(container, logger)

  await ensureStockLocationLink(container, logger, stockLocation.id, {
    fulfillment_provider_id: HERBATICA_WORKFLOW_DEFAULTS.fulfillmentProviderId,
  })
  await ensureStockLocationLink(container, logger, stockLocation.id, {
    fulfillment_set_id: fulfillmentSet.id,
  })

  const shippingProfile = await ensureDefaultShippingProfile(container, logger)
  const serviceZone = fulfillmentSet.service_zones?.find(
    (zone) => zone.name === HERBATICA_DEFAULT_FULFILLMENT_SET.serviceZoneName
  )

  if (!serviceZone?.id) {
    throw new Error(
      `Could not resolve service zone "${HERBATICA_DEFAULT_FULFILLMENT_SET.serviceZoneName}"`
    )
  }

  await ensureCourierShippingOption(container, logger, {
    serviceZoneId: serviceZone.id,
    shippingProfileId: shippingProfile.id,
  })

  logger.info("Herbatica local demo checkout data is ready.")
}

async function ensureStockLocation(
  container: ExecArgs["container"],
  logger: Logger
) {
  const stockLocationService = container.resolve<IStockLocationService>(
    Modules.STOCK_LOCATION
  )
  const existing = await stockLocationService.listStockLocations({
    name: HERBATICA_DEFAULT_STOCK_LOCATION.name,
  })

  if (existing[0]) {
    logger.info(`Using stock location: ${existing[0].name}`)
    return existing[0]
  }

  logger.info(`Creating stock location: ${HERBATICA_DEFAULT_STOCK_LOCATION.name}`)
  const { result } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [HERBATICA_DEFAULT_STOCK_LOCATION],
    },
  })

  const stockLocation = result[0]
  if (!stockLocation) {
    throw new Error("Could not create Herbatica demo stock location")
  }

  return stockLocation
}

async function ensureFulfillmentSet(
  container: ExecArgs["container"],
  logger: Logger
) {
  const fulfillmentService = container.resolve<IFulfillmentModuleService>(
    Modules.FULFILLMENT
  )
  const existing = await listHerbaticaFulfillmentSets(fulfillmentService)
  const geoZones = HERBATICA_COUNTRIES.map((countryCode) => ({
    country_code: countryCode,
    type: "country" as const,
  }))

  if (!existing[0]) {
    logger.info(
      `Creating fulfillment set: ${HERBATICA_DEFAULT_FULFILLMENT_SET.name}`
    )
    await fulfillmentService.createFulfillmentSets({
      name: HERBATICA_DEFAULT_FULFILLMENT_SET.name,
      type: HERBATICA_DEFAULT_FULFILLMENT_SET.type,
      service_zones: [
        {
          name: HERBATICA_DEFAULT_FULFILLMENT_SET.serviceZoneName,
          geo_zones: geoZones,
        },
      ],
    })

    return getSingleHerbaticaFulfillmentSet(fulfillmentService)
  }

  const fulfillmentSet = existing[0]
  await ensureServiceZoneCountries(fulfillmentService, logger, fulfillmentSet)

  return getSingleHerbaticaFulfillmentSet(fulfillmentService)
}

async function ensureServiceZoneCountries(
  fulfillmentService: IFulfillmentModuleService,
  logger: Logger,
  fulfillmentSet: FulfillmentSetDTO
) {
  const targetZone = fulfillmentSet.service_zones?.find(
    (zone) => zone.name === HERBATICA_DEFAULT_FULFILLMENT_SET.serviceZoneName
  )

  if (!targetZone) {
    logger.info(
      `Creating service zone: ${HERBATICA_DEFAULT_FULFILLMENT_SET.serviceZoneName}`
    )
    await fulfillmentService.createServiceZones({
      name: HERBATICA_DEFAULT_FULFILLMENT_SET.serviceZoneName,
      fulfillment_set_id: fulfillmentSet.id,
      geo_zones: HERBATICA_COUNTRIES.map((countryCode) => ({
        country_code: countryCode,
        type: "country" as const,
      })),
    })
    return
  }

  const existingCountries = new Set(
    (targetZone.geo_zones ?? [])
      .filter((zone) => "country_code" in zone)
      .map((zone) =>
        (zone as { country_code?: string }).country_code?.toLowerCase()
      )
      .filter((countryCode): countryCode is string => Boolean(countryCode))
  )
  const missingCountries = HERBATICA_COUNTRIES.filter(
    (countryCode) => !existingCountries.has(countryCode)
  )

  if (missingCountries.length === 0) {
    logger.info("Fulfillment service zone already covers Herbatica countries.")
    return
  }

  logger.info(
    `Adding fulfillment service-zone countries: ${missingCountries.join(", ")}`
  )
  await fulfillmentService.createGeoZones(
    missingCountries.map((countryCode) => ({
      country_code: countryCode,
      service_zone_id: targetZone.id,
      type: "country" as const,
    }))
  )
}

async function listHerbaticaFulfillmentSets(
  fulfillmentService: IFulfillmentModuleService
) {
  return fulfillmentService.listFulfillmentSets(
    {
      name: HERBATICA_DEFAULT_FULFILLMENT_SET.name,
    },
    {
      relations: ["service_zones", "service_zones.geo_zones"],
    }
  )
}

async function getSingleHerbaticaFulfillmentSet(
  fulfillmentService: IFulfillmentModuleService
): Promise<FulfillmentSetDTO> {
  const fulfillmentSet = (await listHerbaticaFulfillmentSets(fulfillmentService))[0]

  if (!fulfillmentSet) {
    throw new Error("Could not resolve Herbatica demo fulfillment set")
  }

  return fulfillmentSet
}

async function ensureStockLocationLink(
  container: ExecArgs["container"],
  logger: Logger,
  stockLocationId: string,
  fulfillmentLink:
    | { fulfillment_provider_id: string }
    | { fulfillment_set_id: string }
) {
  const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocationId,
      },
      [Modules.FULFILLMENT]: fulfillmentLink,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (
      message.includes(
        "Cannot create multiple links between 'stock_location' and 'fulfillment'"
      )
    ) {
      logger.info("Stock-location fulfillment link already exists.")
      return
    }

    throw error
  }
}

async function ensureDefaultShippingProfile(
  container: ExecArgs["container"],
  logger: Logger
) {
  const fulfillmentService = container.resolve<IFulfillmentModuleService>(
    Modules.FULFILLMENT
  )
  const existing = await fulfillmentService.listShippingProfiles({
    type: "default",
  })

  if (existing[0]) {
    logger.info(`Using shipping profile: ${existing[0].name}`)
    return existing[0]
  }

  logger.info(
    `Creating shipping profile: ${HERBATICA_DEFAULT_SHIPPING_PROFILE.name}`
  )
  const { result } = await createShippingProfilesWorkflow(container).run({
    input: {
      data: [
        {
          name: HERBATICA_DEFAULT_SHIPPING_PROFILE.name,
          type: "default",
        },
      ],
    },
  })

  const shippingProfile = result[0]
  if (!shippingProfile) {
    throw new Error("Could not create Herbatica demo shipping profile")
  }

  return shippingProfile
}

async function ensureCourierShippingOption(
  container: ExecArgs["container"],
  logger: Logger,
  input: {
    serviceZoneId: string
    shippingProfileId: string
  }
) {
  const fulfillmentService = container.resolve<IFulfillmentModuleService>(
    Modules.FULFILLMENT
  )
  const regionService = container.resolve<IRegionModuleService>(Modules.REGION)
  const existing = (
    await fulfillmentService.listShippingOptions(
      {
        name: COURIER_OPTION_NAME,
      },
      {
        relations: ["type"],
      }
    )
  )[0]
  const prices = [
    ...Object.entries(COURIER_PRICES).map(([currencyCode, amount]) => ({
      currency_code: currencyCode,
      amount,
    })),
    ...(await regionService.listRegions({})).flatMap((region) => {
      const amount =
        COURIER_PRICES[
          region.currency_code?.toLowerCase() as keyof typeof COURIER_PRICES
        ]

      return amount === undefined
        ? []
        : [
            {
              region_id: region.id,
              amount,
            },
          ]
    }),
  ]
  const optionInput = {
    name: COURIER_OPTION_NAME,
    price_type: "flat" as const,
    provider_id: HERBATICA_WORKFLOW_DEFAULTS.fulfillmentProviderId,
    service_zone_id: input.serviceZoneId,
    shipping_profile_id: input.shippingProfileId,
    data: {
      code: COURIER_TYPE_CODE,
      demo: "herbatica-local",
      requires_access_point: false,
    },
    prices,
    rules: [
      {
        attribute: "enabled_in_store",
        value: "true",
        operator: "eq" as const,
      },
      {
        attribute: "is_return",
        value: "false",
        operator: "eq" as const,
      },
    ],
  }

  if (!existing) {
    logger.info(`Creating shipping option: ${COURIER_OPTION_NAME}`)
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          ...optionInput,
          type: {
            label: "Kuriér",
            description: "Doručenie kuriérom na adresu.",
            code: COURIER_TYPE_CODE,
          },
        },
      ],
    })
    return
  }

  logger.info(`Updating shipping option: ${COURIER_OPTION_NAME}`)
  await updateShippingOptionsWorkflow(container).run({
    input: [
      {
        ...optionInput,
        id: existing.id,
        ...(existing.type?.id
          ? { type_id: existing.type.id }
          : {
              type: {
                label: "Kuriér",
                description: "Doručenie kuriérom na adresu.",
                code: COURIER_TYPE_CODE,
              },
            }),
      },
    ],
  })
}
