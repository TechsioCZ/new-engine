import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type { Context } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import {
  getProductAttributeService,
  withProductAttributeTransaction,
} from "../../../utils/product-attributes"
import type {
  ProductAttributeAssignmentRecord,
  ProductAttributeDefinitionRecord,
  ProductAttributeOptionRecord,
} from "../../../utils/product-attributes"
import type {
  SetProductAttributeOperation,
  SetProductAttributesInput,
} from "../types"

interface BoundedGraphQuery {
  graph: (config: {
    entity: "product"
    fields: readonly string[]
    filters: Record<string, unknown>
    pagination: { take: number }
  }) => Promise<{ data: { id: string }[] }>
}

interface AssignmentCompensation {
  created_ids: string[]
  previous: ProductAttributeAssignmentRecord[]
}

const MAX_ATTRIBUTE_OPERATIONS = 100

const hasDeletedAt = (value: unknown): boolean =>
  value instanceof Date || (typeof value === "string" && value.length > 0)

type PreparedSetOperation = SetProductAttributeOperation & {
  definition: ProductAttributeDefinitionRecord
  option?: ProductAttributeOptionRecord
}

export type ProductAttributeAssignmentMutation =
  | {
      definition_id: string
      existing?: ProductAttributeAssignmentRecord
      kind: "remove"
    }
  | {
      definition_id: string
      existing?: ProductAttributeAssignmentRecord
      kind: "set"
      values: {
        option_id: string | null
        text_value: string | null
      }
    }

const prepareProductAttributeOperation = (
  operation: SetProductAttributeOperation,
  definitionById: Map<string, ProductAttributeDefinitionRecord>,
  optionById: Map<string, ProductAttributeOptionRecord>,
): PreparedSetOperation => {
  const definition = definitionById.get(operation.definition_id)
  if (definition === undefined || hasDeletedAt(definition.deleted_at)) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Active Product Attribute definition "${operation.definition_id}" was not found.`,
    )
  }

  if (operation.action === "remove") {
    return {
      action: "remove",
      definition,
      definition_id: operation.definition_id,
    }
  }

  if (definition.input_type === "text") {
    const textValue = operation.text_value?.trim()
    if (
      textValue === undefined ||
      textValue.length === 0 ||
      (operation.option_id !== undefined && operation.option_id.length > 0)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Text definition "${definition.key}" requires a non-empty text_value and no option_id.`,
      )
    }

    return {
      action: "set",
      definition,
      definition_id: operation.definition_id,
      text_value: textValue,
    }
  }

  if (
    operation.option_id === undefined ||
    operation.option_id.length === 0 ||
    operation.text_value !== undefined
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Select definition "${definition.key}" requires option_id and no text_value.`,
    )
  }

  const option = optionById.get(operation.option_id)
  if (
    option === undefined ||
    hasDeletedAt(option.deleted_at) ||
    option.definition_id !== definition.id
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Option "${operation.option_id}" is not an active option of definition "${definition.key}".`,
    )
  }

  return {
    action: "set",
    definition,
    definition_id: operation.definition_id,
    option,
    option_id: option.id,
  }
}

export const validateProductAttributeOperations = ({
  definitions,
  operations,
  options,
}: {
  definitions: ProductAttributeDefinitionRecord[]
  operations: SetProductAttributeOperation[]
  options: ProductAttributeOptionRecord[]
}): PreparedSetOperation[] => {
  const definitionById = new Map(
    definitions.map((definition) => [definition.id, definition]),
  )
  const optionById = new Map(options.map((option) => [option.id, option]))
  const seenDefinitionIds = new Set<string>()

  return operations.map((operation) => {
    if (seenDefinitionIds.has(operation.definition_id)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Product Attribute definition "${operation.definition_id}" occurs more than once in the request.`,
      )
    }
    seenDefinitionIds.add(operation.definition_id)

    return prepareProductAttributeOperation(
      operation,
      definitionById,
      optionById,
    )
  })
}

export const planProductAttributeAssignmentMutations = ({
  existingAssignments,
  operations,
}: {
  existingAssignments: ProductAttributeAssignmentRecord[]
  operations: PreparedSetOperation[]
}): ProductAttributeAssignmentMutation[] => {
  const existingByDefinitionId = new Map<
    string,
    ProductAttributeAssignmentRecord
  >()
  for (const assignment of existingAssignments) {
    const current = existingByDefinitionId.get(assignment.definition_id)
    if (
      current === undefined ||
      (hasDeletedAt(current.deleted_at) && !hasDeletedAt(assignment.deleted_at))
    ) {
      existingByDefinitionId.set(assignment.definition_id, assignment)
    }
  }

  return operations.map((operation) => {
    const existing = existingByDefinitionId.get(operation.definition_id)

    if (operation.action === "remove") {
      return {
        definition_id: operation.definition_id,
        ...(existing === undefined ? {} : { existing }),
        kind: "remove",
      }
    }

    return {
      definition_id: operation.definition_id,
      ...(existing === undefined ? {} : { existing }),
      kind: "set",
      values:
        operation.definition.input_type === "text"
          ? {
              option_id: null,
              text_value: operation.text_value ?? null,
            }
          : {
              option_id: operation.option?.id ?? null,
              text_value: null,
            },
    }
  })
}

export const prepareProductAttributeAssignmentCompensation = (
  mutations: ProductAttributeAssignmentMutation[],
): AssignmentCompensation => ({
  created_ids: [],
  previous: mutations.flatMap((mutation) => {
    if (
      mutation.existing === undefined ||
      (mutation.kind === "remove" && hasDeletedAt(mutation.existing.deleted_at))
    ) {
      return []
    }
    return [mutation.existing]
  }),
})

const ensureProductExists = async (
  productId: string,
  container: Parameters<typeof getProductAttributeService>[0],
) => {
  const query = container.resolve<BoundedGraphQuery>(
    ContainerRegistrationKeys.QUERY,
  )
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: { id: productId },
    pagination: { take: 1 },
  })

  const [product] = products

  if (product === undefined) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product "${productId}" was not found.`,
    )
  }
}

const applyProductAttributeMutation = async (
  service: ReturnType<typeof getProductAttributeService>,
  context: Context<SqlEntityManager>,
  productId: string,
  mutation: ProductAttributeAssignmentMutation,
): Promise<ProductAttributeAssignmentRecord | undefined> => {
  const { existing } = mutation

  if (mutation.kind === "remove") {
    if (existing !== undefined && !hasDeletedAt(existing.deleted_at)) {
      await service.softDeleteProductAttributes([existing.id], {}, context)
    }
    return undefined
  }

  if (existing !== undefined) {
    if (hasDeletedAt(existing.deleted_at)) {
      await service.restoreProductAttributes([existing.id], {}, context)
    }
    await service.updateProductAttributes(
      {
        id: existing.id,
        ...mutation.values,
      },
      context,
    )
    return undefined
  }

  return await service.createProductAttributes(
    {
      definition_id: mutation.definition_id,
      product_id: productId,
      ...mutation.values,
    },
    context,
  )
}

const applyProductAttributeMutationsSequentially = async (
  service: ReturnType<typeof getProductAttributeService>,
  context: Context<SqlEntityManager>,
  productId: string,
  mutations: ProductAttributeAssignmentMutation[],
  createdIds: string[],
  index = 0,
): Promise<null> => {
  const mutation = mutations[index]
  if (mutation === undefined) {
    return null
  }

  const created = await applyProductAttributeMutation(
    service,
    context,
    productId,
    mutation,
  )
  if (created !== undefined) {
    createdIds.push(created.id)
  }

  return await applyProductAttributeMutationsSequentially(
    service,
    context,
    productId,
    mutations,
    createdIds,
    index + 1,
  )
}

const restoreAssignmentsSequentially = async (
  service: ReturnType<typeof getProductAttributeService>,
  context: Context<SqlEntityManager>,
  previousAssignments: ProductAttributeAssignmentRecord[],
  index = 0,
): Promise<null> => {
  const previous = previousAssignments[index]
  if (previous === undefined) {
    return null
  }

  await service.updateProductAttributes(
    {
      id: previous.id,
      option_id: previous.option_id ?? null,
      text_value: previous.text_value ?? null,
    },
    context,
  )

  const setDeletionState = hasDeletedAt(previous.deleted_at)
    ? service.softDeleteProductAttributes([previous.id], {}, context)
    : service.restoreProductAttributes([previous.id], {}, context)
  await setDeletionState

  return await restoreAssignmentsSequentially(
    service,
    context,
    previousAssignments,
    index + 1,
  )
}

export const setProductAttributesStep = createStep(
  "set-product-attributes",
  async (input: SetProductAttributesInput, { container }) => {
    if (input.operations.length > MAX_ATTRIBUTE_OPERATIONS) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `A maximum of ${MAX_ATTRIBUTE_OPERATIONS} Product Attribute operations is allowed.`,
      )
    }

    await ensureProductExists(input.product_id, container)
    const service = getProductAttributeService(container)

    const result = await withProductAttributeTransaction(
      service,
      async (context) => {
        const definitionIds = input.operations.map(
          (operation) => operation.definition_id,
        )
        const optionIds = input.operations.flatMap((operation) =>
          operation.action === "set" &&
          operation.option_id !== undefined &&
          operation.option_id.length > 0
            ? [operation.option_id]
            : [],
        )
        const [definitions, options, existingAssignments] = await Promise.all([
          service.listProductAttributeDefinitions(
            { id: { $in: definitionIds } },
            {
              take: Math.max(definitionIds.length, 1),
              withDeleted: true,
            },
            context,
          ),
          optionIds.length > 0
            ? service.listProductAttributeOptions(
                { id: { $in: optionIds } },
                {
                  take: optionIds.length,
                  withDeleted: true,
                },
                context,
              )
            : Promise.resolve([]),
          service.listProductAttributes(
            {
              definition_id: { $in: definitionIds },
              product_id: input.product_id,
            },
            {
              order: { id: "ASC" },
              take: Math.max(definitionIds.length, 1),
              withDeleted: true,
            },
            context,
          ),
        ])
        const operations = validateProductAttributeOperations({
          definitions,
          operations: input.operations,
          options,
        })
        const mutations = planProductAttributeAssignmentMutations({
          existingAssignments,
          operations,
        })
        const createdIds: string[] = []
        const compensation =
          prepareProductAttributeAssignmentCompensation(mutations)

        await applyProductAttributeMutationsSequentially(
          service,
          context,
          input.product_id,
          mutations,
          createdIds,
        )

        const assignments = await service.listProductAttributes(
          {
            definition_id: { $in: definitionIds },
            product_id: input.product_id,
          },
          {
            relations: ["definition", "option"],
            take: Math.max(definitionIds.length, 1),
          },
          context,
        )

        return {
          assignments,
          compensation: {
            created_ids: createdIds,
            previous: compensation.previous,
          } satisfies AssignmentCompensation,
        }
      },
    )

    return new StepResponse(result.assignments, result.compensation)
  },
  async (compensation: AssignmentCompensation | undefined, { container }) => {
    if (compensation === undefined) {
      return
    }

    const service = getProductAttributeService(container)
    await withProductAttributeTransaction(service, async (context) => {
      if (compensation.created_ids.length > 0) {
        await service.deleteProductAttributes(compensation.created_ids, context)
      }

      await restoreAssignmentsSequentially(
        service,
        context,
        compensation.previous,
      )
    })
  },
)
