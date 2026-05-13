import type {
  ExecArgs,
  IPaymentModuleService,
  IRegionModuleService,
  Logger,
  RegionDTO,
  RemoteQueryFunction,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  LINKS,
  Modules,
} from "@medusajs/framework/utils"
import { PAYKIT_REGION_PAYMENT_PROVIDER_IDS } from "../workflows/seed/paykit-payment-providers"
import seedPaykitRegionsWorkflow, {
  type SeedPaykitRegionsWorkflowInput,
} from "../workflows/seed/workflows/seed-paykit-regions"

type RegionPaymentProviderLink = {
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
    name: "Czechia",
    currencyCode: "czk",
    countries: ["cz"],
  },
  {
    name: "Europe",
    currencyCode: "eur",
    countries: countries.filter((country) => country !== "cz"),
  },
]

const getEnabledPaykitPaymentProviderIds = async (
  paymentService: IPaymentModuleService
) => {
  const paymentProviders = await paymentService.listPaymentProviders({
    id: { $in: [...PAYKIT_REGION_PAYMENT_PROVIDER_IDS] },
    is_enabled: true,
  })

  const providerIds = paymentProviders.map((provider) => provider.id)

  return PAYKIT_REGION_PAYMENT_PROVIDER_IDS.filter((providerId) =>
    providerIds.includes(providerId)
  )
}

const getRegionPaymentProviderLinks = async (
  remoteQuery: RemoteQueryFunction,
  regionIds: string[]
): Promise<RegionPaymentProviderLink[]> => {
  if (!regionIds.length) {
    return []
  }

  const query = {
    service: LINKS.RegionPaymentProvider,
    variables: {
      filters: {
        region_id: regionIds,
      },
    },
    fields: ["region_id", "payment_provider_id"],
  } as Parameters<RemoteQueryFunction>[0]

  const result = await remoteQuery(query)

  if (!Array.isArray(result)) {
    throw new Error("PayKit region payment provider query returned non-array")
  }

  return result.flatMap((link) => {
    if (
      typeof link?.region_id === "string" &&
      typeof link.payment_provider_id === "string"
    ) {
      return [link]
    }

    throw new Error("PayKit region payment provider query returned invalid row")
  })
}

const listAllRegions = async (
  regionService: IRegionModuleService
): Promise<RegionDTO[]> => {
  const take = 100
  const regions: RegionDTO[] = []

  for (let skip = 0; ; skip += take) {
    const page = await regionService.listRegions(
      {},
      {
        relations: ["countries"],
        skip,
        take,
      }
    )

    regions.push(...page)

    if (page.length < take) {
      return regions
    }
  }
}

const toRegionPaymentProviderMap = (
  paymentProviderLinks: RegionPaymentProviderLink[]
) =>
  paymentProviderLinks.reduce((map, link) => {
    const regionPaymentProviders = map.get(link.region_id) ?? []

    regionPaymentProviders.push(link.payment_provider_id)
    map.set(link.region_id, regionPaymentProviders)

    return map
  }, new Map<string, string[]>())

const toRegionSeedInput = (
  region: RegionDTO,
  paymentProviderMap: Map<string, string[]>
): SeedPaykitRegionsWorkflowInput["regions"][number] => ({
  id: region.id,
  name: region.name,
  currencyCode: region.currency_code,
  countries: region.countries?.map((country) => country.iso_2),
  paymentProviders: paymentProviderMap.get(region.id),
})

export default async function seedPaykit({ container }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const paymentService = container.resolve<IPaymentModuleService>(
    Modules.PAYMENT
  )
  const regionService = container.resolve<IRegionModuleService>(Modules.REGION)
  const remoteQuery = container.resolve<RemoteQueryFunction>(
    ContainerRegistrationKeys.REMOTE_QUERY
  )

  logger.info("Starting PayKit region payment provider seed...")

  const paymentProviderIds =
    await getEnabledPaykitPaymentProviderIds(paymentService)

  if (!paymentProviderIds.length) {
    logger.warn("No enabled PayKit payment providers found. Skipping seed.")
    return
  }

  const existingRegions = await listAllRegions(regionService)

  const paymentProviderLinks = await getRegionPaymentProviderLinks(
    remoteQuery,
    existingRegions.map((region) => region.id)
  )
  const paymentProviderMap = toRegionPaymentProviderMap(paymentProviderLinks)

  const regions = existingRegions.length
    ? existingRegions.map((region) =>
        toRegionSeedInput(region, paymentProviderMap)
      )
    : defaultRegions

  const input: SeedPaykitRegionsWorkflowInput = {
    regions,
    paymentProviderIds,
  }

  await seedPaykitRegionsWorkflow(container).run({ input })

  logger.info(
    `PayKit region seed completed with providers: ${paymentProviderIds.join(
      ", "
    )}`
  )
}
