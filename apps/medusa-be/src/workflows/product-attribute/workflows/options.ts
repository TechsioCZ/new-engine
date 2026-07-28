import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import { normalizeRequiredProductAttributeKey } from "../../../utils/product-attributes"
import {
  createProductAttributeOptionStep,
  deleteProductAttributeOptionsStep,
  restoreProductAttributeOptionsStep,
  updateProductAttributeOptionStep,
} from "../steps/option-mutations"
import type {
  CreateProductAttributeOptionInput,
  ProductAttributeOptionIdsInput,
  UpdateProductAttributeOptionInput,
} from "../types"

export const createProductAttributeOptionWorkflow = createWorkflow(
  "create-product-attribute-option",
  (input: CreateProductAttributeOptionInput) => {
    const lockKey = transform({ input }, ({ input: current }) => [
      `product-attribute-definition:${current.definition_id}`,
      `product-attribute-option-key:${current.definition_id}:${normalizeRequiredProductAttributeKey(current.key, "option key")}`,
    ])
    acquireLockStep({ key: lockKey, timeout: 5, ttl: 30 })
    const result = createProductAttributeOptionStep(input)
    releaseLockStep({ key: lockKey })
    return new WorkflowResponse(result)
  }
)

export const updateProductAttributeOptionWorkflow = createWorkflow(
  "update-product-attribute-option",
  (input: UpdateProductAttributeOptionInput) => {
    const lockKey = transform({ input }, ({ input: current }) => [
      `product-attribute-option:${current.id}`,
    ])
    acquireLockStep({ key: lockKey, timeout: 5, ttl: 30 })
    const result = updateProductAttributeOptionStep(input)
    releaseLockStep({ key: lockKey })
    return new WorkflowResponse(result)
  }
)

export const deleteProductAttributeOptionsWorkflow = createWorkflow(
  "delete-product-attribute-options",
  (input: ProductAttributeOptionIdsInput) => {
    const lockKey = transform({ input }, ({ input: current }) =>
      current.ids.map((id) => `product-attribute-option:${id}`).sort()
    )
    acquireLockStep({ key: lockKey, timeout: 5, ttl: 30 })
    const result = deleteProductAttributeOptionsStep(input)
    releaseLockStep({ key: lockKey })
    return new WorkflowResponse(result)
  }
)

export const restoreProductAttributeOptionsWorkflow = createWorkflow(
  "restore-product-attribute-options",
  (input: ProductAttributeOptionIdsInput) => {
    const lockKey = transform({ input }, ({ input: current }) =>
      current.ids.map((id) => `product-attribute-option:${id}`).sort()
    )
    acquireLockStep({ key: lockKey, timeout: 5, ttl: 30 })
    const result = restoreProductAttributeOptionsStep(input)
    releaseLockStep({ key: lockKey })
    return new WorkflowResponse(result)
  }
)
