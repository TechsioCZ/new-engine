import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type {
  Context,
  ExecArgs,
  IProductModuleService,
  Logger,
  ProductDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { isRecord } from "@techsio/std/object"

import {
  getProductAttributeService,
  normalizeRequiredProductAttributeKey,
  withProductAttributeTransaction,
} from "../utils/product-attributes"
import type {
  ProductAttributeDefinitionRecord,
  ProductAttributeOptionRecord,
} from "../utils/product-attributes"
import { setProductAttributesWorkflow } from "../workflows/product-attribute/workflows/set-product-attributes"

const PRODUCT_PAGE_SIZE = 100
const HERBATICA_PRODUCT_SOURCE = "herbatica-products-complete-xml"
const WARRANTY_DEFINITION_KEY = "warranty"
const WARRANTY_DEFINITION_LABEL = "Warranty"
const CONTENT_SECTION_KEYS = [
  "description",
  "usage",
  "composition",
  "warning",
  "other",
] as const
const HTML_TAG_REGEX = /<[a-z][\s\S]*?>/i

type ProductMetadata = Record<string, unknown>
interface ContentSection {
  html: string
  key: string
  title: string
}

export type LegacyWarrantyMigrationPreparation =
  | { reason: string; safe: false }
  | {
      metadata: ProductMetadata
      safe: true
      warranty: string
    }

interface UnsafeProduct {
  id: string
  reason: string
}

type ProductAttributeService = ReturnType<typeof getProductAttributeService>
type ProductAttributeContext = Context<SqlEntityManager>

export const isLegacyHerbaticaWarrantyMetadata = (
  metadata: unknown
): metadata is ProductMetadata =>
  isRecord(metadata) &&
  metadata["source"] === HERBATICA_PRODUCT_SOURCE &&
  typeof metadata["warranty"] === "string"

const escapeHtml = (value: string) =>
  value
    .replaceAll(/&/g, "&amp;")
    .replaceAll(/</g, "&lt;")
    .replaceAll(/>/g, "&gt;")
    .replaceAll(/"/g, "&quot;")
    .replaceAll(/'/g, "&#39;")

export const buildLegacyWarrantyFragment = (value: string) => {
  const normalized = value.replaceAll(/\r\n/g, "\n").trim()
  return HTML_TAG_REGEX.test(normalized)
    ? `<h3>Zaruka</h3>\n${normalized}`
    : `<p><strong>Zaruka:</strong> ${escapeHtml(normalized)}</p>`
}

const removeExactFragment = (html: string, fragment: string) => {
  const firstIndex = html.indexOf(fragment)
  if (
    firstIndex === -1 ||
    html.includes(fragment, firstIndex + fragment.length)
  ) {
    return
  }

  let before = html.slice(0, firstIndex)
  let after = html.slice(firstIndex + fragment.length)
  if (before.endsWith("\n")) {
    before = before.slice(0, -1)
  } else if (after.startsWith("\n")) {
    after = after.slice(1)
  }
  return `${before}${after}`
}

const parseContentSections = (value: unknown): ContentSection[] | undefined => {
  if (!Array.isArray(value) || value.length !== CONTENT_SECTION_KEYS.length) {
    return
  }
  const sections = value.filter(
    (section): section is ContentSection =>
      isRecord(section) &&
      typeof section["key"] === "string" &&
      typeof section["title"] === "string" &&
      typeof section["html"] === "string"
  )
  if (
    sections.length !== CONTENT_SECTION_KEYS.length ||
    sections.some(
      (section, index) => section.key !== CONTENT_SECTION_KEYS[index]
    )
  ) {
    return
  }
  return sections
}

export function prepareLegacyWarrantyMigration(
  metadata: ProductMetadata
): LegacyWarrantyMigrationPreparation {
  const warranty =
    typeof metadata["warranty"] === "string"
      ? metadata["warranty"].replaceAll(/\r\n/g, "\n").trim()
      : ""
  if (!warranty) {
    return { reason: "metadata.warranty is absent or empty", safe: false }
  }

  const sections = parseContentSections(metadata["content_sections"])
  const sectionsMap = metadata["content_sections_map"]
  if (!(sections && isRecord(sectionsMap))) {
    return {
      reason: "legacy content_sections shape is not the expected fixed shape",
      safe: false,
    }
  }
  const otherIndex = sections.findIndex(({ key }) => key === "other")
  const otherHtml = sections[otherIndex]?.html
  const mappedOtherHtml = sectionsMap["other"]
  if (
    otherIndex === -1 ||
    typeof otherHtml !== "string" ||
    typeof mappedOtherHtml !== "string" ||
    otherHtml !== mappedOtherHtml
  ) {
    return {
      reason: "content_sections and content_sections_map disagree for other",
      safe: false,
    }
  }

  const fragment = buildLegacyWarrantyFragment(warranty)
  const nextOtherHtml = removeExactFragment(otherHtml, fragment)
  if (nextOtherHtml === undefined) {
    return {
      reason:
        "the exact generated Warranty fragment was not found exactly once",
      safe: false,
    }
  }

  const { warranty: _warranty, ...metadataWithoutWarranty } = metadata
  return {
    metadata: {
      ...metadataWithoutWarranty,
      content_sections: sections.map((section, index) =>
        index === otherIndex ? { ...section, html: nextOtherHtml } : section
      ),
      content_sections_map: {
        ...sectionsMap,
        other: nextOtherHtml,
      },
    },
    safe: true,
    warranty,
  }
}

async function listProductsWithLegacyWarranty(
  productService: IProductModuleService
) {
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
        take: PRODUCT_PAGE_SIZE,
      }
    )
    products.push(
      ...page.filter((product) =>
        isLegacyHerbaticaWarrantyMetadata(product.metadata)
      )
    )
    count = pageCount
    if (page.length === 0) {
      break
    }
    offset += page.length
  }

  return products
}

async function ensureWarrantyDefinition(
  service: ProductAttributeService,
  context: ProductAttributeContext
) {
  const definitions = await service.listProductAttributeDefinitions(
    { key: WARRANTY_DEFINITION_KEY },
    { order: { id: "ASC" }, withDeleted: true },
    context
  )
  const definition =
    definitions.find((candidate) => !candidate.deleted_at) ?? definitions[0]
  if (definition && definition.input_type !== "select") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Reserved Product Attribute "${WARRANTY_DEFINITION_KEY}" must use input type "select", but persisted type is "${definition.input_type}"`
    )
  }
  if (!definition) {
    return await service.createProductAttributeDefinitions(
      {
        input_type: "select",
        is_public: true,
        key: WARRANTY_DEFINITION_KEY,
        label: WARRANTY_DEFINITION_LABEL,
      },
      context
    )
  }
  if (definition.deleted_at) {
    await service.restoreProductAttributeDefinitions(
      [definition.id],
      {},
      context
    )
  }
  return await service.updateProductAttributeDefinitions(
    {
      id: definition.id,
      is_public: true,
      label: WARRANTY_DEFINITION_LABEL,
    },
    context
  )
}

function collectWarrantyLabelsByKey(warranties: string[]) {
  const labelsByKey = new Map<string, string>()
  for (const label of warranties) {
    const key = normalizeRequiredProductAttributeKey(
      label,
      "Warranty option key"
    )
    const collision = labelsByKey.get(key)
    if (collision && collision !== label) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Warranty option key collision from legacy labels "${collision}" and "${label}"`
      )
    }
    labelsByKey.set(key, label)
  }
  return labelsByKey
}

async function ensureWarrantyOptions(
  definition: ProductAttributeDefinitionRecord,
  warranties: string[],
  service: ProductAttributeService,
  context: ProductAttributeContext
) {
  const labelsByKey = collectWarrantyLabelsByKey(warranties)
  const keys = [...labelsByKey.keys()]
  const existing = await service.listProductAttributeOptions(
    {
      definition_id: definition.id,
      key: { $in: keys },
    },
    { order: { id: "ASC" }, withDeleted: true },
    context
  )
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
      const created = await service.createProductAttributeOptions(
        { definition_id: definition.id, key, label },
        context
      )
      optionByKey.set(key, created)
      continue
    }
    if (option.deleted_at) {
      await service.restoreProductAttributeOptions([option.id], {}, context)
    }
    const updated = await service.updateProductAttributeOptions(
      { id: option.id, label },
      context
    )
    optionByKey.set(key, updated)
  }

  return optionByKey
}

async function ensureWarrantyDefinitionAndOptions(
  warranties: string[],
  service: ProductAttributeService
) {
  return await withProductAttributeTransaction(service, async (context) => {
    const definition = await ensureWarrantyDefinition(service, context)
    const optionByKey = await ensureWarrantyOptions(
      definition,
      warranties,
      service,
      context
    )
    return { definition, optionByKey }
  })
}

export default async function migrateHerbaticaWarranty({
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve<IProductModuleService>(
    Modules.PRODUCT
  )
  const products = await listProductsWithLegacyWarranty(productService)
  const safe: {
    id: string
    metadata: ProductMetadata
    warranty: string
  }[] = []
  const unsafe: UnsafeProduct[] = []

  for (const product of products) {
    const preparation = prepareLegacyWarrantyMigration(
      product.metadata as ProductMetadata
    )
    if (preparation.safe) {
      safe.push({ id: product.id, ...preparation })
    } else {
      unsafe.push({ id: product.id, reason: preparation.reason })
    }
  }

  if (unsafe.length) {
    for (const product of unsafe) {
      logger.error(
        `Unsafe legacy Warranty data for Product "${product.id}": ${product.reason}`
      )
    }
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Herbatica Warranty migration found ${unsafe.length} unsafe Product record(s); no Product Attribute or Product metadata was changed`
    )
  }

  if (!safe.length) {
    logger.info("No legacy Herbatica Warranty metadata requires migration")
    return
  }

  const service = getProductAttributeService(container)
  const { definition, optionByKey } = await ensureWarrantyDefinitionAndOptions(
    safe.map(({ warranty }) => warranty),
    service
  )
  let migrated = 0
  for (const product of safe) {
    const optionKey = normalizeRequiredProductAttributeKey(product.warranty)
    const option = optionByKey.get(optionKey)
    if (!option) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Warranty option "${optionKey}" was not reconciled for Product "${product.id}"`
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
        product_id: product.id,
      },
    })
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: product.id },
        update: { metadata: product.metadata },
      },
    })
    migrated += 1
  }

  logger.info(
    `Migrated ${migrated} legacy Herbatica Warranty Product record(s)`
  )
}
