import type {
  ExecArgs,
  IRegionModuleService,
  Logger,
  Query,
  RegionDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  type SetRegionsPaymentProvidersStepInput,
  setRegionsPaymentProvidersStep,
} from "@medusajs/medusa/core-flows"
import { QR_PAYMENT_MEDUSA_PROVIDER_ID } from "../modules/qr-payment/constants"

type RegionPaymentProviderLink = {
  payment_provider_id: string
  region_id: string
}

const seedQrPaymentRegionsWorkflow = createWorkflow(
  "seed-qr-payment-regions-workflow",
  (input: SetRegionsPaymentProvidersStepInput) => {
    const result = setRegionsPaymentProvidersStep(input)

    return new WorkflowResponse(result)
  }
)

export default async function seedQrPayment({ container }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const regionService = container.resolve<IRegionModuleService>(Modules.REGION)

  logger.info("Starting QR payment region provider seed...")

  const regions = await listAllRegions(regionService)
  if (!regions.length) {
    logger.warn("No regions found. Skipping QR payment provider seed.")
    return
  }

  const existingLinks = await getRegionPaymentProviderLinks(
    query,
    regions.map((region) => region.id)
  )
  const providersByRegion = toRegionPaymentProviderMap(existingLinks)

  await seedQrPaymentRegionsWorkflow(container).run({
    input: {
      input: regions.map((region) => ({
        id: region.id,
        payment_providers: [
          ...new Set([
            ...(providersByRegion.get(region.id) ?? ["pp_system_default"]),
            QR_PAYMENT_MEDUSA_PROVIDER_ID,
          ]),
        ],
      })),
    },
  })

  logger.info(
    `QR payment region provider seed completed with provider: ${QR_PAYMENT_MEDUSA_PROVIDER_ID}`
  )
}

async function listAllRegions(regionService: IRegionModuleService) {
  const regions: RegionDTO[] = []
  const take = 100

  for (let skip = 0; ; skip += take) {
    const page = await regionService.listRegions(
      {},
      {
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

async function getRegionPaymentProviderLinks(
  query: Query,
  regionIds: string[]
) {
  const { data } = await query.graph({
    entity: "region_payment_provider",
    fields: ["region_id", "payment_provider_id"],
    filters: {
      region_id: regionIds,
    },
  })

  if (!isRegionPaymentProviderLinks(data)) {
    throw new Error(
      "QR payment seed region provider query returned invalid row"
    )
  }

  return data
}

function toRegionPaymentProviderMap(links: RegionPaymentProviderLink[]) {
  return links.reduce((map, link) => {
    const providers = map.get(link.region_id) ?? []

    providers.push(link.payment_provider_id)
    map.set(link.region_id, providers)

    return map
  }, new Map<string, string[]>())
}

function isRegionPaymentProviderLinks(
  data: unknown[]
): data is RegionPaymentProviderLink[] {
  return data.every(
    (link) =>
      typeof link === "object" &&
      link !== null &&
      typeof Reflect.get(link, "region_id") === "string" &&
      typeof Reflect.get(link, "payment_provider_id") === "string"
  )
}
