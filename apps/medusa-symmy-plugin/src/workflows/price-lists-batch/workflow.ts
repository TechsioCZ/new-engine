import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  listPriceListsStep,
  updatePriceListPricesBatchStep,
  upsertPriceListsBatchStep,
} from "./steps/process-batch"
import type {
  ListPriceListsInput,
  ListPriceListsOutput,
  UpdatePriceListPricesBatchInput,
  UpdatePriceListPricesBatchOutput,
  UpsertPriceListsBatchInput,
  UpsertPriceListsBatchOutput,
} from "./types"

export const upsertPriceListsBatchWorkflow = createWorkflow(
  "symmy-upsert-price-lists-batch-workflow",
  (input: UpsertPriceListsBatchInput) => {
    const result = upsertPriceListsBatchStep(input)
    return new WorkflowResponse<UpsertPriceListsBatchOutput>(result)
  }
)

export const updatePriceListPricesBatchWorkflow = createWorkflow(
  "symmy-update-price-list-prices-batch-workflow",
  (input: UpdatePriceListPricesBatchInput) => {
    const result = updatePriceListPricesBatchStep(input)
    return new WorkflowResponse<UpdatePriceListPricesBatchOutput>(result)
  }
)

export const listPriceListsWorkflow = createWorkflow(
  "symmy-list-price-lists-workflow",
  (input: ListPriceListsInput) => {
    const result = listPriceListsStep(input)
    return new WorkflowResponse<ListPriceListsOutput>(result)
  }
)
