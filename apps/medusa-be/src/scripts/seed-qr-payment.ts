import type {
  ExecArgs,
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
import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { setRegionsPaymentProvidersStep } from "@medusajs/medusa/core-flows"
import type { SetRegionsPaymentProvidersStepInput } from "@medusajs/medusa/core-flows"

import { QR_PAYMENT_MEDUSA_PROVIDER_ID } from "../modules/payment-qr/constants"
import { SYSTEM_DEFAULT_PAYMENT_PROVIDER_ID } from "../workflows/seed/constants"

interface RegionPaymentProviderLink {
  payment_provider_id: string
  region_id: string
}

const REGION_PAGE_SIZE = 100

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isRegionPaymentProviderLink = (
  link: unknown,
): link is RegionPaymentProviderLink => {
  if (!isRecord(link)) {
    return false
  }

  const { payment_provider_id: paymentProviderId, region_id: regionId } = link
  return typeof regionId === "string" && typeof paymentProviderId === "string"
}

const isRegionPaymentProviderLinks = (
  data: unknown,
): data is RegionPaymentProviderLink[] =>
  Array.isArray(data) && data.every(isRegionPaymentProviderLink)

const toRegionPaymentProviderMap = (links: RegionPaymentProviderLink[]) => {
  const providersByRegion = new Map<string, string[]>()
  for (const link of links) {
    const providers = providersByRegion.get(link.region_id) ?? []
    providers.push(link.payment_provider_id)
    providersByRegion.set(link.region_id, providers)
  }
  return providersByRegion
}

const getRegionPaymentProviderLinks = async (
  query: Query,
  regionIds: string[],
) => {
  const result: unknown = await query.graph({
    entity: "region_payment_provider",
    fields: ["region_id", "payment_provider_id"],
    filters: {
      region_id: regionIds,
    },
  })
  const data: unknown = isRecord(result) ? result["data"] : undefined
  if (!isRegionPaymentProviderLinks(data)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "QR payment seed region provider query returned invalid row",
    )
  }

  return data
}

const listAllRegions = async (regionService: IRegionModuleService) => {
  const regions: RegionDTO[] = []

  const loadPage = async function loadPage(skip: number): Promise<void> {
    const page = await regionService.listRegions(
      {},
      {
        skip,
        take: REGION_PAGE_SIZE,
      },
    )
    regions.push(...page)
    if (page.length < REGION_PAGE_SIZE) {
      return
    }

    await loadPage(skip + REGION_PAGE_SIZE)
  }

  await loadPage(0)
  return regions
}

const seedQrPaymentRegionsWorkflow = createWorkflow(
  "seed-qr-payment-regions",
  (input: SetRegionsPaymentProvidersStepInput) => {
    const result = setRegionsPaymentProvidersStep(input)
    return new WorkflowResponse(result)
  },
)

const seedQrPayment = async ({ container }: ExecArgs) => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const regionService = container.resolve<IRegionModuleService>(Modules.REGION)

  logger.info("Starting QR payment region provider seed...")

  const regions = await listAllRegions(regionService)
  if (regions.length === 0) {
    logger.warn("No regions found. Skipping QR payment provider seed.")
    return
  }

  const existingLinks = await getRegionPaymentProviderLinks(
    query,
    regions.map((region) => region.id),
  )
  const providersByRegion = toRegionPaymentProviderMap(existingLinks)

  await seedQrPaymentRegionsWorkflow(container).run({
    input: {
      input: regions.map((region) => ({
        id: region.id,
        payment_providers: [
          ...new Set([
            ...(providersByRegion.get(region.id) ?? [
              SYSTEM_DEFAULT_PAYMENT_PROVIDER_ID,
            ]),
            QR_PAYMENT_MEDUSA_PROVIDER_ID,
          ]),
        ],
      })),
    },
  })

  logger.info(
    `QR payment region provider seed completed with provider: ${QR_PAYMENT_MEDUSA_PROVIDER_ID}`,
  )
}

export default seedQrPayment
