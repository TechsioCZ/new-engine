import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"

import { normalizeRequiredProductAttributeKey } from "../../../utils/product-attributes"
import {
  createProductAttributeDefinitionStep,
  deleteProductAttributeDefinitionsStep,
  restoreProductAttributeDefinitionsStep,
  updateProductAttributeDefinitionStep,
} from "../steps/definition-mutations"
import { permanentlyDeleteProductAttributeDefinitionsStep } from "../steps/permanent-deletion"
import type {
  CreateProductAttributeDefinitionInput,
  ProductAttributeDefinitionIdsInput,
  UpdateProductAttributeDefinitionInput,
} from "../types"

export const createProductAttributeDefinitionWorkflow = createWorkflow(
  "create-product-attribute-definition",
  (input: CreateProductAttributeDefinitionInput) => {
    const lockKey = transform({ input }, ({ input: current }) => [
      `product-attribute-definition-key:${normalizeRequiredProductAttributeKey(current.key)}`,
    ])
    acquireLockStep({ key: lockKey, timeout: 5, ttl: 30 })
    const result = createProductAttributeDefinitionStep(input)
    releaseLockStep({ key: lockKey })
    return new WorkflowResponse(result)
  },
)

export const updateProductAttributeDefinitionWorkflow = createWorkflow(
  "update-product-attribute-definition",
  (input: UpdateProductAttributeDefinitionInput) => {
    const lockKey = transform({ input }, ({ input: current }) => [
      `product-attribute-definition:${current.id}`,
    ])
    acquireLockStep({ key: lockKey, timeout: 5, ttl: 30 })
    const result = updateProductAttributeDefinitionStep(input)
    releaseLockStep({ key: lockKey })
    return new WorkflowResponse(result)
  },
)

export const deleteProductAttributeDefinitionsWorkflow = createWorkflow(
  "delete-product-attribute-definitions",
  (input: ProductAttributeDefinitionIdsInput) => {
    const lockKey = transform({ input }, ({ input: current }) =>
      current.ids.map((id) => `product-attribute-definition:${id}`).sort(),
    )
    acquireLockStep({ key: lockKey, timeout: 5, ttl: 30 })
    const result = deleteProductAttributeDefinitionsStep(input)
    releaseLockStep({ key: lockKey })
    return new WorkflowResponse(result)
  },
)

export const restoreProductAttributeDefinitionsWorkflow = createWorkflow(
  "restore-product-attribute-definitions",
  (input: ProductAttributeDefinitionIdsInput) => {
    const lockKey = transform({ input }, ({ input: current }) =>
      current.ids.map((id) => `product-attribute-definition:${id}`).sort(),
    )
    acquireLockStep({ key: lockKey, timeout: 5, ttl: 30 })
    const result = restoreProductAttributeDefinitionsStep(input)
    releaseLockStep({ key: lockKey })
    return new WorkflowResponse(result)
  },
)

export const permanentlyDeleteProductAttributeDefinitionsWorkflow =
  createWorkflow(
    "permanently-delete-product-attribute-definitions",
    (input: ProductAttributeDefinitionIdsInput) => {
      const lockKey = transform({ input }, ({ input: current }) =>
        current.ids.map((id) => `product-attribute-definition:${id}`).sort(),
      )
      acquireLockStep({ key: lockKey, timeout: 5, ttl: 30 })
      const result = permanentlyDeleteProductAttributeDefinitionsStep(input)
      releaseLockStep({ key: lockKey })
      return new WorkflowResponse(result)
    },
  )
