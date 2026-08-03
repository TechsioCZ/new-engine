import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import {
  assertProductAttributeKeyAvailable,
  getProductAttributeService,
  normalizeRequiredProductAttributeKey,
  type ProductAttributeDefinitionRecord,
  partitionProductAttributeRecordIds,
  toUsageCountMap,
} from "../../../utils/product-attributes"
import type {
  CreateProductAttributeDefinitionInput,
  ProductAttributeDefinitionIdsInput,
  UpdateProductAttributeDefinitionInput,
} from "../types"

type DefinitionUpdateSnapshot = Pick<
  ProductAttributeDefinitionRecord,
  "id" | "input_type" | "is_public" | "label"
>

const retrieveDefinition = async (
  input: { id: string },
  container: Parameters<typeof getProductAttributeService>[0],
  withDeleted = false
) => {
  const service = getProductAttributeService(container)
  const definitions = (await service.listProductAttributeDefinitions(
    { id: input.id },
    { take: 1, withDeleted }
  )) as ProductAttributeDefinitionRecord[]
  const definition = definitions[0]

  if (!definition) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product Attribute definition "${input.id}" was not found.`
    )
  }

  return definition
}

export const createProductAttributeDefinitionStep = createStep(
  "create-product-attribute-definition",
  async (input: CreateProductAttributeDefinitionInput, { container }) => {
    const service = getProductAttributeService(container)
    const key = normalizeRequiredProductAttributeKey(input.key)
    const matches = (await service.listProductAttributeDefinitions(
      { key },
      { take: 1, withDeleted: true }
    )) as ProductAttributeDefinitionRecord[]
    assertProductAttributeKeyAvailable({
      ...(matches[0] === undefined ? {} : { collision: matches[0] }),
      key,
      kind: "definition",
    })

    const created = (await service.createProductAttributeDefinitions({
      input_type: input.input_type,
      is_public: input.is_public ?? false,
      key,
      label: input.label.trim(),
    })) as ProductAttributeDefinitionRecord

    return new StepResponse(created, created.id)
  },
  async (createdId, { container }) => {
    if (createdId) {
      await getProductAttributeService(
        container
      ).deleteProductAttributeDefinitions(createdId)
    }
  }
)

export const updateProductAttributeDefinitionStep = createStep(
  "update-product-attribute-definition",
  async (input: UpdateProductAttributeDefinitionInput, { container }) => {
    const service = getProductAttributeService(container)
    const previous = await retrieveDefinition(input, container)

    if (input.input_type && input.input_type !== previous.input_type) {
      const [options, assignments] = await Promise.all([
        service.listProductAttributeOptions(
          { definition_id: previous.id },
          { take: 1, withDeleted: true }
        ),
        service.listProductAttributes(
          { definition_id: previous.id },
          { take: 1, withDeleted: true }
        ),
      ])

      if (options.length || assignments.length) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Product Attribute definition "${previous.key}" cannot change input type after options or assignments exist.`
        )
      }
    }

    const snapshot: DefinitionUpdateSnapshot = {
      id: previous.id,
      input_type: previous.input_type,
      is_public: previous.is_public,
      label: previous.label,
    }
    const updated = await service.updateProductAttributeDefinitions({
      id: previous.id,
      ...(input.input_type ? { input_type: input.input_type } : {}),
      ...(input.is_public === undefined ? {} : { is_public: input.is_public }),
      ...(input.label === undefined ? {} : { label: input.label.trim() }),
    })

    return new StepResponse(updated, snapshot)
  },
  async (previous, { container }) => {
    if (previous) {
      await getProductAttributeService(
        container
      ).updateProductAttributeDefinitions(previous)
    }
  }
)

export const deleteProductAttributeDefinitionsStep = createStep(
  "delete-product-attribute-definitions",
  async (input: ProductAttributeDefinitionIdsInput, { container }) => {
    const service = getProductAttributeService(container)
    const definitions = (await service.listProductAttributeDefinitions(
      { id: { $in: input.ids } },
      { take: Math.max(input.ids.length, 1), withDeleted: true }
    )) as ProductAttributeDefinitionRecord[]
    const found = new Set(definitions.map((definition) => definition.id))
    const missing = input.ids.filter((id) => !found.has(id))

    if (missing.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product Attribute definition ids were not found: ${missing.join(", ")}`
      )
    }

    const { active_ids: activeIds } =
      partitionProductAttributeRecordIds(definitions)
    const usageCounts = toUsageCountMap(
      await service.getActiveDefinitionUsageCounts(input.ids)
    )

    if (activeIds.length) {
      await service.softDeleteProductAttributeDefinitions(activeIds)
    }

    return new StepResponse(
      definitions.map((definition) => ({
        ...definition,
        deleted_at: definition.deleted_at ?? new Date(),
        usage_count: usageCounts.get(definition.id) ?? 0,
      })),
      activeIds
    )
  },
  async (deletedIds, { container }) => {
    if (deletedIds?.length) {
      await getProductAttributeService(
        container
      ).restoreProductAttributeDefinitions(deletedIds)
    }
  }
)

export const restoreProductAttributeDefinitionsStep = createStep(
  "restore-product-attribute-definitions",
  async (input: ProductAttributeDefinitionIdsInput, { container }) => {
    const service = getProductAttributeService(container)
    const definitions = (await service.listProductAttributeDefinitions(
      { id: { $in: input.ids } },
      { take: Math.max(input.ids.length, 1), withDeleted: true }
    )) as ProductAttributeDefinitionRecord[]
    const found = new Set(definitions.map((definition) => definition.id))
    const missing = input.ids.filter((id) => !found.has(id))

    if (missing.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product Attribute definition ids were not found: ${missing.join(", ")}`
      )
    }

    const { deleted_ids: deletedIds } =
      partitionProductAttributeRecordIds(definitions)

    if (deletedIds.length) {
      await service.restoreProductAttributeDefinitions(deletedIds)
    }

    return new StepResponse(
      definitions.map((definition) => ({
        ...definition,
        deleted_at: null,
      })),
      deletedIds
    )
  },
  async (restoredIds, { container }) => {
    if (restoredIds?.length) {
      await getProductAttributeService(
        container
      ).softDeleteProductAttributeDefinitions(restoredIds)
    }
  }
)
