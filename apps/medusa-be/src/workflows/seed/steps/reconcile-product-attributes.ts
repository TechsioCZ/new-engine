import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type {
  Context,
  ILockingModule,
  IProductModuleService,
  Logger,
  ProductDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { chunk } from "@techsio/std/array"

import {
  getProductAttributeProductLockKey,
  getProductAttributeService,
  normalizeRequiredProductAttributeKey,
  withProductAttributeTransaction,
} from "../../../utils/product-attributes"
import type {
  ProductAttributeAssignmentRecord,
  ProductAttributeDefinitionRecord,
  ProductAttributeOptionRecord,
} from "../../../utils/product-attributes"
import type {
  CreateProductsStepInput,
  SeedProductAttributeInput,
} from "./create-products"

const RECONCILIATION_BATCH_SIZE = 100

type CanonicalDefinition = Omit<
  SeedProductAttributeInput,
  "option" | "text_value"
> & {
  options: Map<string, string>
}

type ResolvedSeedAttribute = SeedProductAttributeInput & {
  definition_id: string
  option_id?: string
}

const normalizeSeedLabel = (value: string) => value.trim()

const assertCanonicalDefinitionCompatible = (
  existing: CanonicalDefinition | undefined,
  source: SeedProductAttributeInput,
  key: string,
  label: string,
) => {
  if (
    existing &&
    (existing.input_type !== source.input_type ||
      existing.is_public !== source.is_public ||
      existing.label !== label)
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Conflicting canonical Product Attribute definition "${key}" in seed input`,
    )
  }
}

const getCanonicalDefinition = (
  definitions: Map<string, CanonicalDefinition>,
  source: SeedProductAttributeInput,
  key: string,
) => {
  const label = normalizeSeedLabel(source.label)
  const existing = definitions.get(key)
  assertCanonicalDefinitionCompatible(existing, source, key, label)

  const definition =
    existing ??
    ({
      input_type: source.input_type,
      is_public: source.is_public,
      key,
      label,
      options: new Map(),
    } satisfies CanonicalDefinition)
  definitions.set(key, definition)

  return definition
}

const collectCanonicalOption = (
  definition: CanonicalDefinition,
  source: SeedProductAttributeInput,
  definitionKey: string,
) => {
  if (source.input_type === "text") {
    if (source.option) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Text Product Attribute "${definitionKey}" cannot contain an option`,
      )
    }
    return
  }
  if (
    source.text_value !== null &&
    source.text_value !== undefined &&
    source.text_value !== ""
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Select Product Attribute "${definitionKey}" cannot contain text_value`,
    )
  }
  if (!source.option) {
    return
  }

  const optionLabel = normalizeSeedLabel(source.option.label)
  const optionKey = normalizeRequiredProductAttributeKey(
    source.option.key ?? optionLabel,
    `option key for "${definitionKey}"`,
  )
  const existingLabel = definition.options.get(optionKey)
  if (
    existingLabel !== undefined &&
    existingLabel !== "" &&
    existingLabel !== optionLabel
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Product Attribute option key collision for "${definitionKey}:${optionKey}" from source labels "${existingLabel}" and "${optionLabel}"`,
    )
  }
  definition.options.set(optionKey, optionLabel)
}

export const collectCanonicalProductAttributeDefinitions = (
  input: CreateProductsStepInput,
) => {
  const definitions = new Map<string, CanonicalDefinition>()

  for (const product of input) {
    const productDefinitionKeys = new Set<string>()
    for (const attribute of product.productAttributes ?? []) {
      const key = normalizeRequiredProductAttributeKey(
        attribute.key,
        "definition key",
      )
      if (productDefinitionKeys.has(key)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Product "${product.handle}" contains duplicate Product Attribute definition "${key}"`,
        )
      }
      productDefinitionKeys.add(key)
      collectCanonicalOption(
        getCanonicalDefinition(definitions, attribute, key),
        attribute,
        key,
      )
    }
  }

  return definitions
}

const ensureDefinition = async (
  key: string,
  source: CanonicalDefinition,
  definitionByKey: Map<string, ProductAttributeDefinitionRecord>,
  service: ReturnType<typeof getProductAttributeService>,
) => {
  let definition = definitionByKey.get(key)
  if (definition && definition.input_type !== source.input_type) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Reserved Product Attribute "${key}" must use input type "${source.input_type}", but persisted type is "${definition.input_type}"`,
    )
  }
  if (!definition) {
    definition = await service.createProductAttributeDefinitions({
      input_type: source.input_type,
      is_public: source.is_public,
      key,
      label: source.label,
    })
    definitionByKey.set(key, definition)
    return definition
  }
  if (definition.deleted_at) {
    await service.restoreProductAttributeDefinitions([definition.id])
  }
  const updated = await service.updateProductAttributeDefinitions({
    id: definition.id,
    is_public: source.is_public,
    label: source.label,
  })
  const activeDefinition = { ...updated, deleted_at: null }
  definitionByKey.set(key, activeDefinition)

  return activeDefinition
}

const ensureOptions = async (
  definition: ProductAttributeDefinitionRecord,
  sourceOptions: Map<string, string>,
  service: ReturnType<typeof getProductAttributeService>,
) => {
  if (sourceOptions.size === 0) {
    return
  }
  const optionKeys = [...sourceOptions.keys()]
  const existingOptions = await service.listProductAttributeOptions(
    {
      definition_id: definition.id,
      key: { $in: optionKeys },
    },
    { take: optionKeys.length, withDeleted: true },
  )
  const optionByKey = new Map(
    existingOptions.map((option) => [option.key, option]),
  )

  const sourceOptionEntries = [...sourceOptions]
  const ensureNext = async (index: number): Promise<void> => {
    const entry = sourceOptionEntries[index]
    if (entry === undefined) {
      return
    }
    const [optionKey, optionLabel] = entry
    const existingOption = optionByKey.get(optionKey)
    if (!existingOption) {
      await service.createProductAttributeOptions({
        definition_id: definition.id,
        key: optionKey,
        label: optionLabel,
      })
      await ensureNext(index + 1)
      return
    }
    if (existingOption.deleted_at) {
      await service.restoreProductAttributeOptions([existingOption.id])
    }
    await service.updateProductAttributeOptions({
      id: existingOption.id,
      label: optionLabel,
    })
    await ensureNext(index + 1)
  }
  await ensureNext(0)
}

const ensureDefinitionsAndOptions = async (
  input: CreateProductsStepInput,
  service: ReturnType<typeof getProductAttributeService>,
) => {
  const canonical = collectCanonicalProductAttributeDefinitions(input)
  const keys = [...canonical.keys()]
  const existingDefinitions = await service.listProductAttributeDefinitions(
    { key: { $in: keys } },
    { take: Math.max(keys.length, 1), withDeleted: true },
  )
  const definitionByKey = new Map(
    existingDefinitions.map((definition) => [definition.key, definition]),
  )

  const canonicalEntries = [...canonical]
  const ensureNext = async (index: number): Promise<void> => {
    const entry = canonicalEntries[index]
    if (entry === undefined) {
      return
    }
    const [key, source] = entry
    const definition = await ensureDefinition(
      key,
      source,
      definitionByKey,
      service,
    )
    await ensureOptions(definition, source.options, service)
    await ensureNext(index + 1)
  }
  await ensureNext(0)

  return { canonical, definitionByKey }
}

const resolveOptions = async (
  canonical: Map<string, CanonicalDefinition>,
  definitionByKey: Map<string, ProductAttributeDefinitionRecord>,
  service: ReturnType<typeof getProductAttributeService>,
) => {
  const optionByDefinitionAndKey = new Map<
    string,
    ProductAttributeOptionRecord
  >()

  const canonicalEntries = [...canonical]
  const resolveNext = async (index: number): Promise<void> => {
    const entry = canonicalEntries[index]
    if (entry === undefined) {
      return
    }
    const [key, source] = entry
    const definition = definitionByKey.get(key)
    if (!(definition && source.options.size)) {
      await resolveNext(index + 1)
      return
    }
    const options = await service.listProductAttributeOptions(
      {
        definition_id: definition.id,
        key: { $in: [...source.options.keys()] },
      },
      { take: source.options.size },
    )
    for (const option of options) {
      optionByDefinitionAndKey.set(`${definition.id}:${option.key}`, option)
    }
    await resolveNext(index + 1)
  }
  await resolveNext(0)

  return optionByDefinitionAndKey
}

const resolveSeedAttribute = (
  attribute: SeedProductAttributeInput,
  definitionByKey: Map<string, ProductAttributeDefinitionRecord>,
  optionByDefinitionAndKey: Map<string, ProductAttributeOptionRecord>,
): ResolvedSeedAttribute => {
  const key = normalizeRequiredProductAttributeKey(attribute.key)
  const definition = definitionByKey.get(key)
  if (!definition) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Product Attribute definition "${key}" was not reconciled`,
    )
  }
  const optionKey = attribute.option
    ? normalizeRequiredProductAttributeKey(
        attribute.option.key ?? attribute.option.label,
      )
    : undefined
  const option =
    optionKey !== undefined && optionKey !== ""
      ? optionByDefinitionAndKey.get(`${definition.id}:${optionKey}`)
      : undefined
  if (optionKey !== undefined && optionKey !== "" && !option) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Product Attribute option "${key}:${optionKey}" was not reconciled`,
    )
  }
  return {
    ...attribute,
    definition_id: definition.id,
    ...(option === undefined ? {} : { option_id: option.id }),
  }
}

const resolveBatchProductIds = (
  batch: CreateProductsStepInput,
  productByHandle: Map<string, ProductDTO>,
) =>
  batch.map(({ handle }) => {
    const productId = productByHandle.get(handle)?.id
    if (productId === undefined || productId === "") {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product "${handle}" was not found`,
      )
    }
    return productId
  })

const resolveAssignmentValues = (attribute: ResolvedSeedAttribute) => {
  if (attribute.input_type === "select") {
    return attribute.option_id !== undefined && attribute.option_id !== ""
      ? { option_id: attribute.option_id, text_value: null }
      : null
  }
  const textValue = attribute.text_value?.trim()
  return textValue !== undefined && textValue !== ""
    ? { option_id: null, text_value: textValue }
    : null
}

const reconcileAssignment = async ({
  attribute,
  context,
  existingAssignment,
  productId,
  service,
}: {
  attribute: ResolvedSeedAttribute
  context: Context<SqlEntityManager>
  existingAssignment?: ProductAttributeAssignmentRecord
  productId: string
  service: ReturnType<typeof getProductAttributeService>
}) => {
  const values = resolveAssignmentValues(attribute)
  if (!values) {
    if (existingAssignment && !existingAssignment.deleted_at) {
      await service.softDeleteProductAttributes(
        [existingAssignment.id],
        {},
        context,
      )
    }
    return
  }
  if (!existingAssignment) {
    await service.createProductAttributes(
      {
        definition_id: attribute.definition_id,
        product_id: productId,
        ...values,
      },
      context,
    )
    return
  }
  if (existingAssignment.deleted_at) {
    await service.restoreProductAttributes([existingAssignment.id], {}, context)
  }
  await service.updateProductAttributes(
    { id: existingAssignment.id, ...values },
    context,
  )
}

const loadBatchAssignments = async ({
  batch,
  context,
  definitionByKey,
  productByHandle,
  service,
}: {
  batch: CreateProductsStepInput
  context: Context<SqlEntityManager>
  definitionByKey: Map<string, ProductAttributeDefinitionRecord>
  productByHandle: Map<string, ProductDTO>
  service: ReturnType<typeof getProductAttributeService>
}) => {
  const productIds = resolveBatchProductIds(batch, productByHandle)
  const definitionIds = [...definitionByKey.values()].map(({ id }) => id)
  const existing = await service.listProductAttributes(
    {
      definition_id: { $in: definitionIds },
      product_id: { $in: productIds },
    },
    {
      take: Math.max(batch.length * definitionIds.length, 1),
      withDeleted: true,
    },
    context,
  )

  return new Map(
    existing.map((assignment) => [
      `${assignment.product_id}:${assignment.definition_id}`,
      assignment,
    ]),
  )
}

const reconcileProductAssignments = async ({
  context,
  definitionByKey,
  existingByProductAndDefinition,
  inputProduct,
  optionByDefinitionAndKey,
  productByHandle,
  service,
}: {
  context: Context<SqlEntityManager>
  definitionByKey: Map<string, ProductAttributeDefinitionRecord>
  existingByProductAndDefinition: Map<string, ProductAttributeAssignmentRecord>
  inputProduct: CreateProductsStepInput[number]
  optionByDefinitionAndKey: Map<string, ProductAttributeOptionRecord>
  productByHandle: Map<string, ProductDTO>
  service: ReturnType<typeof getProductAttributeService>
}) => {
  const product = productByHandle.get(inputProduct.handle)
  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product "${inputProduct.handle}" was not found`,
    )
  }
  const sourceAttributes = inputProduct.productAttributes ?? []
  const reconcileNext = async (index: number): Promise<void> => {
    const sourceAttribute = sourceAttributes[index]
    if (sourceAttribute === undefined) {
      return
    }
    const attribute = resolveSeedAttribute(
      sourceAttribute,
      definitionByKey,
      optionByDefinitionAndKey,
    )
    const existingAssignment = existingByProductAndDefinition.get(
      `${product.id}:${attribute.definition_id}`,
    )
    await reconcileAssignment({
      attribute,
      context,
      ...(existingAssignment === undefined ? {} : { existingAssignment }),
      productId: product.id,
      service,
    })
    await reconcileNext(index + 1)
  }
  await reconcileNext(0)
}

const reconcileProductBatch = async ({
  batch,
  definitionByKey,
  optionByDefinitionAndKey,
  productByHandle,
  service,
}: {
  batch: CreateProductsStepInput
  definitionByKey: Map<string, ProductAttributeDefinitionRecord>
  optionByDefinitionAndKey: Map<string, ProductAttributeOptionRecord>
  productByHandle: Map<string, ProductDTO>
  service: ReturnType<typeof getProductAttributeService>
}) => {
  await withProductAttributeTransaction(service, async (context) => {
    const existingByProductAndDefinition = await loadBatchAssignments({
      batch,
      context,
      definitionByKey,
      productByHandle,
      service,
    })

    const reconcileNext = async (index: number): Promise<void> => {
      const inputProduct = batch[index]
      if (inputProduct === undefined) {
        return
      }
      await reconcileProductAssignments({
        context,
        definitionByKey,
        existingByProductAndDefinition,
        inputProduct,
        optionByDefinitionAndKey,
        productByHandle,
        service,
      })
      await reconcileNext(index + 1)
    }
    await reconcileNext(0)
  })
}

export const reconcileProductAttributesStep = createStep(
  "reconcile-product-attributes",
  async (input: CreateProductsStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const attributeCount = input.reduce(
      (total, product) => total + (product.productAttributes?.length ?? 0),
      0,
    )
    if (attributeCount === 0) {
      return new StepResponse({ definitions: 0, products: 0 })
    }

    const service = getProductAttributeService(container)
    const productService = container.resolve<IProductModuleService>(
      Modules.PRODUCT,
    )
    const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)
    const { canonical, definitionByKey } = await ensureDefinitionsAndOptions(
      input,
      service,
    )
    const optionByDefinitionAndKey = await resolveOptions(
      canonical,
      definitionByKey,
      service,
    )
    const products = await productService.listProducts(
      { handle: { $in: input.map(({ handle }) => handle) } },
      { select: ["id", "handle"], take: input.length },
    )
    const productByHandle = new Map(
      products.map((product) => [product.handle, product]),
    )
    const missingHandles = input
      .map(({ handle }) => handle)
      .filter((handle) => !productByHandle.has(handle))
    if (missingHandles.length > 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Products were not found during Product Attribute reconciliation: ${missingHandles.join(", ")}`,
      )
    }

    const batches = chunk(input, RECONCILIATION_BATCH_SIZE)
    const reconcileNextBatch = async (index: number): Promise<void> => {
      const batch = batches[index]
      if (batch === undefined) {
        return
      }
      const lockKeys = resolveBatchProductIds(batch, productByHandle)
        .map(getProductAttributeProductLockKey)
        .toSorted()
      await lockingModule.execute(
        lockKeys,
        async () => {
          await reconcileProductBatch({
            batch,
            definitionByKey,
            optionByDefinitionAndKey,
            productByHandle,
            service,
          })
        },
        { timeout: 30 },
      )
      await reconcileNextBatch(index + 1)
    }
    await reconcileNextBatch(0)

    logger.info(
      `Reconciled ${canonical.size} Product Attribute definitions for ${input.length} products`,
    )
    return new StepResponse({
      definitions: canonical.size,
      products: input.length,
    })
  },
)
