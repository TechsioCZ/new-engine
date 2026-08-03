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
import { chunk } from "@techsio/std/array"
import { isRecord } from "@techsio/std/object"

import { ProductBrandLink } from "../links/product-brand"
import { BRAND_MODULE } from "../modules/brand"
import type BrandModuleService from "../modules/brand/service"
import {
  getProductAttributeService,
  normalizeRequiredProductAttributeKey,
  type ProductAttributeAssignmentRecord,
  type ProductAttributeDefinitionRecord,
  type ProductAttributeOptionRecord,
  withProductAttributeTransaction,
} from "../utils/product-attributes"
import { getCurrentProductBrandLinks } from "../workflows/brand"
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
type ProductBrandLinkRecord = {
  brand_id?: string
  product_id?: string
}

export type LegacyBrandSupplier = {
  brand_id: string
  deleted_at?: Date | null | string
  id: string
  value: string
}

export type LegacySupplierAssignmentPlan = {
  assignments: Array<{ product_id: string; supplier: string }>
  unresolved: Array<{ product_id: string; reason: string; values: string[] }>
}

const isHerbaticaProduct = (product: ProductDTO) =>
  isRecord(product.metadata) &&
  product.metadata["source"] === HERBATICA_PRODUCT_SOURCE

const normalizeLegacyName = (value: string) => value.trim().toLowerCase()

export const resolveLegacySupplierValuesByBrand = (
  attributes: LegacyBrandSupplier[]
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
    const values = [
      ...new Set(
        records
          .filter((record) => !record.deleted_at)
          .map(({ value }) => value.trim())
          .filter(Boolean)
      ),
    ]

    if (values.length > 1) {
      ambiguousBrandIds.add(brandId)
    } else if (values[0]) {
      supplierByBrandId.set(brandId, values[0])
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
          .filter((value): value is string => Boolean(value))
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
          (productIdsByBrandId.get(brandId)?.length ?? 0) !== 1
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
    } else if (values[0]) {
      assignments.push({ product_id: productId, supplier: values[0] })
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
          herbaticaProductIds.has(productId) && coveredProductIds.has(productId)
      )
        ? [brandId]
        : []
    )
  )

async function listHerbaticaProducts(productService: IProductModuleService) {
  const products: ProductDTO[] = []
  let offset = 0
  let count = Number.POSITIVE_INFINITY

  while (offset < count) {
    const [page, pageCount] = await productService.listAndCountProducts(
      {},
      {
        order: { id: "ASC" },
        select: ["id", "metadata"],
        skip: offset,
        take: BATCH_SIZE,
      }
    )
    products.push(...page.filter(isHerbaticaProduct))
    count = pageCount
    if (!page.length) {
      break
    }
    offset += page.length
  }

  return products
}

async function listSupplierAttributeTypes(service: BrandModuleService) {
  const matching: BrandAttributeTypeRecord[] = []
  let offset = 0
  let count = Number.POSITIVE_INFINITY

  while (offset < count) {
    const [page, pageCount] = (await service.listAndCountBrandAttributeTypes(
      {},
      {
        order: { id: "ASC" },
        skip: offset,
        take: BATCH_SIZE,
        withDeleted: true,
      }
    )) as [BrandAttributeTypeRecord[], number]
    matching.push(
      ...page.filter(
        (attributeType) =>
          normalizeLegacyName(attributeType.name) === SUPPLIER_DEFINITION_KEY
      )
    )
    count = pageCount
    if (!page.length) {
      break
    }
    offset += page.length
  }

  return matching
}

async function listLegacySupplierAttributes(
  service: BrandModuleService,
  brandIds: string[],
  attributeTypeIds: string[]
) {
  const attributes: BrandAttributeRecord[] = []

  for (const brandIdBatch of chunk(brandIds, BATCH_SIZE)) {
    let offset = 0
    let count = Number.POSITIVE_INFINITY

    while (offset < count) {
      const [page, pageCount] = (await service.listAndCountBrandAttributes(
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
        }
      )) as [BrandAttributeRecord[], number]
      attributes.push(...page)
      count = pageCount
      if (!page.length) {
        break
      }
      offset += page.length
    }
  }

  return attributes
}

async function findSupplierDefinition(service: ProductAttributeService) {
  const definitions = (await service.listProductAttributeDefinitions(
    { key: SUPPLIER_DEFINITION_KEY },
    { order: { id: "ASC" }, withDeleted: true }
  )) as ProductAttributeDefinitionRecord[]
  const definition =
    definitions.find((candidate) => !candidate.deleted_at) ?? definitions[0]

  if (definition && definition.input_type !== "select") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Reserved Product Attribute "${SUPPLIER_DEFINITION_KEY}" must use input type "select", but persisted type is "${definition.input_type}"`
    )
  }
  return definition
}

async function listValidActiveSupplierAssignmentProductIds({
  definition,
  productIds,
  service,
}: {
  definition?: ProductAttributeDefinitionRecord | undefined
  productIds: string[]
  service: ProductAttributeService
}) {
  if (!definition) {
    return new Set<string>()
  }

  const assignments: ProductAttributeAssignmentRecord[] = []
  for (const productIdBatch of chunk(productIds, BATCH_SIZE)) {
    let offset = 0
    let count = Number.POSITIVE_INFINITY

    while (offset < count) {
      const [page, pageCount] = (await service.listAndCountProductAttributes(
        {
          definition_id: definition.id,
          product_id: { $in: productIdBatch },
        },
        {
          order: { id: "ASC" },
          skip: offset,
          take: BATCH_SIZE,
          withDeleted: true,
        }
      )) as [ProductAttributeAssignmentRecord[], number]
      assignments.push(...page)
      count = pageCount
      if (!page.length) {
        break
      }
      offset += page.length
    }
  }

  const optionIds = [
    ...new Set(
      assignments.flatMap((assignment) =>
        !assignment.deleted_at && assignment.option_id
          ? [assignment.option_id]
          : []
      )
    ),
  ]
  const activeOptionIds = new Set<string>()

  for (const optionIdBatch of chunk(optionIds, BATCH_SIZE)) {
    const options = (await service.listProductAttributeOptions(
      { id: { $in: optionIdBatch } },
      { select: ["id"], take: optionIdBatch.length }
    )) as ProductAttributeOptionRecord[]
    for (const option of options) {
      activeOptionIds.add(option.id)
    }
  }

  return new Set(
    assignments.flatMap((assignment) =>
      !assignment.deleted_at &&
      assignment.option_id &&
      activeOptionIds.has(assignment.option_id)
        ? [assignment.product_id]
        : []
    )
  )
}

export function collectSupplierLabelsByKey(suppliers: string[]) {
  const labelsByKey = new Map<string, string>()

  for (const label of suppliers) {
    const key = normalizeRequiredProductAttributeKey(
      label,
      "Supplier option key"
    )
    const collision = labelsByKey.get(key)
    if (collision && collision !== label) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Supplier option key collision from legacy labels "${collision}" and "${label}"`
      )
    }
    labelsByKey.set(key, label)
  }

  return labelsByKey
}

async function ensureSupplierDefinition(
  existing: ProductAttributeDefinitionRecord | undefined,
  service: ProductAttributeService,
  context: ProductAttributeContext
) {
  let definition = existing

  if (!definition) {
    definition = (await service.createProductAttributeDefinitions(
      {
        input_type: "select",
        is_public: false,
        key: SUPPLIER_DEFINITION_KEY,
        label: SUPPLIER_DEFINITION_LABEL,
      },
      context
    )) as ProductAttributeDefinitionRecord
  } else if (definition.deleted_at) {
    await service.restoreProductAttributeDefinitions(
      [definition.id],
      {},
      context
    )
  }

  return (await service.updateProductAttributeDefinitions(
    {
      id: definition.id,
      is_public: false,
      label: SUPPLIER_DEFINITION_LABEL,
    },
    context
  )) as ProductAttributeDefinitionRecord
}

async function ensureSupplierOptions(
  definition: ProductAttributeDefinitionRecord,
  labelsByKey: Map<string, string>,
  service: ProductAttributeService,
  context: ProductAttributeContext
) {
  const keys = [...labelsByKey.keys()]
  const existing = keys.length
    ? ((await service.listProductAttributeOptions(
        {
          definition_id: definition.id,
          key: { $in: keys },
        },
        { order: { id: "ASC" }, withDeleted: true },
        context
      )) as ProductAttributeOptionRecord[])
    : []
  const optionByKey = new Map<string, ProductAttributeOptionRecord>()
  for (const option of existing) {
    const current = optionByKey.get(option.key)
    if (!current || (current.deleted_at && !option.deleted_at)) {
      optionByKey.set(option.key, option)
    }
  }

  for (const [key, label] of labelsByKey) {
    const option = optionByKey.get(key)
    if (!option) {
      const created = (await service.createProductAttributeOptions(
        { definition_id: definition.id, key, label },
        context
      )) as ProductAttributeOptionRecord
      optionByKey.set(key, created)
      continue
    }
    if (option.deleted_at) {
      await service.restoreProductAttributeOptions([option.id], {}, context)
    }
    optionByKey.set(
      key,
      (await service.updateProductAttributeOptions(
        { id: option.id, label },
        context
      )) as ProductAttributeOptionRecord
    )
  }

  return optionByKey
}

async function ensureSupplierCatalog({
  definition,
  labelsByKey,
  service,
}: {
  definition?: ProductAttributeDefinitionRecord | undefined
  labelsByKey: Map<string, string>
  service: ProductAttributeService
}) {
  return await withProductAttributeTransaction(service, async (context) => {
    const ensuredDefinition = await ensureSupplierDefinition(
      definition,
      service,
      context
    )
    const optionByKey = await ensureSupplierOptions(
      ensuredDefinition,
      labelsByKey,
      service,
      context
    )
    return { definition: ensuredDefinition, optionByKey }
  })
}

async function listLinksByBrand(
  query: Query,
  brandIds: string[]
): Promise<Required<ProductBrandLinkRecord>[]> {
  const links: Required<ProductBrandLinkRecord>[] = []

  for (const brandIdBatch of chunk(brandIds, BATCH_SIZE)) {
    const { data } = await query.graph({
      entity: ProductBrandLink.entryPoint,
      fields: ["product_id", "brand_id"],
      filters: { brand_id: { $in: brandIdBatch } },
    })
    links.push(
      ...(data as ProductBrandLinkRecord[]).filter(
        (link): link is Required<ProductBrandLinkRecord> =>
          Boolean(link.product_id && link.brand_id)
      )
    )
  }

  return links
}

const groupProductBrandLinks = (
  links: Required<ProductBrandLinkRecord>[],
  groupBy: "brand" | "product"
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
  unresolved: LegacySupplierAssignmentPlan["unresolved"]
) => {
  for (const item of unresolved) {
    logger.warn(
      `Skipped legacy Supplier for Product "${item.product_id}": ${item.reason}; values: ${item.values.join(", ") || "none"}`
    )
  }
}

async function applySupplierAssignments({
  assignments,
  container,
  definition,
  optionByKey,
}: {
  assignments: LegacySupplierAssignmentPlan["assignments"]
  container: ExecArgs["container"]
  definition: ProductAttributeDefinitionRecord
  optionByKey: Map<string, ProductAttributeOptionRecord>
}) {
  const migratedProductIds = new Set<string>()

  for (const assignment of assignments) {
    const optionKey = normalizeRequiredProductAttributeKey(assignment.supplier)
    const option = optionByKey.get(optionKey)
    if (!option) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Supplier option "${optionKey}" was not reconciled for Product "${assignment.product_id}"`
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
  }

  return migratedProductIds
}

async function cleanupMigratedBrandSupplierAttributes({
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
}) {
  const removableBrandIds = selectRemovableLegacySupplierBrandIds({
    coveredProductIds,
    herbaticaProductIds,
    productIdsByBrandId,
  })
  const attributeIds = attributes.flatMap((attribute) =>
    !attribute.deleted_at && removableBrandIds.has(attribute.brand_id)
      ? [attribute.id]
      : []
  )
  const deletedTypeIds: string[] = []

  await service.runInTransaction(async (context) => {
    if (attributeIds.length) {
      await service.softDeleteBrandAttributes(attributeIds, {}, context)
    }

    for (const attributeType of attributeTypes) {
      if (attributeType.deleted_at) {
        continue
      }
      const remaining = await service.listBrandAttributes(
        { attribute_type_id: attributeType.id },
        { select: ["id"], take: 1 },
        context
      )
      if (!remaining.length) {
        await service.softDeleteBrandAttributeTypes(
          [attributeType.id],
          {},
          context
        )
        deletedTypeIds.push(attributeType.id)
      }
    }
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
    Modules.PRODUCT
  )
  const products = await listHerbaticaProducts(productService)
  if (!products.length) {
    logger.info("No Herbatica Products require legacy Supplier migration")
    return
  }

  const productIds = products.map(({ id }) => id)
  const herbaticaProductIds = new Set(productIds)
  const productLinks = await getCurrentProductBrandLinks(container, productIds)
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
    attributeTypes.map(({ id }) => id)
  )
  const legacySuppliers = attributes.map(
    ({ brand_id, deleted_at, id, value }) => ({
      brand_id,
      deleted_at,
      id,
      value,
    })
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
    productIdsByBrandId,
    productIds,
    supplierByBrandId,
  })
  logUnresolvedSupplierAssignments(logger, plan.unresolved)
  if (!(plan.assignments.length || activeAssignmentProductIds.size)) {
    logger.info(
      `No provable legacy Supplier assignments were found; preserved ${plan.unresolved.length} unresolved Product record(s)`
    )
    return
  }

  const labelsByKey = collectSupplierLabelsByKey(
    plan.assignments.map(({ supplier }) => supplier)
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
    attributes,
    attributeTypes,
    coveredProductIds,
    herbaticaProductIds,
    productIdsByBrandId,
    service: brandService,
  })

  logger.info(
    `Migrated ${plan.assignments.length} legacy Brand Supplier assignment(s); preserved ${activeAssignmentProductIds.size} existing structured assignment(s) and ${plan.unresolved.length} unresolved legacy record(s); removed ${cleanup.attributeCount} legacy Brand attribute(s) and ${cleanup.attributeTypeCount} unused type(s)`
  )
}
