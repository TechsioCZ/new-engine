import type { Context, MedusaContainer, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { chunk } from "@techsio/std/array"
import { isRecord } from "@techsio/std/object"

import { ProductBrandLink } from "../../../links/product-brand"
import { BRAND_MODULE } from "../../../modules/brand"
import type BrandModuleService from "../../../modules/brand/service"
import type { BrandAttributeInput } from "../types"
import { normalizeBrandWriteInput } from "./validation"
import type { BrandScalarWriteInput } from "./validation"

export { getActiveBrandIds } from "../brand-activity"
export { getProductBrandIdsToReplace } from "./brand-link-state"

interface BrandAttributeRecord {
  id: string
  value: string
  attributeType?: {
    name: string
  }
}

interface BrandSnapshot {
  id: string
  title: string
  handle: string
  attributes: BrandAttributeInput[]
  gpsr_contact_email?: string | null
  gpsr_european_reseller_contact_email?: string | null
  gpsr_european_reseller_manufacturing_company_name?: string | null
  gpsr_european_reseller_postal_address?: string | null
  gpsr_manufactured_outside_eu?: boolean
  gpsr_manufacturing_company_name?: string | null
  gpsr_postal_address?: string | null
}

interface BrandSnapshotRecord {
  id: string
  title: string
  handle: string
  attributes: (BrandAttributeRecord & {
    attributeType: {
      id?: string
      name: string
    }
  })[]
  gpsr_contact_email?: string | null
  gpsr_european_reseller_contact_email?: string | null
  gpsr_european_reseller_manufacturing_company_name?: string | null
  gpsr_european_reseller_postal_address?: string | null
  gpsr_manufactured_outside_eu?: boolean | null
  gpsr_manufacturing_company_name?: string | null
  gpsr_postal_address?: string | null
}

interface ProductBrandLinkRecord {
  product_id?: string
  brand_id?: string
}

const CHUNK_SIZE = 500
const QUERY_CONCURRENCY = 4

const mapWithConcurrency = async <T, R>(
  items: T[],
  task: (item: T) => Promise<R>,
  offset = 0,
  results: R[] = [],
): Promise<R[]> => {
  if (offset >= items.length) {
    return results
  }
  const currentResults = await Promise.all(
    items
      .slice(offset, offset + QUERY_CONCURRENCY)
      .map(async (item) => await task(item)),
  )
  return await mapWithConcurrency(items, task, offset + QUERY_CONCURRENCY, [
    ...results,
    ...currentResults,
  ])
}

export const getBrandService = (container: MedusaContainer) =>
  container.resolve<BrandModuleService>(BRAND_MODULE)

export const withBrandTransaction = async <T>(
  service: BrandModuleService,
  task: (sharedContext: Context) => Promise<T>,
) => await service.runInTransaction(task)

const isBrandSnapshotRecord = (
  brand: unknown,
): brand is BrandSnapshotRecord => {
  if (!isRecord(brand)) {
    return false
  }

  const manufacturedOutsideEu = brand["gpsr_manufactured_outside_eu"]
  const hasRequiredFields = [
    typeof brand["id"] === "string",
    typeof brand["title"] === "string",
    typeof brand["handle"] === "string",
    Array.isArray(brand["attributes"]),
    manufacturedOutsideEu === undefined ||
      manufacturedOutsideEu === null ||
      typeof manufacturedOutsideEu === "boolean",
  ].every(Boolean)
  if (!hasRequiredFields || !Array.isArray(brand["attributes"])) {
    return false
  }

  return brand["attributes"].every((attribute) => {
    if (!isRecord(attribute) || typeof attribute["value"] !== "string") {
      return false
    }

    return (
      isRecord(attribute["attributeType"]) &&
      typeof attribute["attributeType"]["name"] === "string"
    )
  })
}

const assertBrandSnapshotRecord: (
  brand: unknown,
  brandId: string,
) => asserts brand is BrandSnapshotRecord = (
  brand: unknown,
  brandId: string,
) => {
  if (isBrandSnapshotRecord(brand)) {
    return
  }

  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    `Brand "${brandId}" was retrieved without the fields required for a workflow snapshot`,
  )
}

export const snapshotBrand = async (
  service: BrandModuleService,
  brandId: string,
  sharedContext: Context = {},
): Promise<BrandSnapshot> => {
  const brand = await service.retrieveBrand(
    brandId,
    {
      relations: ["attributes", "attributes.attributeType"],
    },
    sharedContext,
  )

  assertBrandSnapshotRecord(brand, brandId)

  return {
    attributes: brand.attributes.map((attribute) => ({
      name: attribute.attributeType.name,
      value: attribute.value,
    })),
    gpsr_contact_email: brand.gpsr_contact_email ?? null,
    gpsr_european_reseller_contact_email:
      brand.gpsr_european_reseller_contact_email ?? null,
    gpsr_european_reseller_manufacturing_company_name:
      brand.gpsr_european_reseller_manufacturing_company_name ?? null,
    gpsr_european_reseller_postal_address:
      brand.gpsr_european_reseller_postal_address ?? null,
    gpsr_manufactured_outside_eu: brand.gpsr_manufactured_outside_eu ?? false,
    gpsr_manufacturing_company_name:
      brand.gpsr_manufacturing_company_name ?? null,
    gpsr_postal_address: brand.gpsr_postal_address ?? null,
    handle: brand.handle,
    id: brand.id,
    title: brand.title,
  }
}

const pickBrandWriteFields = (brand: BrandScalarWriteInput) => ({
  ...(brand.handle === undefined ? {} : { handle: brand.handle }),
  ...(brand.title === undefined ? {} : { title: brand.title }),
  ...(brand.gpsr_contact_email === undefined
    ? {}
    : { gpsr_contact_email: brand.gpsr_contact_email }),
  ...(brand.gpsr_european_reseller_contact_email === undefined
    ? {}
    : {
        gpsr_european_reseller_contact_email:
          brand.gpsr_european_reseller_contact_email,
      }),
  ...(brand.gpsr_european_reseller_manufacturing_company_name === undefined
    ? {}
    : {
        gpsr_european_reseller_manufacturing_company_name:
          brand.gpsr_european_reseller_manufacturing_company_name,
      }),
  ...(brand.gpsr_european_reseller_postal_address === undefined
    ? {}
    : {
        gpsr_european_reseller_postal_address:
          brand.gpsr_european_reseller_postal_address,
      }),
  ...(brand.gpsr_manufactured_outside_eu === undefined
    ? {}
    : { gpsr_manufactured_outside_eu: brand.gpsr_manufactured_outside_eu }),
  ...(brand.gpsr_manufacturing_company_name === undefined
    ? {}
    : {
        gpsr_manufacturing_company_name: brand.gpsr_manufacturing_company_name,
      }),
  ...(brand.gpsr_postal_address === undefined
    ? {}
    : { gpsr_postal_address: brand.gpsr_postal_address }),
})

export const setBrandAttributes = async (
  service: BrandModuleService,
  brandId: string,
  inputAttributes: BrandAttributeInput[] = [],
  sharedContext: Context = {},
) => {
  await service.setBrandAttributes(brandId, inputAttributes, sharedContext)
}

export const buildBrandWriteInput = (brand: BrandScalarWriteInput) =>
  pickBrandWriteFields(normalizeBrandWriteInput(brand))

export const brandProductLink = (productId: string, brandId: string) => ({
  [Modules.PRODUCT]: {
    product_id: productId,
  },
  [BRAND_MODULE]: {
    brand_id: brandId,
  },
})

export const getProductBrandLockKeys = (productIds: string[]) => [
  "product-brand-relations",
  ...[...new Set(productIds)]
    .toSorted()
    .map((productId) => `product-brand:${productId}`),
]

export const getBrandMutationLockKeys = (brandIds: string[]) =>
  [...new Set(brandIds)].toSorted().map((brandId) => `brand:${brandId}`)

export const getBrandLifecycleLockKeys = (brandIds: string[]) => [
  "product-brand-relations",
  ...getBrandMutationLockKeys(brandIds),
]

export const getBrandAttributeTypeLockKeys = (namesOrIds: string[]) => [
  "brand-attribute-types",
  ...[...new Set(namesOrIds)]
    .toSorted()
    .map((value) => `brand-attribute-type:${value}`),
]

export const getBrandProductsLockKeys = (
  brandId: string,
  productIds: string[],
) => [`brand-products:${brandId}`, ...getProductBrandLockKeys(productIds)]

export const normalizeBrandProductDelta = (input: {
  add: string[]
  remove: string[]
}) => {
  const addProductIds = [...new Set(input.add)]
  const removeProductIds = [...new Set(input.remove)]
  const removeProductIdSet = new Set(removeProductIds)
  const overlappingProductIds = addProductIds.filter((productId) =>
    removeProductIdSet.has(productId),
  )

  if (overlappingProductIds.length > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Product ids cannot be added and removed in the same request: ${overlappingProductIds.join(", ")}`,
    )
  }

  return {
    add: addProductIds,
    remove: removeProductIds,
  }
}

export const resolveBrandProductDelta = (
  currentProductIds: string[],
  input: {
    add: string[]
    remove: string[]
  },
) => {
  const delta = normalizeBrandProductDelta(input)
  const currentProductIdSet = new Set(currentProductIds)

  return {
    add: delta.add.filter((productId) => !currentProductIdSet.has(productId)),
    remove: delta.remove.filter((productId) =>
      currentProductIdSet.has(productId),
    ),
  }
}

export const partitionProductBrandConflicts = (
  links: { brand_id: string; product_id: string }[],
  activeBrandIds: Set<string>,
  targetBrandId: string,
) => {
  const conflictingLinks = links.filter(
    (link) => link.brand_id !== targetBrandId,
  )

  return {
    active: conflictingLinks.filter((link) =>
      activeBrandIds.has(link.brand_id),
    ),
    inactive: conflictingLinks.filter(
      (link) => !activeBrandIds.has(link.brand_id),
    ),
  }
}

const getGraphData = (result: unknown, context: string): unknown[] => {
  if (!isRecord(result) || !Array.isArray(result["data"])) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${context} query returned invalid data`,
    )
  }

  return result["data"]
}

const parseProductBrandLink = (
  value: unknown,
  context: string,
): ProductBrandLinkRecord => {
  if (!isRecord(value)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${context} query returned an invalid link record`,
    )
  }

  const productId = value["product_id"]
  const brandId = value["brand_id"]
  if (
    (productId !== undefined && typeof productId !== "string") ||
    (brandId !== undefined && typeof brandId !== "string")
  ) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${context} query returned invalid link identifiers`,
    )
  }

  return {
    ...(typeof brandId === "string" ? { brand_id: brandId } : {}),
    ...(typeof productId === "string" ? { product_id: productId } : {}),
  }
}

const queryProductBrandLinks = async (
  query: Query,
  filters: Record<string, unknown>,
  context: string,
): Promise<ProductBrandLinkRecord[]> => {
  const result: unknown = await query.graph({
    entity: ProductBrandLink.entryPoint,
    fields: ["product_id", "brand_id"],
    filters,
  })

  return getGraphData(result, context).map((value) =>
    parseProductBrandLink(value, context),
  )
}

const queryProductBrandLinkChunks = async (
  query: Query,
  field: "brand_id" | "product_id",
  ids: string[],
): Promise<ProductBrandLinkRecord[]> => {
  const chunks = chunk(ids, CHUNK_SIZE)
  const responses = await mapWithConcurrency(
    chunks,
    async (idChunk) =>
      await queryProductBrandLinks(
        query,
        { [field]: { $in: idChunk } },
        `Product-brand ${field}`,
      ),
  )

  return responses.flat()
}

export const getCurrentProductBrandIds = async (
  container: MedusaContainer,
  productId: string,
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const links = await queryProductBrandLinks(
    query,
    { product_id: productId },
    "Product brands",
  )

  return links.flatMap((link) =>
    link.brand_id === undefined || link.brand_id.length === 0
      ? []
      : [link.brand_id],
  )
}

export const getCurrentProductBrandLinks = async (
  container: MedusaContainer,
  productIds: string[],
) => {
  const ids = [...new Set(productIds)]

  if (ids.length === 0) {
    return []
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const data = await queryProductBrandLinkChunks(query, "product_id", ids)

  return data.filter(
    (link): link is Required<ProductBrandLinkRecord> =>
      link.product_id !== undefined &&
      link.product_id.length > 0 &&
      link.brand_id !== undefined &&
      link.brand_id.length > 0,
  )
}

export const getCurrentBrandProductLinks = async (
  container: MedusaContainer,
  brandIds: string[],
) => {
  const ids = [...new Set(brandIds)]

  if (ids.length === 0) {
    return []
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const data = await queryProductBrandLinkChunks(query, "brand_id", ids)

  return data.filter(
    (link): link is Required<ProductBrandLinkRecord> =>
      link.product_id !== undefined &&
      link.product_id.length > 0 &&
      link.brand_id !== undefined &&
      link.brand_id.length > 0,
  )
}

export const getExistingProductIds = async (
  container: MedusaContainer,
  productIds: string[],
) => {
  const ids = [...new Set(productIds)]

  if (ids.length === 0) {
    return new Set<string>()
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const responses: unknown[] = await mapWithConcurrency(
    chunk(ids, CHUNK_SIZE),
    async (idChunk) =>
      await query.graph({
        entity: "product",
        fields: ["id"],
        filters: {
          id: { $in: idChunk },
        },
      }),
  )
  const productIdsFromQuery = responses.flatMap((response) =>
    getGraphData(response, "Products").map((product) => {
      if (!isRecord(product) || typeof product["id"] !== "string") {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Products query returned an invalid record",
        )
      }
      return product["id"]
    }),
  )

  return new Set(productIdsFromQuery)
}

export const diffIds = (currentIds: string[], nextIds: string[]) => {
  const current = new Set(currentIds)
  const next = new Set(nextIds)

  return {
    add: [...next].filter((id) => !current.has(id)),
    remove: [...current].filter((id) => !next.has(id)),
  }
}

export const hasActiveBrandConflict = (
  currentIds: string[],
  activeBrandIds: Set<string>,
  nextIds: string[],
) =>
  nextIds.length > 0 &&
  currentIds.some(
    (brandId) => activeBrandIds.has(brandId) && brandId !== nextIds[0],
  )

export const asArray = <T>(value: T | T[]) =>
  Array.isArray(value) ? value : [value]
