import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { buildProductContentMetadata } from "../../../utils/product-content"
import { upsertProductContentStep } from "../steps/upsert-product-content"
import type { UpdateProductContentInput } from "../types"

export const updateProductContentWorkflow = createWorkflow(
  "update-product-content",
  (input: UpdateProductContentInput) => {
    const contentInput = transform({ input }, ({ input: current }) => ({
      ...current.content,
      product_id: current.product_id,
    }))
    const productInput = transform({ input }, ({ input: current }) => ({
      products: [
        {
          description: current.description,
          id: current.product_id,
          metadata: buildProductContentMetadata(
            current.metadata,
            current.description ?? "",
            current.content,
            { exposeSourceOnlyMetadata: true }
          ),
        },
      ],
    }))

    const productContent = upsertProductContentStep(contentInput)
    const products = updateProductsWorkflow.runAsStep({ input: productInput })
    const result = transform(
      { productContent, products },
      ({ productContent: content, products: updatedProducts }) => ({
        product: updatedProducts[0],
        product_content: content,
      })
    )

    return new WorkflowResponse(result)
  }
)
