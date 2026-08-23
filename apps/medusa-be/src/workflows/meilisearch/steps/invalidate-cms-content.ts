import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  type CmsSearchChange,
  reconcileContentSearchChange,
} from "../../../modules/meilisearch/content-events"
import { PAYLOAD_MODULE } from "../../../modules/payload"
import type PayloadModuleService from "../../../modules/payload/service"

export type InvalidateCmsContentStepInput = CmsSearchChange & {
  doc?: Record<string, unknown> & {
    id?: string | number
    locale?: string
    slug?: string
  }
}

export const invalidateCmsContentStep = createStep(
  "invalidate-cms-content",
  async (input: InvalidateCmsContentStepInput, { container }) => {
    const cmsService = container.resolve<PayloadModuleService>(PAYLOAD_MODULE)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

    await cmsService.invalidateCache(
      input.collection,
      input.doc?.slug,
      input.doc?.locale,
      input.doc?.id
    )
    await reconcileContentSearchChange(input, logger, container)

    return new StepResponse({ success: true })
  }
)
