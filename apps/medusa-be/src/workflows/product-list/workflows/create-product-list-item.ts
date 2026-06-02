import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createProductListItemStep } from "../steps/create-product-list-item"
import type { CreateProductListItemWorkflowInput } from "../types"

export const createProductListItemWorkflow = createWorkflow(
  "create-product-list-item-workflow",
  (input: CreateProductListItemWorkflowInput) =>
    new WorkflowResponse(createProductListItemStep(input))
)
