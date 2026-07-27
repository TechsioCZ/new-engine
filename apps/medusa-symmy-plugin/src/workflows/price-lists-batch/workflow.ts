import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  symmyListPriceListsStep,
  symmyUpdatePriceListPricesBatchStep,
  symmyUpsertPriceListsBatchStep,
} from "./steps/process-batch"
import type {
  ListPriceListsInput,
  ListPriceListsOutput,
  UpdatePriceListPricesBatchInput,
  UpdatePriceListPricesBatchOutput,
  UpsertPriceListsBatchInput,
  UpsertPriceListsBatchOutput,
} from "./types"

const symmyUpsertPriceListsBatchWorkflow = createWorkflow(
  "symmy-upsert-price-lists-batch",
  (input: UpsertPriceListsBatchInput) => {
    const result = symmyUpsertPriceListsBatchStep(input)
    return new WorkflowResponse<UpsertPriceListsBatchOutput>(result)
  }
)

const symmyUpdatePriceListPricesBatchWorkflow = createWorkflow(
  "symmy-update-price-list-prices-batch",
  (input: UpdatePriceListPricesBatchInput) => {
    const result = symmyUpdatePriceListPricesBatchStep(input)
    return new WorkflowResponse<UpdatePriceListPricesBatchOutput>(result)
  }
)

const symmyListPriceListsWorkflow = createWorkflow(
  "symmy-list-price-lists",
  (input: ListPriceListsInput) => {
    const result = symmyListPriceListsStep(input)
    return new WorkflowResponse<ListPriceListsOutput>(result)
  }
)

export {
  symmyListPriceListsWorkflow as listPriceListsWorkflow,
  symmyUpdatePriceListPricesBatchWorkflow as updatePriceListPricesBatchWorkflow,
  symmyUpsertPriceListsBatchWorkflow as upsertPriceListsBatchWorkflow,
}
