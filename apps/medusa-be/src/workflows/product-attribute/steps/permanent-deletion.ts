import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import {
  getProductAttributeService,
  withProductAttributeTransaction,
} from "../../../utils/product-attributes"
import type {
  ProductAttributeDefinitionIdsInput,
  ProductAttributeOptionIdsInput,
} from "../types"

const PURGE_QUERY_BATCH_SIZE = 100
const MAX_PURGE_RECORDS = 100_000

interface PurgeableRecord {
  deleted_at?: Date | null
  id: string
}

const assertRecordsExistAndAreDeleted = ({
  ids,
  kind,
  records,
}: {
  ids: string[]
  kind: "definition" | "option"
  records: PurgeableRecord[]
}) => {
  const byId = new Map(records.map((record) => [record.id, record]))
  const missing = ids.filter((id) => !byId.has(id))
  if (missing.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product Attribute ${kind} ids were not found: ${missing.join(", ")}`,
    )
  }

  const active = ids.filter((id) => !byId.get(id)?.deleted_at)
  if (active.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Product Attribute ${kind} ids must be soft-deleted before permanent removal: ${active.join(", ")}`,
    )
  }
}

const listAllRecordIds = async (
  listPage: (skip: number, take: number) => Promise<{ id: string }[]>,
) => {
  const ids: string[] = []
  const appendNextPage = async (): Promise<void> => {
    const page = await listPage(ids.length, PURGE_QUERY_BATCH_SIZE)
    if (ids.length + page.length > MAX_PURGE_RECORDS) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Product Attribute purge exceeded the ${MAX_PURGE_RECORDS} record safety limit`,
      )
    }

    ids.push(...page.map((record) => record.id))
    if (page.length === PURGE_QUERY_BATCH_SIZE) {
      await appendNextPage()
    }
  }

  await appendNextPage()
  return ids
}

export const permanentlyDeleteProductAttributeDefinitions = async (
  input: ProductAttributeDefinitionIdsInput,
  container: Parameters<typeof getProductAttributeService>[0],
) => {
  const service = getProductAttributeService(container)

  return await withProductAttributeTransaction(service, async (context) => {
    const definitions = await service.listProductAttributeDefinitions(
      { id: { $in: input.ids } },
      { take: Math.max(input.ids.length, 1), withDeleted: true },
      context,
    )
    assertRecordsExistAndAreDeleted({
      ids: input.ids,
      kind: "definition",
      records: definitions,
    })

    let assignmentIds: string[] = []
    let optionIds: string[] = []
    const loadDependencyIdsAt = async (index: number): Promise<void> => {
      if (index === 0) {
        assignmentIds = await listAllRecordIds(
          async (skip, take) =>
            await service.listProductAttributes(
              { definition_id: { $in: input.ids } },
              {
                order: { id: "ASC" },
                select: ["id"],
                skip,
                take,
                withDeleted: true,
              },
              context,
            ),
        )
      } else if (index === 1) {
        optionIds = await listAllRecordIds(
          async (skip, take) =>
            await service.listProductAttributeOptions(
              { definition_id: { $in: input.ids } },
              {
                order: { id: "ASC" },
                select: ["id"],
                skip,
                take,
                withDeleted: true,
              },
              context,
            ),
        )
      } else {
        return
      }

      await loadDependencyIdsAt(index + 1)
    }

    // Serialize both reads because they share the same transaction context.
    await loadDependencyIdsAt(0)

    if (assignmentIds.length > 0) {
      await service.deleteProductAttributes(assignmentIds, context)
    }
    if (optionIds.length > 0) {
      await service.deleteProductAttributeOptions(optionIds, context)
    }
    await service.deleteProductAttributeDefinitions(input.ids, context)

    return {
      assignment_count: assignmentIds.length,
      ids: input.ids,
      option_count: optionIds.length,
    }
  })
}

export const permanentlyDeleteProductAttributeOptions = async (
  input: ProductAttributeOptionIdsInput,
  container: Parameters<typeof getProductAttributeService>[0],
) => {
  const service = getProductAttributeService(container)

  return await withProductAttributeTransaction(service, async (context) => {
    const options = await service.listProductAttributeOptions(
      { id: { $in: input.ids } },
      { take: Math.max(input.ids.length, 1), withDeleted: true },
      context,
    )
    assertRecordsExistAndAreDeleted({
      ids: input.ids,
      kind: "option",
      records: options,
    })

    const assignmentIds = await listAllRecordIds(
      async (skip, take) =>
        await service.listProductAttributes(
          { option_id: { $in: input.ids } },
          {
            order: { id: "ASC" },
            select: ["id"],
            skip,
            take,
            withDeleted: true,
          },
          context,
        ),
    )

    if (assignmentIds.length > 0) {
      await service.deleteProductAttributes(assignmentIds, context)
    }
    await service.deleteProductAttributeOptions(input.ids, context)

    return {
      assignment_count: assignmentIds.length,
      ids: input.ids,
    }
  })
}

export const permanentlyDeleteProductAttributeDefinitionsStep = createStep(
  "permanently-delete-product-attribute-definitions",
  async (input: ProductAttributeDefinitionIdsInput, { container }) =>
    new StepResponse(
      await permanentlyDeleteProductAttributeDefinitions(input, container),
    ),
)

export const permanentlyDeleteProductAttributeOptionsStep = createStep(
  "permanently-delete-product-attribute-options",
  async (input: ProductAttributeOptionIdsInput, { container }) =>
    new StepResponse(
      await permanentlyDeleteProductAttributeOptions(input, container),
    ),
)
