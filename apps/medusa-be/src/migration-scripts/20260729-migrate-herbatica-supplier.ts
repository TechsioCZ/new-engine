import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type {
  Context,
  ExecArgs,
  IProductModuleService,
  Logger,
  ProductDTO,
  Query,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { chunk } from "@techsio/std/array"
import { isRecord } from "@techsio/std/object"

import { ProductBrandLink } from "../links/product-brand"
import { BRAND_MODULE } from "../modules/brand"
import type BrandModuleService from "../modules/brand/service"
import {
  getProductAttributeService,
  normalizeRequiredProductAttributeKey,
  withProductAttributeTransaction,
} from "../utils/product-attributes"
import type {
  ProductAttributeAssignmentRecord,
  ProductAttributeDefinitionRecord,
  ProductAttributeOptionRecord,
} from "../utils/product-attributes"
import { getCurrentProductBrandLinks } from "../workflows/brand/steps/helpers"
import { setProductAttributesWorkflow } from "../workflows/product-attribute/workflows/set-product-attributes"

const BATCH_SIZE = 100
const HERBATICA_PRODUCT_SOURCE = "herbatica-products-complete-xml"
const SUPPLIER_DEFINITION_KEY = "supplier"
const SUPPLIER_DEFINITION_LABEL = "Supplier"

type ProductAttributeService = ReturnType<typeof getProductAttributeService>
type ProductAttributeContext = Context<SqlEntityManager>
type BrandAttributeRecord = Awaited<
  ReturnType<BrandModuleService["listBrandAttributes"]>
>[number]
type BrandAttributeTypeRecord = Awaited<
  ReturnType<BrandModuleService["listBrandAttributeTypes"]>
>[number]
interface ProductBrandLinkRecord {
  brand_id: string
  product_id: string
}

const productBrandLinkSchema = z.object({
  brand_id: z.string().min(1),
  product_id: z.string().min(1),
})

export interface LegacyBrandSupplier {
  brand_id: string
  deleted_at?: Date | null | string
  id: string
  value: string
}

export interface LegacySupplierAssignmentPlan {
  assignments: { product_id: string; supplier: string }[]
  unresolved: { product_id: string; reason: string; values: string[] }[]
}

const isHerbaticaProduct = (product: ProductDTO) =>
  isRecord(product.metadata) &&
  product.metadata["source"] === HERBATICA_PRODUCT_SOURCE

const normalizeLegacyName = (value: string) => value.trim().toLowerCase()

const isDeletedLegacyBrandSupplier = (value?: Date | null | string): boolean =>
  value !== undefined && value !== null && value !== ""

export const resolveLegacySupplierValuesByBrand = (
  attributes: LegacyBrandSupplier[],
) => {
  const attributesByBrand = new Map<string, LegacyBrandSupplier[]>()

  for (const attribute of attributes) {
    const current = attributesByBrand.get(attribute.brand_id) ?? []
    current.push(attribute)
    attributesByBrand.set(attribute.brand_id, current)
  }

  const ambiguousBrandIds = new Set<string>()
  const supplierByBrandId = new Map<string, string>()

  for (const [brandId, records] of attributesByBrand) {
    const trimmedValues: string[] = []
    for (const record of records) {
      if (isDeletedLegacyBrandSupplier(record.deleted_at)) {
        continue
      }
      const trimmed = record.value.trim()
      if (trimmed !== "") {
        trimmedValues.push(trimmed)
      }
    }
    const values = [...new Set(trimmedValues)]

    if (values.length > 1) {
      ambiguousBrandIds.add(brandId)
    } else {
      const [value] = values
      if (value !== undefined && value !== "") {
        supplierByBrandId.set(brandId, value)
      }
    }
  }

  return { ambiguousBrandIds, supplierByBrandId }
}

export const planLegacySupplierAssignments = ({
  activeAssignmentProductIds,
  ambiguousBrandIds,
  brandIdsByProductId,
  productIdsByBrandId,
  productIds,
  supplierByBrandId,
}: {
  activeAssignmentProductIds: Set<string>
  ambiguousBrandIds: Set<string>
  brandIdsByProductId: Map<string, string[]>
  productIdsByBrandId: Map<string, string[]>
  productIds: string[]
  supplierByBrandId: Map<string, string>
}): LegacySupplierAssignmentPlan => {
  const assignments: LegacySupplierAssignmentPlan["assignments"] = []
  const unresolved: LegacySupplierAssignmentPlan["unresolved"] = []

  for (const productId of productIds) {
    if (activeAssignmentProductIds.has(productId)) {
      continue
    }

    const brandIds = brandIdsByProductId.get(productId) ?? []
    const values = [
      ...new Set(
        brandIds
          .map((brandId) => supplierByBrandId.get(brandId))
          .filter((value): value is string => Boolean(value)),
      ),
    ]

    if (brandIds.some((brandId) => ambiguousBrandIds.has(brandId))) {
      unresolved.push({
        product_id: productId,
        reason: "the linked Brand has conflicting legacy Supplier records",
        values,
      })
    } else if (
      brandIds.some(
        (brandId) =>
          supplierByBrandId.has(brandId) &&
          (productIdsByBrandId.get(brandId)?.length ?? 0) !== 1,
      )
    ) {
      unresolved.push({
        product_id: productId,
        reason:
          "the Supplier belongs to a Brand linked to multiple Products, so the Product-level value cannot be proven",
        values,
      })
    } else if (values.length > 1) {
      unresolved.push({
        product_id: productId,
        reason: "the Product resolves to multiple legacy Supplier values",
        values,
      })
    } else {
      const [value] = values
      if (value !== undefined && value !== "") {
        assignments.push({ product_id: productId, supplier: value })
      }
    }
  }

  return { assignments, unresolved }
}

export const selectRemovableLegacySupplierBrandIds = ({
  coveredProductIds,
  herbaticaProductIds,
  productIdsByBrandId,
}: {
  coveredProductIds: Set<string>
  herbaticaProductIds: Set<string>
  productIdsByBrandId: Map<string, string[]>
}) =>
  new Set(
    [...productIdsByBrandId].flatMap(([brandId, productIds]) =>
      productIds.length &&
      productIds.every(
        (productId) =>
          herbaticaProductIds.has(productId) &&
          coveredProductIds.has(productId),
      )
        ? [brandId]
        : [],
    ),
  )

// Product pages are fetched in id order and each page's stop condition
// depends on the running offset and total from the previous page, so pages
// are walked sequentially through recursion instead of a loop.
const listHerbaticaProducts = async (
  productService: IProductModuleService,
  offset = 0,
): Promise<ProductDTO[]> => {
  const [page, pageCount] = await productService.listAndCountProducts(
    {},
    {
      order: { id: "ASC" },
      select: ["id", "metadata"],
      skip: offset,
      take: BATCH_SIZE,
    },
  )
  const matching = page.filter(isHerbaticaProduct)
  const nextOffset = offset + page.length

  if (page.length === 0 || nextOffset >= pageCount) {
    return matching
  }

  return [
    ...matching,
    ...(await listHerbaticaProducts(productService, nextOffset)),
  ]
}

// Brand attribute type pages are walked sequentially through recursion for
// the same reason as listHerbaticaProducts above.
const listSupplierAttributeTypes = async (
  service: BrandModuleService,
  offset = 0,
): Promise<BrandAttributeTypeRecord[]> => {
  const [page, pageCount] = await service.listAndCountBrandAttributeTypes(
    {},
    {
      order: { id: "ASC" },
      skip: offset,
      take: BATCH_SIZE,
      withDeleted: true,
    },
  )
  const matching = page.filter(
    (attributeType) =>
      normalizeLegacyName(attributeType.name) === SUPPLIER_DEFINITION_KEY,
  )
  const nextOffset = offset + page.length

  if (page.length === 0 || nextOffset >= pageCount) {
    return matching
  }

  return [
    ...matching,
    ...(await listSupplierAttributeTypes(service, nextOffset)),
  ]
}

const collectLegacySupplierAttributePage = async (
  service: BrandModuleService,
  attributeTypeIds: string[],
  brandIdBatch: string[],
  offset: number,
): Promise<BrandAttributeRecord[]> => {
  const [page, pageCount] = await service.listAndCountBrandAttributes(
    {
      attribute_type_id: { $in: attributeTypeIds },
      brand_id: { $in: brandIdBatch },
    },
    {
      order: { id: "ASC" },
      relations: ["attributeType"],
      skip: offset,
      take: BATCH_SIZE,
      withDeleted: true,
    },
  )
  const nextOffset = offset + page.length

  if (page.length === 0 || nextOffset >= pageCount) {
    return page
  }

  return [
    ...page,
    ...(await collectLegacySupplierAttributePage(
      service,
      attributeTypeIds,
      brandIdBatch,
      nextOffset,
    )),
  ]
}

// Brand id batches are queried sequentially, each fully paginated before the
// next batch starts, through recursion instead of a nested loop.
const collectLegacySupplierAttributeBatches = async (
  service: BrandModuleService,
  brandIdBatches: string[][],
  attributeTypeIds: string[],
): Promise<BrandAttributeRecord[]> => {
  const [brandIdBatch, ...remainingBatches] = brandIdBatches
  if (brandIdBatch === undefined) {
    return []
  }

  const batchAttributes = await collectLegacySupplierAttributePage(
    service,
    attributeTypeIds,
    brandIdBatch,
    0,
  )

  return [
    ...batchAttributes,
    ...(await collectLegacySupplierAttributeBatches(
      service,
      remainingBatches,
      attributeTypeIds,
    )),
  ]
}

const listLegacySupplierAttributes = async (
  service: BrandModuleService,
  brandIds: string[],
  attributeTypeIds: string[],
): Promise<BrandAttributeRecord[]> =>
  await collectLegacySupplierAttributeBatches(
    service,
    chunk(brandIds, BATCH_SIZE),
    attributeTypeIds,
  )

const findSupplierDefinition = async (
  service: ProductAttributeService,
): Promise<ProductAttributeDefinitionRecord | undefined> => {
  const definitions = await service.listProductAttributeDefinitions(
    { key: SUPPLIER_DEFINITION_KEY },
    { order: { id: "ASC" }, withDeleted: true },
  )
  const definition =
    definitions.find((candidate) => !candidate.deleted_at) ?? definitions[0]

  if (definition && definition.input_type !== "select") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Reserved Product Attribute "${SUPPLIER_DEFINITION_KEY}" must use input type "select", but persisted type is "${definition.input_type}"`,
    )
  }
  return definition
}

const collectProductAttributeAssignmentPage = async (
  service: ProductAttributeService,
  definitionId: string,
  productIdBatch: string[],
  offset: number,
): Promise<ProductAttributeAssignmentRecord[]> => {
  const [page, pageCount] = await service.listAndCountProductAttributes(
    {
      definition_id: definitionId,
      product_id: { $in: productIdBatch },
    },
    {
      order: { id: "ASC" },
      skip: offset,
      take: BATCH_SIZE,
      withDeleted: true,
    },
  )
  const nextOffset = offset + page.length

  if (page.length === 0 || nextOffset >= pageCount) {
    return page
  }

  return [
    ...page,
    ...(await collectProductAttributeAssignmentPage(
      service,
      definitionId,
      productIdBatch,
      nextOffset,
    )),
  ]
}

const collectProductAttributeAssignmentBatches = async (
  service: ProductAttributeService,
  definitionId: string,
  productIdBatches: string[][],
): Promise<ProductAttributeAssignmentRecord[]> => {
  const [productIdBatch, ...remainingBatches] = productIdBatches
  if (productIdBatch === undefined) {
    return []
  }

  const batchAssignments = await collectProductAttributeAssignmentPage(
    service,
    definitionId,
    productIdBatch,
    0,
  )

  return [
    ...batchAssignments,
    ...(await collectProductAttributeAssignmentBatches(
      service,
      definitionId,
      remainingBatches,
    )),
  ]
}

const collectActiveProductAttributeOptionIds = async (
  service: ProductAttributeService,
  optionIdBatches: string[][],
): Promise<string[]> => {
  const [optionIdBatch, ...remainingBatches] = optionIdBatches
  if (optionIdBatch === undefined) {
    return []
  }

  const options = await service.listProductAttributeOptions(
    { id: { $in: optionIdBatch } },
    { select: ["id"], take: optionIdBatch.length },
  )

  return [
    ...options.map(({ id }) => id),
    ...(await collectActiveProductAttributeOptionIds(
      service,
      remainingBatches,
    )),
  ]
}

const isActiveSupplierOptionAssignment = (
  assignment: ProductAttributeAssignmentRecord,
  activeOptionIds: Set<string>,
): boolean => {
  if (assignment.deleted_at) {
    return false
  }
  if (assignment.option_id === null || assignment.option_id === "") {
    return false
  }
  return activeOptionIds.has(assignment.option_id)
}

const listValidActiveSupplierAssignmentProductIds = async ({
  definition,
  productIds,
  service,
}: {
  definition?: ProductAttributeDefinitionRecord | undefined
  productIds: string[]
  service: ProductAttributeService
}): Promise<Set<string>> => {
  if (!definition) {
    return new Set<string>()
  }

  const assignments = await collectProductAttributeAssignmentBatches(
    service,
    definition.id,
    chunk(productIds, BATCH_SIZE),
  )

  const optionIds = [
    ...new Set(
      assignments.flatMap((assignment) =>
        !assignment.deleted_at &&
        assignment.option_id !== null &&
        assignment.option_id !== ""
          ? [assignment.option_id]
          : [],
      ),
    ),
  ]
  const activeOptionIds = new Set(
    await collectActiveProductAttributeOptionIds(
      service,
      chunk(optionIds, BATCH_SIZE),
    ),
  )

  return new Set(
    assignments.flatMap((assignment) =>
      isActiveSupplierOptionAssignment(assignment, activeOptionIds)
        ? [assignment.product_id]
        : [],
    ),
  )
}

export const collectSupplierLabelsByKey = (
  suppliers: string[],
): Map<string, string> => {
  const labelsByKey = new Map<string, string>()

  for (const label of suppliers) {
    const key = normalizeRequiredProductAttributeKey(
      label,
      "Supplier option key",
    )
    const collision = labelsByKey.get(key)
    if (collision !== undefined && collision !== "" && collision !== label) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Supplier option key collision from legacy labels "${collision}" and "${label}"`,
      )
    }
    labelsByKey.set(key, label)
  }

  return labelsByKey
}

const ensureSupplierDefinition = async (
  existing: ProductAttributeDefinitionRecord | undefined,
  service: ProductAttributeService,
  context: ProductAttributeContext,
): Promise<ProductAttributeDefinitionRecord> => {
  let definition = existing

  if (!definition) {
    definition = await service.createProductAttributeDefinitions(
      {
        input_type: "select",
        is_public: false,
        key: SUPPLIER_DEFINITION_KEY,
        label: SUPPLIER_DEFINITION_LABEL,
      },
      context,
    )
  } else if (definition.deleted_at) {
    await service.restoreProductAttributeDefinitions(
      [definition.id],
      {},
      context,
    )
  }

  return await service.updateProductAttributeDefinitions(
    {
      id: definition.id,
      is_public: false,
      label: SUPPLIER_DEFINITION_LABEL,
    },
    context,
  )
}

// Each label is reconciled sequentially because the create/restore/update
// calls share the same transaction context, so entries are walked through
// recursion instead of a for-of loop.
const ensureSupplierOptionEntries = async (
  definition: ProductAttributeDefinitionRecord,
  service: ProductAttributeService,
  context: ProductAttributeContext,
  optionByKey: Map<string, ProductAttributeOptionRecord>,
  entries: [string, string][],
): Promise<void> => {
  const [entry, ...remainingEntries] = entries
  if (entry === undefined) {
    return
  }
  const [key, label] = entry
  const option = optionByKey.get(key)

  if (option) {
    if (option.deleted_at) {
      await service.restoreProductAttributeOptions([option.id], {}, context)
    }
    optionByKey.set(
      key,
      await service.updateProductAttributeOptions(
        { id: option.id, label },
        context,
      ),
    )
  } else {
    const created = await service.createProductAttributeOptions(
      { definition_id: definition.id, key, label },
      context,
    )
    optionByKey.set(key, created)
  }

  await ensureSupplierOptionEntries(
    definition,
    service,
    context,
    optionByKey,
    remainingEntries,
  )
}

const ensureSupplierOptions = async (
  definition: ProductAttributeDefinitionRecord,
  labelsByKey: Map<string, string>,
  service: ProductAttributeService,
  context: ProductAttributeContext,
): Promise<Map<string, ProductAttributeOptionRecord>> => {
  const keys = [...labelsByKey.keys()]
  const existing = keys.length
    ? await service.listProductAttributeOptions(
        {
          definition_id: definition.id,
          key: { $in: keys },
        },
        { order: { id: "ASC" }, withDeleted: true },
        context,
      )
    : []
  const optionByKey = new Map<string, ProductAttributeOptionRecord>()
  for (const option of existing) {
    const current = optionByKey.get(option.key)
    if (!current || (current.deleted_at && !option.deleted_at)) {
      optionByKey.set(option.key, option)
    }
  }

  await ensureSupplierOptionEntries(definition, service, context, optionByKey, [
    ...labelsByKey,
  ])

  return optionByKey
}

const ensureSupplierCatalog = async ({
  definition,
  labelsByKey,
  service,
}: {
  definition?: ProductAttributeDefinitionRecord | undefined
  labelsByKey: Map<string, string>
  service: ProductAttributeService
}) =>
  await withProductAttributeTransaction(service, async (context) => {
    const ensuredDefinition = await ensureSupplierDefinition(
      definition,
      service,
      context,
    )
    const optionByKey = await ensureSupplierOptions(
      ensuredDefinition,
      labelsByKey,
      service,
      context,
    )
    return { definition: ensuredDefinition, optionByKey }
  })

// Brand id batches are queried sequentially through recursion instead of a
// loop, matching the other batched readers in this migration.
const collectProductBrandLinkBatches = async (
  query: Query,
  brandIdBatches: string[][],
): Promise<ProductBrandLinkRecord[]> => {
  const [brandIdBatch, ...remainingBatches] = brandIdBatches
  if (brandIdBatch === undefined) {
    return []
  }

  const { data } = await query.graph({
    entity: ProductBrandLink.entryPoint,
    fields: ["product_id", "brand_id"],
    filters: { brand_id: { $in: brandIdBatch } },
  })
  const rawLinks: unknown[] = data
  const links: ProductBrandLinkRecord[] = []
  for (const rawLink of rawLinks) {
    const parsed = productBrandLinkSchema.safeParse(rawLink)
    if (parsed.success) {
      links.push(parsed.data)
    }
  }

  return [
    ...links,
    ...(await collectProductBrandLinkBatches(query, remainingBatches)),
  ]
}

const listLinksByBrand = async (
  query: Query,
  brandIds: string[],
): Promise<ProductBrandLinkRecord[]> =>
  await collectProductBrandLinkBatches(query, chunk(brandIds, BATCH_SIZE))

const groupProductBrandLinks = (
  links: ProductBrandLinkRecord[],
  groupBy: "brand" | "product",
) => {
  const grouped = new Map<string, string[]>()

  for (const link of links) {
    const key = groupBy === "brand" ? link.brand_id : link.product_id
    const value = groupBy === "brand" ? link.product_id : link.brand_id
    const current = grouped.get(key) ?? []
    current.push(value)
    grouped.set(key, current)
  }

  return grouped
}

const logUnresolvedSupplierAssignments = (
  logger: Logger,
  unresolved: LegacySupplierAssignmentPlan["unresolved"],
) => {
  for (const item of unresolved) {
    logger.warn(
      `Skipped legacy Supplier for Product "${item.product_id}": ${item.reason}; values: ${item.values.join(", ") || "none"}`,
    )
  }
}

// Assignments are applied one product at a time because a failure partway
// through must leave later assignments untouched, so they are walked
// through recursion instead of a for-of loop.
const applySupplierAssignmentsSequentially = async (
  assignments: LegacySupplierAssignmentPlan["assignments"],
  container: ExecArgs["container"],
  definition: ProductAttributeDefinitionRecord,
  optionByKey: Map<string, ProductAttributeOptionRecord>,
  migratedProductIds: Set<string>,
): Promise<void> => {
  const [assignment, ...remainingAssignments] = assignments
  if (assignment === undefined) {
    return
  }

  const optionKey = normalizeRequiredProductAttributeKey(assignment.supplier)
  const option = optionByKey.get(optionKey)
  if (!option) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Supplier option "${optionKey}" was not reconciled for Product "${assignment.product_id}"`,
    )
  }
  await setProductAttributesWorkflow(container).run({
    input: {
      operations: [
        {
          action: "set",
          definition_id: definition.id,
          option_id: option.id,
        },
      ],
      product_id: assignment.product_id,
    },
  })
  migratedProductIds.add(assignment.product_id)

  await applySupplierAssignmentsSequentially(
    remainingAssignments,
    container,
    definition,
    optionByKey,
    migratedProductIds,
  )
}

const applySupplierAssignments = async ({
  assignments,
  container,
  definition,
  optionByKey,
}: {
  assignments: LegacySupplierAssignmentPlan["assignments"]
  container: ExecArgs["container"]
  definition: ProductAttributeDefinitionRecord
  optionByKey: Map<string, ProductAttributeOptionRecord>
}): Promise<Set<string>> => {
  const migratedProductIds = new Set<string>()

  await applySupplierAssignmentsSequentially(
    assignments,
    container,
    definition,
    optionByKey,
    migratedProductIds,
  )

  return migratedProductIds
}

// Attribute types are checked one at a time inside the same transaction
// context, so they are walked through recursion instead of a for-of loop.
const softDeleteEmptyBrandAttributeTypesSequentially = async (
  attributeTypes: BrandAttributeTypeRecord[],
  service: BrandModuleService,
  context: Context,
  deletedTypeIds: string[],
): Promise<void> => {
  const [attributeType, ...remainingAttributeTypes] = attributeTypes
  if (attributeType === undefined) {
    return
  }

  if (!attributeType.deleted_at) {
    const remaining = await service.listBrandAttributes(
      { attribute_type_id: attributeType.id },
      { select: ["id"], take: 1 },
      context,
    )
    if (!remaining.length) {
      await service.softDeleteBrandAttributeTypes(
        [attributeType.id],
        {},
        context,
      )
      deletedTypeIds.push(attributeType.id)
    }
  }

  await softDeleteEmptyBrandAttributeTypesSequentially(
    remainingAttributeTypes,
    service,
    context,
    deletedTypeIds,
  )
}

const cleanupMigratedBrandSupplierAttributes = async ({
  attributes,
  attributeTypes,
  coveredProductIds,
  herbaticaProductIds,
  productIdsByBrandId,
  service,
}: {
  attributes: BrandAttributeRecord[]
  attributeTypes: BrandAttributeTypeRecord[]
  coveredProductIds: Set<string>
  herbaticaProductIds: Set<string>
  productIdsByBrandId: Map<string, string[]>
  service: BrandModuleService
}) => {
  const removableBrandIds = selectRemovableLegacySupplierBrandIds({
    coveredProductIds,
    herbaticaProductIds,
    productIdsByBrandId,
  })
  const attributeIds = attributes.flatMap((attribute) =>
    !attribute.deleted_at && removableBrandIds.has(attribute.brand_id)
      ? [attribute.id]
      : [],
  )
  const deletedTypeIds: string[] = []

  await service.runInTransaction(async (context) => {
    if (attributeIds.length) {
      await service.softDeleteBrandAttributes(attributeIds, {}, context)
    }

    await softDeleteEmptyBrandAttributeTypesSequentially(
      attributeTypes,
      service,
      context,
      deletedTypeIds,
    )
  })

  return {
    attributeCount: attributeIds.length,
    attributeTypeCount: deletedTypeIds.length,
  }
}

export default async function migrateHerbaticaSupplier({
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve<IProductModuleService>(
    Modules.PRODUCT,
  )
  const products = await listHerbaticaProducts(productService)
  if (!products.length) {
    logger.info("No Herbatica Products require legacy Supplier migration")
    return
  }

  const productIds = products.map(({ id }) => id)
  const herbaticaProductIds = new Set(productIds)
  const rawProductLinks = await getCurrentProductBrandLinks(
    container,
    productIds,
  )
  const productLinks = rawProductLinks.flatMap((link) => {
    const parsed = productBrandLinkSchema.safeParse(link)
    return parsed.success ? [parsed.data] : []
  })
  const brandIds = [...new Set(productLinks.map(({ brand_id }) => brand_id))]
  if (!brandIds.length) {
    logger.info("No Herbatica Product Brand links contain legacy Suppliers")
    return
  }

  const brandService = container.resolve<BrandModuleService>(BRAND_MODULE)
  const attributeTypes = await listSupplierAttributeTypes(brandService)
  if (!attributeTypes.length) {
    logger.info("No legacy Brand Supplier attribute type was found")
    return
  }
  const attributes = await listLegacySupplierAttributes(
    brandService,
    brandIds,
    attributeTypes.map(({ id }) => id),
  )
  const legacySuppliers = attributes.map(
    ({ brand_id, deleted_at, id, value }) => ({
      brand_id,
      deleted_at,
      id,
      value,
    }),
  )
  const { ambiguousBrandIds, supplierByBrandId } =
    resolveLegacySupplierValuesByBrand(legacySuppliers)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const linksByBrand = await listLinksByBrand(query, brandIds)
  const productIdsByBrandId = groupProductBrandLinks(linksByBrand, "brand")
  const brandIdsByProductId = groupProductBrandLinks(productLinks, "product")

  const attributeService = getProductAttributeService(container)
  const existingDefinition = await findSupplierDefinition(attributeService)
  const activeAssignmentProductIds =
    await listValidActiveSupplierAssignmentProductIds({
      definition: existingDefinition,
      productIds,
      service: attributeService,
    })
  const plan = planLegacySupplierAssignments({
    activeAssignmentProductIds,
    ambiguousBrandIds,
    brandIdsByProductId,
    productIds,
    productIdsByBrandId,
    supplierByBrandId,
  })
  logUnresolvedSupplierAssignments(logger, plan.unresolved)
  if (!(plan.assignments.length || activeAssignmentProductIds.size)) {
    logger.info(
      `No provable legacy Supplier assignments were found; preserved ${plan.unresolved.length} unresolved Product record(s)`,
    )
    return
  }

  const labelsByKey = collectSupplierLabelsByKey(
    plan.assignments.map(({ supplier }) => supplier),
  )
  const coveredProductIds = new Set(activeAssignmentProductIds)

  const { definition, optionByKey } = await ensureSupplierCatalog({
    definition: existingDefinition,
    labelsByKey,
    service: attributeService,
  })
  const migratedProductIds = await applySupplierAssignments({
    assignments: plan.assignments,
    container,
    definition,
    optionByKey,
  })
  for (const productId of migratedProductIds) {
    coveredProductIds.add(productId)
  }

  const cleanup = await cleanupMigratedBrandSupplierAttributes({
    attributeTypes,
    attributes,
    coveredProductIds,
    herbaticaProductIds,
    productIdsByBrandId,
    service: brandService,
  })

  logger.info(
    `Migrated ${plan.assignments.length} legacy Brand Supplier assignment(s); preserved ${activeAssignmentProductIds.size} existing structured assignment(s) and ${plan.unresolved.length} unresolved legacy record(s); removed ${cleanup.attributeCount} legacy Brand attribute(s) and ${cleanup.attributeTypeCount} unused type(s)`,
  )
}
