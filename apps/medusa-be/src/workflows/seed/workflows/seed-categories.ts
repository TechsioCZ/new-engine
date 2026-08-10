import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { createProductCategoriesStep } from "../steps/create-product-categories"
import type { CreateProductCategoriesStepInput } from "../steps/create-product-categories"

export interface CategoryRaw {
  title: string
  description?: string | undefined
  handle: string
  isActive: boolean
  parentHandle?: string | undefined
}

const seedCategoriesWorkflowId = "seed-categories-workflow"
const seedCategoriesWorkflowComposer = (input: CategoryRaw[]) => {
  const productCategories: CreateProductCategoriesStepInput = transform(
    {
      input,
    },
    (data) =>
      data.input.map((i) => ({
        name: i.title,
        ...(i.description !== undefined && i.description.length > 0
          ? { description: i.description }
          : {}),
        handle: i.handle,
        isActive: Boolean(Number(i.isActive)),
        ...(i.parentHandle !== undefined && i.parentHandle.length > 0
          ? { parentHandle: i.parentHandle }
          : {}),
      })),
  )

  createProductCategoriesStep(productCategories)

  return new WorkflowResponse({
    result: {
      message: "Categories seeded successfully",
    },
  })
}

const seedCategoriesWorkflow = createWorkflow(
  seedCategoriesWorkflowId,
  seedCategoriesWorkflowComposer,
)

export default seedCategoriesWorkflow
