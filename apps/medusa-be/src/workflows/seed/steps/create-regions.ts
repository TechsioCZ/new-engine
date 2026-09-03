import type {
  IRegionModuleService,
  Logger,
  SalesChannelDTO,
  WorkflowTypes,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  createRegionsWorkflow,
  updateRegionsWorkflow,
} from "@medusajs/medusa/core-flows"

const EXACT_MARKET_CODE_PATTERN = /^[a-z]{2}$/

export type CreateRegionsStepInput = {
  name: string
  currencyCode: string
  countries?: string[]
  paymentProviders?: string[]
  isTaxInclusive?: boolean
  marketCode?: string
  salesChannelName?: string
}[]

type ResolvedCreateRegionsStepInput = Array<
  Omit<CreateRegionsStepInput[number], "marketCode" | "salesChannelName"> & {
    metadata?: Record<string, unknown>
  }
>

export type ResolveRegionSalesChannelBindingsStepInput = {
  regions: CreateRegionsStepInput
  salesChannels: Pick<SalesChannelDTO, "id" | "name">[]
}

function resolveConfiguredRegionMarketBinding({
  marketCode,
  name,
  salesChannelName,
}: Pick<
  CreateRegionsStepInput[number],
  "marketCode" | "name" | "salesChannelName"
>): { marketCode: string; salesChannelName: string } | undefined {
  const hasMarketCode = marketCode !== undefined
  const hasSalesChannelName = salesChannelName !== undefined
  if (!(hasMarketCode || hasSalesChannelName)) {
    return
  }
  if (!(hasMarketCode && hasSalesChannelName)) {
    throw new Error(
      `Seed region "${name}" must define both marketCode and salesChannelName`
    )
  }

  const exactMarketCode = marketCode?.trim() ?? ""
  const exactSalesChannelName = salesChannelName?.trim() ?? ""
  if (
    exactMarketCode !== marketCode ||
    exactMarketCode !== exactMarketCode.toLowerCase() ||
    !EXACT_MARKET_CODE_PATTERN.test(exactMarketCode) ||
    exactSalesChannelName !== salesChannelName ||
    !exactSalesChannelName
  ) {
    throw new Error(`Seed region "${name}" has an invalid exact market binding`)
  }

  return {
    marketCode: exactMarketCode,
    salesChannelName: exactSalesChannelName,
  }
}

export function resolveRegionSalesChannelBindings({
  regions,
  salesChannels,
}: ResolveRegionSalesChannelBindingsStepInput): ResolvedCreateRegionsStepInput {
  const claimedMarkets = new Set<string>()
  const claimedSalesChannelIds = new Set<string>()

  return regions.map(({ marketCode, salesChannelName, ...region }) => {
    const binding = resolveConfiguredRegionMarketBinding({
      marketCode,
      name: region.name,
      salesChannelName,
    })
    if (!binding) {
      return region
    }

    const matchingSalesChannels = salesChannels.filter(
      ({ name }) => name === binding.salesChannelName
    )
    if (matchingSalesChannels.length !== 1) {
      throw new Error(
        `Seed region "${region.name}" must resolve exactly one Sales Channel named "${binding.salesChannelName}"`
      )
    }

    const salesChannelId = matchingSalesChannels[0]?.id
    if (
      !salesChannelId ||
      claimedMarkets.has(binding.marketCode) ||
      claimedSalesChannelIds.has(salesChannelId)
    ) {
      throw new Error(
        `Seed region "${region.name}" has a duplicate market or Sales Channel binding`
      )
    }
    claimedMarkets.add(binding.marketCode)
    claimedSalesChannelIds.add(salesChannelId)

    return {
      ...region,
      metadata: {
        market_code: binding.marketCode,
        sales_channel_id: salesChannelId,
      },
    }
  })
}

export const resolveRegionSalesChannelBindingsStep = createStep(
  "resolve-region-sales-channel-bindings",
  async (input: ResolveRegionSalesChannelBindingsStepInput) =>
    new StepResponse(resolveRegionSalesChannelBindings(input))
)

const CreateRegionsStepId = "create-regions-seed-step"
export const createRegionsStep = createStep(
  CreateRegionsStepId,
  async (input: ResolvedCreateRegionsStepInput, { container }) => {
    const result: WorkflowTypes.RegionWorkflow.CreateRegionsWorkflowOutput = []

    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const regionService = container.resolve<IRegionModuleService>(
      Modules.REGION
    )

    const regionNames = input.map((i) => i.name)

    const existingRegions = await regionService.listRegions({
      name: { $in: regionNames },
    })

    const missingRegions = input.filter(
      (i) => !existingRegions.find((j) => j.name === i.name)
    )
    const updateRegions = input.flatMap((inputRegion) => {
      const existingRegion = existingRegions.find(
        (existing) => existing.name === inputRegion.name
      )
      if (existingRegion) {
        return [
          {
            ...existingRegion,
            currency_code: inputRegion.currencyCode,
            countries: inputRegion.countries,
            payment_providers: inputRegion.paymentProviders,
            is_tax_inclusive: inputRegion.isTaxInclusive ?? true,
            ...(inputRegion.metadata
              ? {
                  metadata: {
                    ...(existingRegion.metadata ?? {}),
                    ...inputRegion.metadata,
                  },
                }
              : {}),
          },
        ]
      }
      return []
    })

    if (missingRegions.length !== 0) {
      logger.info("Creating missing region data...")

      const { result: createRegionsResult } = await createRegionsWorkflow(
        container
      ).run({
        input: {
          regions: missingRegions.map((i) => ({
            name: i.name,
            currency_code: i.currencyCode,
            countries: i.countries,
            payment_providers: i.paymentProviders ?? ["pp_system_default"],
            is_tax_inclusive: i.isTaxInclusive ?? true,
            metadata: i.metadata,
          })),
        },
      })

      result.push(...createRegionsResult)
    }

    if (updateRegions.length !== 0) {
      logger.info("Updating existing region data...")

      const toUpdate = updateRegions.map((i) => ({
        selector: { name: i.name },
        update: {
          currency_code: i.currency_code,
          countries: i.countries,
          payment_providers: i.payment_providers ?? ["pp_system_default"],
          is_tax_inclusive: i.is_tax_inclusive,
          ...(i.metadata ? { metadata: i.metadata } : {}),
        },
      }))

      for (const regionToUpdate of toUpdate) {
        const { result: updateResult } = await updateRegionsWorkflow(
          container
        ).run({
          input: regionToUpdate,
        })

        result.push(...updateResult)
      }
    }

    return new StepResponse({
      result,
    })
  }
)
