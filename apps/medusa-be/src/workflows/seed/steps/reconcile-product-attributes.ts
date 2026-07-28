import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type {
  Context,
  ILockingModule,
  IProductModuleService,
  Logger,
  ProductDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  getProductAttributeService,
  normalizeRequiredProductAttributeKey,
  type ProductAttributeAssignmentRecord,
  type ProductAttributeDefinitionRecord,
  type ProductAttributeOptionRecord,
  withProductAttributeTransaction,
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

function assertCanonicalDefinitionCompatible(
  existing: CanonicalDefinition | undefined,
  source: SeedProductAttributeInput,
  key: string,
  label: string
) {
  if (
    existing &&
    (existing.input_type !== source.input_type ||
      existing.is_public !== source.is_public ||
      existing.label !== label)
  ) {
    throw new Error(
      `Conflicting canonical Product Attribute definition "${key}" in seed input`
    )
  }
}

function getCanonicalDefinition(
  definitions: Map<string, CanonicalDefinition>,
  source: SeedProductAttributeInput,
  key: string
) {
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

function collectCanonicalOption(
  definition: CanonicalDefinition,
  source: SeedProductAttributeInput,
  definitionKey: string
) {
  if (source.input_type === "text") {
    if (source.option) {
      throw new Error(
        `Text Product Attribute "${definitionKey}" cannot contain an option`
      )
    }
    return
  }
  if (source.text_value) {
    throw new Error(
      `Select Product Attribute "${definitionKey}" cannot contain text_value`
    )
  }
  if (!source.option) {
    return
  }

  const optionLabel = normalizeSeedLabel(source.option.label)
  const optionKey = normalizeRequiredProductAttributeKey(
    source.option.key ?? optionLabel,
    `option key for "${definitionKey}"`
  )
  const existingLabel = definition.options.get(optionKey)
  if (existingLabel && existingLabel !== optionLabel) {
    throw new Error(
      `Product Attribute option key collision for "${definitionKey}:${optionKey}" from source labels "${existingLabel}" and "${optionLabel}"`
    )
  }
  definition.options.set(optionKey, optionLabel)
}

export function collectCanonicalProductAttributeDefinitions(
  input: CreateProductsStepInput
) {
  const definitions = new Map<string, CanonicalDefinition>()

  for (const product of input) {
    const productDefinitionKeys = new Set<string>()
    for (const attribute of product.productAttributes ?? []) {
      const key = normalizeRequiredProductAttributeKey(
        attribute.key,
        "definition key"
      )
      if (productDefinitionKeys.has(key)) {
        throw new Error(
          `Product "${product.handle}" contains duplicate Product Attribute definition "${key}"`
        )
      }
      productDefinitionKeys.add(key)
      collectCanonicalOption(
        getCanonicalDefinition(definitions, attribute, key),
        attribute,
        key
      )
    }
  }

  return definitions
}

const chunk = <T>(items: T[], size = RECONCILIATION_BATCH_SIZE) => {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

async function ensureDefinitionsAndOptions(
  input: CreateProductsStepInput,
  service: ReturnType<typeof getProductAttributeService>
) {
  const canonical = collectCanonicalProductAttributeDefinitions(input)
  const keys = [...canonical.keys()]
  const existingDefinitions = (await service.listProductAttributeDefinitions(
    { key: { $in: keys } },
    { take: Math.max(keys.length, 1), withDeleted: true }
  )) as ProductAttributeDefinitionRecord[]
  const definitionByKey = new Map(
    existingDefinitions.map((definition) => [definition.key, definition])
  )

  for (const [key, source] of canonical) {
    const definition = await ensureDefinition(
      key,
      source,
      definitionByKey,
      service
    )
    await ensureOptions(definition, source.options, service)
  }

  return { canonical, definitionByKey }
}

async function ensureDefinition(
  key: string,
  source: CanonicalDefinition,
  definitionByKey: Map<string, ProductAttributeDefinitionRecord>,
  service: ReturnType<typeof getProductAttributeService>
) {
  let definition = definitionByKey.get(key)
  if (definition && definition.input_type !== source.input_type) {
    throw new Error(
      `Reserved Product Attribute "${key}" must use input type "${source.input_type}", but persisted type is "${definition.input_type}"`
    )
  }
  if (!definition) {
    definition = (await service.createProductAttributeDefinitions({
      input_type: source.input_type,
      is_public: source.is_public,
      key,
      label: source.label,
    })) as ProductAttributeDefinitionRecord
    definitionByKey.set(key, definition)
    return definition
  }
  if (definition.deleted_at) {
    await service.restoreProductAttributeDefinitions([definition.id])
  }
  const updated = (await service.updateProductAttributeDefinitions({
    id: definition.id,
    is_public: source.is_public,
    label: source.label,
  })) as ProductAttributeDefinitionRecord
  const activeDefinition = { ...updated, deleted_at: null }
  definitionByKey.set(key, activeDefinition)

  return activeDefinition
}

async function ensureOptions(
  definition: ProductAttributeDefinitionRecord,
  sourceOptions: Map<string, string>,
  service: ReturnType<typeof getProductAttributeService>
) {
  if (sourceOptions.size === 0) {
    return
  }
  const optionKeys = [...sourceOptions.keys()]
  const existingOptions = (await service.listProductAttributeOptions(
    {
      definition_id: definition.id,
      key: { $in: optionKeys },
    },
    { take: optionKeys.length, withDeleted: true }
  )) as ProductAttributeOptionRecord[]
  const optionByKey = new Map(
    existingOptions.map((option) => [option.key, option])
  )

  for (const [optionKey, optionLabel] of sourceOptions) {
    const existingOption = optionByKey.get(optionKey)
    if (!existingOption) {
      await service.createProductAttributeOptions({
        definition_id: definition.id,
        key: optionKey,
        label: optionLabel,
      })
      continue
    }
    if (existingOption.deleted_at) {
      await service.restoreProductAttributeOptions([existingOption.id])
    }
    await service.updateProductAttributeOptions({
      id: existingOption.id,
      label: optionLabel,
    })
  }
}

async function resolveOptions(
  canonical: Map<string, CanonicalDefinition>,
  definitionByKey: Map<string, ProductAttributeDefinitionRecord>,
  service: ReturnType<typeof getProductAttributeService>
) {
  const optionByDefinitionAndKey = new Map<
    string,
    ProductAttributeOptionRecord
  >()

  for (const [key, source] of canonical) {
    const definition = definitionByKey.get(key)
    if (!(definition && source.options.size)) {
      continue
    }
    const options = (await service.listProductAttributeOptions(
      {
        definition_id: definition.id,
        key: { $in: [...source.options.keys()] },
      },
      { take: source.options.size }
    )) as ProductAttributeOptionRecord[]
    for (const option of options) {
      optionByDefinitionAndKey.set(`${definition.id}:${option.key}`, option)
    }
  }

  return optionByDefinitionAndKey
}

function resolveSeedAttribute(
  attribute: SeedProductAttributeInput,
  definitionByKey: Map<string, ProductAttributeDefinitionRecord>,
  optionByDefinitionAndKey: Map<string, ProductAttributeOptionRecord>
): ResolvedSeedAttribute {
  const key = normalizeRequiredProductAttributeKey(attribute.key)
  const definition = definitionByKey.get(key)
  if (!definition) {
    throw new Error(`Product Attribute definition "${key}" was not reconciled`)
  }
  const optionKey = attribute.option
    ? normalizeRequiredProductAttributeKey(
        attribute.option.key ?? attribute.option.label
      )
    : undefined
  const option = optionKey
    ? optionByDefinitionAndKey.get(`${definition.id}:${optionKey}`)
    : undefined
  if (optionKey && !option) {
    throw new Error(
      `Product Attribute option "${key}:${optionKey}" was not reconciled`
    )
  }
  return {
    ...attribute,
    definition_id: definition.id,
    option_id: option?.id,
  }
}

async function reconcileProductBatch({
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
}) {
  await withProductAttributeTransaction(service, async (context) => {
    const existingByProductAndDefinition = await loadBatchAssignments({
      batch,
      context,
      definitionByKey,
      productByHandle,
      service,
    })

    for (const inputProduct of batch) {
      await reconcileProductAssignments({
        context,
        definitionByKey,
        existingByProductAndDefinition,
        inputProduct,
        optionByDefinitionAndKey,
        productByHandle,
        service,
      })
    }
  })
}

function resolveBatchProductIds(
  batch: CreateProductsStepInput,
  productByHandle: Map<string, ProductDTO>
) {
  return batch.map(({ handle }) => {
    const productId = productByHandle.get(handle)?.id
    if (!productId) {
      throw new Error(`Product "${handle}" was not found`)
    }
    return productId
  })
}

async function loadBatchAssignments({
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
}) {
  const productIds = resolveBatchProductIds(batch, productByHandle)
  const definitionIds = [...definitionByKey.values()].map(({ id }) => id)
  const existing = (await service.listProductAttributes(
    {
      definition_id: { $in: definitionIds },
      product_id: { $in: productIds },
    },
    {
      take: Math.max(batch.length * definitionIds.length, 1),
      withDeleted: true,
    },
    context
  )) as ProductAttributeAssignmentRecord[]

  return new Map(
    existing.map((assignment) => [
      `${assignment.product_id}:${assignment.definition_id}`,
      assignment,
    ])
  )
}

function resolveAssignmentValues(attribute: ResolvedSeedAttribute) {
  if (attribute.input_type === "select") {
    return attribute.option_id
      ? { option_id: attribute.option_id, text_value: null }
      : null
  }
  const textValue = attribute.text_value?.trim()
  return textValue ? { option_id: null, text_value: textValue } : null
}

async function reconcileAssignment({
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
}) {
  const values = resolveAssignmentValues(attribute)
  if (!values) {
    if (existingAssignment && !existingAssignment.deleted_at) {
      await service.softDeleteProductAttributes(
        [existingAssignment.id],
        {},
        context
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
      context
    )
    return
  }
  if (existingAssignment.deleted_at) {
    await service.restoreProductAttributes([existingAssignment.id], {}, context)
  }
  await service.updateProductAttributes(
    { id: existingAssignment.id, ...values },
    context
  )
}

async function reconcileProductAssignments({
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
}) {
  const product = productByHandle.get(inputProduct.handle)
  if (!product) {
    throw new Error(`Product "${inputProduct.handle}" was not found`)
  }
  for (const sourceAttribute of inputProduct.productAttributes ?? []) {
    const attribute = resolveSeedAttribute(
      sourceAttribute,
      definitionByKey,
      optionByDefinitionAndKey
    )
    await reconcileAssignment({
      attribute,
      context,
      existingAssignment: existingByProductAndDefinition.get(
        `${product.id}:${attribute.definition_id}`
      ),
      productId: product.id,
      service,
    })
  }
}

export const reconcileProductAttributesStep = createStep(
  "reconcile-product-attributes",
  async (input: CreateProductsStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const attributeCount = input.reduce(
      (total, product) => total + (product.productAttributes?.length ?? 0),
      0
    )
    if (attributeCount === 0) {
      return new StepResponse({ definitions: 0, products: 0 })
    }

    const service = getProductAttributeService(container)
    const productService = container.resolve<IProductModuleService>(
      Modules.PRODUCT
    )
    const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)
    const { canonical, definitionByKey } = await ensureDefinitionsAndOptions(
      input,
      service
    )
    const optionByDefinitionAndKey = await resolveOptions(
      canonical,
      definitionByKey,
      service
    )
    const products = await productService.listProducts(
      { handle: { $in: input.map(({ handle }) => handle) } },
      { select: ["id", "handle"], take: input.length }
    )
    const productByHandle = new Map(
      products.map((product) => [product.handle, product])
    )
    const missingHandles = input
      .map(({ handle }) => handle)
      .filter((handle) => !productByHandle.has(handle))
    if (missingHandles.length > 0) {
      throw new Error(
        `Products were not found during Product Attribute reconciliation: ${missingHandles.join(", ")}`
      )
    }

    for (const batch of chunk(input)) {
      const lockKeys = batch
        .map(({ handle }) => productByHandle.get(handle)?.id as string)
        .map((id) => `product-attribute-product:${id}`)
        .sort()
      await lockingModule.execute(
        lockKeys,
        () =>
          reconcileProductBatch({
            batch,
            definitionByKey,
            optionByDefinitionAndKey,
            productByHandle,
            service,
          }),
        { timeout: 30 }
      )
    }

    logger.info(
      `Reconciled ${canonical.size} Product Attribute definitions for ${input.length} products`
    )
    return new StepResponse({
      definitions: canonical.size,
      products: input.length,
    })
  }
)
