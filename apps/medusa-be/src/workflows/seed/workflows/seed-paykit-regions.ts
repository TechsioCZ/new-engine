import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { setRegionsPaymentProvidersStep } from "@medusajs/medusa/core-flows"
import type { SetRegionsPaymentProvidersStepInput } from "@medusajs/medusa/core-flows"

import { withPaykitPaymentProviders } from "../paykit-payment-providers"
import { createMissingPaykitRegionsStep } from "../steps/create-missing-paykit-regions"
import type { CreateMissingPaykitRegionsStepInput } from "../steps/create-missing-paykit-regions"
import { syncExistingPaykitRegionsStep } from "../steps/sync-existing-paykit-regions"
import type { SyncExistingPaykitRegionsStepInput } from "../steps/sync-existing-paykit-regions"

const SeedPaykitRegionsWorkflowId = "seed-paykit-regions-workflow"

type SeedPaykitRegionInput = Omit<
  CreateMissingPaykitRegionsStepInput[number],
  "paymentProviders"
> & {
  id?: string
  paymentProviders?: string[]
}

export interface SeedPaykitRegionsWorkflowInput {
  regions: SeedPaykitRegionInput[]
  paymentProviderIds: string[]
}

const seedPaykitRegionsWorkflowComposer = (
  input: SeedPaykitRegionsWorkflowInput,
) => {
  const regionsWithPaykitProviders = transform({ input }, (data) =>
    withPaykitPaymentProviders(
      data.input.regions,
      data.input.paymentProviderIds,
    ),
  )

  const missingRegions = transform({ regionsWithPaykitProviders }, (data) =>
    data.regionsWithPaykitProviders.filter(
      (region): region is CreateMissingPaykitRegionsStepInput[number] =>
        region.id === undefined || region.id.length === 0,
    ),
  )

  const existingRegionPaymentProvidersInput = transform(
    { regionsWithPaykitProviders },
    (data): SetRegionsPaymentProvidersStepInput => ({
      input: data.regionsWithPaykitProviders.flatMap((region) =>
        region.id !== undefined && region.id.length > 0
          ? [
              {
                id: region.id,
                payment_providers: region.paymentProviders,
              },
            ]
          : [],
      ),
    }),
  )

  const existingRegionsInput = transform(
    { regionsWithPaykitProviders },
    (data): SyncExistingPaykitRegionsStepInput =>
      data.regionsWithPaykitProviders.flatMap((region) =>
        region.id !== undefined && region.id.length > 0
          ? [
              {
                currencyCode: region.currencyCode,
                id: region.id,
              },
            ]
          : [],
      ),
  )

  const createMissingPaykitRegionsResult =
    createMissingPaykitRegionsStep(missingRegions)

  const syncExistingPaykitRegionsResult =
    syncExistingPaykitRegionsStep(existingRegionsInput)

  const setExistingRegionPaymentProvidersResult =
    setRegionsPaymentProvidersStep(existingRegionPaymentProvidersInput)

  return new WorkflowResponse({
    createMissingPaykitRegionsResult,
    setExistingRegionPaymentProvidersResult,
    syncExistingPaykitRegionsResult,
  })
}

const seedPaykitRegionsWorkflow = createWorkflow(
  SeedPaykitRegionsWorkflowId,
  seedPaykitRegionsWorkflowComposer,
)

export default seedPaykitRegionsWorkflow
