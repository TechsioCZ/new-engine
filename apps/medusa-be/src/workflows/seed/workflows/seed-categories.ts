import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  type CreateProductCategoriesStepInput,
  createProductCategoriesStep,
} from "../steps/create-product-categories"

export type CategoryRaw = {
  title: string
  description?: string
  handle: string
  isActive: boolean
  parentHandle?: string
}

const seedCategoriesWorkflowId = "seed-categories-workflow"
function seedCategoriesWorkflowComposer(input: CategoryRaw[]) {
  const productCategories: CreateProductCategoriesStepInput = transform(
    {
      input,
    },
    (data) =>
      data.input.map((i) => ({
        name: i.title,
        description: i.description,
        handle: i.handle,
        isActive: Boolean(Number(i.isActive)),
        parentHandle: i.parentHandle,
      }))
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
  seedCategoriesWorkflowComposer
)

export default seedCategoriesWorkflow
