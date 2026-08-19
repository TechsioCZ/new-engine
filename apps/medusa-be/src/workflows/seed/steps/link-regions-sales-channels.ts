import type { WorkflowTypes } from "@medusajs/framework/types"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

export type LinkRegionsSalesChannelsStepInput = {
  regions: Array<{
    id: string
    marketCode: string
    metadata?: Record<string, unknown> | null
    salesChannelId: string
    storefrontNamespace: string
  }>
}

const LinkRegionsSalesChannelsStepId = "link-regions-sales-channels-seed-step"

export const linkRegionsSalesChannelsStep = createStep(
  LinkRegionsSalesChannelsStepId,
  async (input: LinkRegionsSalesChannelsStepInput, { container }) => {
    const result: WorkflowTypes.RegionWorkflow.UpdateRegionsWorkflowOutput = []

    for (const region of input.regions) {
      const { result: updateResult } = await updateRegionsWorkflow(
        container
      ).run({
        input: {
          selector: { id: region.id },
          update: {
            metadata: {
              ...(region.metadata ?? {}),
              storefront_market_code: region.marketCode,
              storefront_sales_channel_id: region.salesChannelId,
              storefront_shop_namespace: region.storefrontNamespace,
            },
          },
        },
      })

      result.push(...updateResult)
    }

    return new StepResponse({ result })
  }
)
