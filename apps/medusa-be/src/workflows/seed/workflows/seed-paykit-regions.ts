import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  type SetRegionsPaymentProvidersStepInput,
  setRegionsPaymentProvidersStep,
} from "@medusajs/medusa/core-flows"
import { withPaykitPaymentProviders } from "../paykit-payment-providers"
import {
  type CreateMissingPaykitRegionsStepInput,
  createMissingPaykitRegionsStep,
} from "../steps/create-missing-paykit-regions"

const SeedPaykitRegionsWorkflowId = "seed-paykit-regions-workflow"

type SeedPaykitRegionInput = Omit<
  CreateMissingPaykitRegionsStepInput[number],
  "paymentProviders"
> & {
  id?: string
  paymentProviders?: string[]
}

export type SeedPaykitRegionsWorkflowInput = {
  regions: SeedPaykitRegionInput[]
  paymentProviderIds: string[]
}

const seedPaykitRegionsWorkflow = createWorkflow(
  SeedPaykitRegionsWorkflowId,
  (input: SeedPaykitRegionsWorkflowInput) => {
    const regionsWithPaykitProviders = transform({ input }, (data) =>
      withPaykitPaymentProviders(
        data.input.regions,
        data.input.paymentProviderIds
      )
    )

    const missingRegions = transform({ regionsWithPaykitProviders }, (data) =>
      data.regionsWithPaykitProviders.filter(
        (region): region is CreateMissingPaykitRegionsStepInput[number] =>
          !region.id
      )
    )

    const existingRegionPaymentProvidersInput = transform(
      { regionsWithPaykitProviders },
      (data): SetRegionsPaymentProvidersStepInput => ({
        input: data.regionsWithPaykitProviders.flatMap((region) =>
          region.id
            ? [
                {
                  id: region.id,
                  payment_providers: region.paymentProviders,
                },
              ]
            : []
        ),
      })
    )

    const createMissingPaykitRegionsResult =
      createMissingPaykitRegionsStep(missingRegions)

    const setExistingRegionPaymentProvidersResult =
      setRegionsPaymentProvidersStep(existingRegionPaymentProvidersInput)

    return new WorkflowResponse({
      createMissingPaykitRegionsResult,
      setExistingRegionPaymentProvidersResult,
    })
  }
)

export default seedPaykitRegionsWorkflow
