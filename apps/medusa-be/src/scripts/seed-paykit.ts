import type {
  ExecArgs,
  IPaymentModuleService,
  IRegionModuleService,
  Logger,
  Query,
  RegionDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import { PAYKIT_REGION_PAYMENT_PROVIDER_IDS } from "../workflows/seed/paykit-payment-providers"
import seedPaykitRegionsWorkflow from "../workflows/seed/workflows/seed-paykit-regions"
import type { SeedPaykitRegionsWorkflowInput } from "../workflows/seed/workflows/seed-paykit-regions"

interface RegionPaymentProviderLink {
  region_id: string
  payment_provider_id: string
}

const countries = [
  "cz",
  "gb",
  "de",
  "dk",
  "se",
  "fr",
  "es",
  "it",
  "pl",
  "at",
  "sk",
]

const defaultRegions: SeedPaykitRegionsWorkflowInput["regions"] = [
  {
    countries: ["cz"],
    currencyCode: "czk",
    name: "Czechia",
  },
  {
    countries: countries.filter((country) => country !== "cz"),
    currencyCode: "eur",
    name: "Europe",
  },
]

const getEnabledPaykitPaymentProviderIds = async (
  paymentService: IPaymentModuleService,
) => {
  const paymentProviders = await paymentService.listPaymentProviders({
    id: { $in: [...PAYKIT_REGION_PAYMENT_PROVIDER_IDS] },
    is_enabled: true,
  })

  const providerIds = new Set(paymentProviders.map((provider) => provider.id))

  return PAYKIT_REGION_PAYMENT_PROVIDER_IDS.filter((providerId) =>
    providerIds.has(providerId),
  )
}

const getRegionPaymentProviderLinks = async (
  query: Query,
  regionIds: string[],
): Promise<RegionPaymentProviderLink[]> => {
  if (!regionIds.length) {
    return []
  }

  const { data } = await query.graph({
    entity: "region_payment_provider",
    fields: ["region_id", "payment_provider_id"],
    filters: {
      region_id: regionIds,
    },
  })

  const rows: unknown = data
  if (!Array.isArray(rows)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PayKit region payment provider query returned invalid data",
    )
  }

  return rows.map((row) => {
    if (!isRecord(row)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayKit region payment provider query returned invalid row",
      )
    }

    const regionId = row["region_id"]
    const paymentProviderId = row["payment_provider_id"]
    if (typeof regionId !== "string" || typeof paymentProviderId !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayKit region payment provider query returned invalid row",
      )
    }

    return {
      payment_provider_id: paymentProviderId,
      region_id: regionId,
    }
  })
}

const REGION_PAGE_SIZE = 100
const MAX_REGION_COUNT = 10_000

const listRegionPages = async (
  regionService: IRegionModuleService,
  regions: RegionDTO[],
  skip: number,
): Promise<RegionDTO[]> => {
  if (skip >= MAX_REGION_COUNT) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `PayKit region seed exceeded the ${MAX_REGION_COUNT} region safety limit`,
    )
  }

  const page = await regionService.listRegions(
    {},
    {
      relations: ["countries"],
      skip,
      take: REGION_PAGE_SIZE,
    },
  )
  regions.push(...page)

  if (page.length < REGION_PAGE_SIZE) {
    return regions
  }

  return await listRegionPages(regionService, regions, skip + REGION_PAGE_SIZE)
}

const listAllRegions = async (
  regionService: IRegionModuleService,
): Promise<RegionDTO[]> => await listRegionPages(regionService, [], 0)

const toRegionPaymentProviderMap = (
  paymentProviderLinks: RegionPaymentProviderLink[],
) => {
  const map = new Map<string, string[]>()

  for (const link of paymentProviderLinks) {
    const regionPaymentProviders = map.get(link.region_id) ?? []

    regionPaymentProviders.push(link.payment_provider_id)
    map.set(link.region_id, regionPaymentProviders)
  }

  return map
}

const toRegionSeedInput = (
  region: RegionDTO,
  paymentProviderMap: Map<string, string[]>,
): SeedPaykitRegionsWorkflowInput["regions"][number] => {
  const defaultRegion = defaultRegions.find(
    (seedRegion) => seedRegion.name === region.name,
  )
  const trimmedCurrency = region.currency_code?.trim()
  const currencyCode =
    trimmedCurrency === undefined || trimmedCurrency === ""
      ? defaultRegion?.currencyCode
      : trimmedCurrency

  if (currencyCode === undefined || currencyCode === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `PayKit seed cannot sync region "${region.name}" (${region.id}) because currency_code is missing`,
    )
  }

  const paymentProviders = paymentProviderMap.get(region.id)

  return {
    countries: region.countries?.map((country) => country.iso_2),
    currencyCode,
    id: region.id,
    name: region.name,
    ...(paymentProviders === undefined ? {} : { paymentProviders }),
  }
}

export default async function seedPaykit({ container }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const paymentService = container.resolve<IPaymentModuleService>(
    Modules.PAYMENT,
  )
  const regionService = container.resolve<IRegionModuleService>(Modules.REGION)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

  logger.info("Starting PayKit region payment provider seed...")

  const paymentProviderIds =
    await getEnabledPaykitPaymentProviderIds(paymentService)

  if (!paymentProviderIds.length) {
    logger.warn("No enabled PayKit payment providers found. Skipping seed.")
    return
  }

  const existingRegions = await listAllRegions(regionService)

  const paymentProviderLinks = await getRegionPaymentProviderLinks(
    query,
    existingRegions.map((region) => region.id),
  )
  const paymentProviderMap = toRegionPaymentProviderMap(paymentProviderLinks)

  const regions = existingRegions.length
    ? existingRegions.map((region) =>
        toRegionSeedInput(region, paymentProviderMap),
      )
    : defaultRegions

  const input: SeedPaykitRegionsWorkflowInput = {
    paymentProviderIds,
    regions,
  }

  await seedPaykitRegionsWorkflow(container).run({ input })

  logger.info(
    `PayKit region seed completed with providers: ${paymentProviderIds.join(
      ", ",
    )}`,
  )
}
