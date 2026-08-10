import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import {
  assertProductAttributeKeyAvailable,
  getProductAttributeService,
  normalizeRequiredProductAttributeKey,
  partitionProductAttributeRecordIds,
  toUsageCountMap,
} from "../../../utils/product-attributes"
import type {
  CreateProductAttributeOptionInput,
  ProductAttributeOptionIdsInput,
  UpdateProductAttributeOptionInput,
} from "../types"

const retrieveOption = async (
  id: string,
  container: Parameters<typeof getProductAttributeService>[0],
  withDeleted = false,
) => {
  const service = getProductAttributeService(container)
  const options = await service.listProductAttributeOptions(
    { id },
    { take: 1, withDeleted },
  )
  const [option] = options

  if (option === undefined) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product Attribute option "${id}" was not found.`,
    )
  }

  return option
}

export const createProductAttributeOptionStep = createStep(
  "create-product-attribute-option",
  async (input: CreateProductAttributeOptionInput, { container }) => {
    const service = getProductAttributeService(container)
    const definitions = await service.listProductAttributeDefinitions(
      { id: input.definition_id },
      { take: 1 },
    )
    const [definition] = definitions

    if (definition === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product Attribute definition "${input.definition_id}" was not found.`,
      )
    }
    if (definition.input_type !== "select") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Options can only be added to select definition "${definition.key}".`,
      )
    }

    const key = normalizeRequiredProductAttributeKey(input.key, "option key")
    const matches = await service.listProductAttributeOptions(
      { definition_id: definition.id, key },
      { take: 1, withDeleted: true },
    )
    assertProductAttributeKeyAvailable({
      ...(matches[0] === undefined ? {} : { collision: matches[0] }),
      definitionKey: definition.key,
      key,
      kind: "option",
    })

    const created = await service.createProductAttributeOptions({
      definition_id: definition.id,
      key,
      label: input.label.trim(),
    })

    return new StepResponse(created, created.id)
  },
  async (createdId, { container }) => {
    if (createdId !== undefined && createdId.length > 0) {
      await getProductAttributeService(container).deleteProductAttributeOptions(
        createdId,
      )
    }
  },
)

export const updateProductAttributeOptionStep = createStep(
  "update-product-attribute-option",
  async (input: UpdateProductAttributeOptionInput, { container }) => {
    const service = getProductAttributeService(container)
    const previous = await retrieveOption(input.id, container)
    const snapshot = {
      id: previous.id,
      label: previous.label,
    }
    const updated = await service.updateProductAttributeOptions({
      id: previous.id,
      label: input.label.trim(),
    })

    return new StepResponse(updated, snapshot)
  },
  async (previous, { container }) => {
    if (previous !== undefined) {
      await getProductAttributeService(container).updateProductAttributeOptions(
        previous,
      )
    }
  },
)

export const deleteProductAttributeOptionsStep = createStep(
  "delete-product-attribute-options",
  async (input: ProductAttributeOptionIdsInput, { container }) => {
    const service = getProductAttributeService(container)
    const options = await service.listProductAttributeOptions(
      { id: { $in: input.ids } },
      { take: Math.max(input.ids.length, 1), withDeleted: true },
    )
    const found = new Set(options.map((option) => option.id))
    const missing = input.ids.filter((id) => !found.has(id))

    if (missing.length > 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product Attribute option ids were not found: ${missing.join(", ")}`,
      )
    }

    const { active_ids: activeIds } =
      partitionProductAttributeRecordIds(options)
    const usageCounts = toUsageCountMap(
      await service.getActiveOptionUsageCounts(input.ids),
    )

    if (activeIds.length > 0) {
      await service.softDeleteProductAttributeOptions(activeIds)
    }

    return new StepResponse(
      options.map((option) => ({
        ...option,
        deleted_at: option.deleted_at ?? new Date(),
        usage_count: usageCounts.get(option.id) ?? 0,
      })),
      activeIds,
    )
  },
  async (deletedIds, { container }) => {
    if (deletedIds !== undefined && deletedIds.length > 0) {
      await getProductAttributeService(
        container,
      ).restoreProductAttributeOptions(deletedIds)
    }
  },
)

export const restoreProductAttributeOptionsStep = createStep(
  "restore-product-attribute-options",
  async (input: ProductAttributeOptionIdsInput, { container }) => {
    const service = getProductAttributeService(container)
    const options = await service.listProductAttributeOptions(
      { id: { $in: input.ids } },
      { take: Math.max(input.ids.length, 1), withDeleted: true },
    )
    const found = new Set(options.map((option) => option.id))
    const missing = input.ids.filter((id) => !found.has(id))

    if (missing.length > 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product Attribute option ids were not found: ${missing.join(", ")}`,
      )
    }

    const { deleted_ids: deletedIds } =
      partitionProductAttributeRecordIds(options)

    if (deletedIds.length > 0) {
      await service.restoreProductAttributeOptions(deletedIds)
    }

    return new StepResponse(
      options.map((option) => ({ ...option, deleted_at: null })),
      deletedIds,
    )
  },
  async (restoredIds, { container }) => {
    if (restoredIds !== undefined && restoredIds.length > 0) {
      await getProductAttributeService(
        container,
      ).softDeleteProductAttributeOptions(restoredIds)
    }
  },
)
