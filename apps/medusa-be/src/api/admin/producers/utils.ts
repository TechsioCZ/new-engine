import type {
  IProductModuleService,
  MedusaContainer,
  ProductTypes,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import { ProductProducerLink } from "../../../links/product-producer"
import { PRODUCER_MODULE } from "../../../modules/producer"
import type ProducerModuleService from "../../../modules/producer/service"

export type ProducerAttributeResponse = {
  attribute_type_id?: string
  attribute_type_deleted_at?: string | Date | null
  id?: string
  name: string
  value: string
}

export type ProducerAttributeTypeResponse = {
  deleted_at?: string | Date | null
  id: string
  name: string
  usage_count: number
}

export type ProducerAttributeTypeProducerResponse = ProducerResponse & {
  attribute_value: string
}

export type ProducerResponse = {
  active_product_count: number
  id: string
  title: string
  handle: string
  attributes: ProducerAttributeResponse[]
  created_at?: string | Date
  deleted_at?: string | Date | null
  updated_at?: string | Date
}

export type ProducerAttributeRecord = {
  id?: string
  value: string
  attributeType?: {
    deleted_at?: string | Date | null
    id?: string
    name?: string
  }
  attributeType_id?: string
  attribute_type_id?: string
  producer?: {
    active_product_count?: number
    attributes?: ProducerAttributeRecord[]
    created_at?: string | Date
    deleted_at?: string | Date | null
    handle: string
    id?: string
    title: string
    updated_at?: string | Date
  }
  producer_id?: string
}

type ProducerAttributeTypeRecord = {
  deleted_at?: string | Date | null
  id: string
  name: string
}

type ProducerRecord = {
  id: string
  title: string
  handle: string
  attributes?: ProducerAttributeRecord[]
  created_at?: string | Date
  deleted_at?: string | Date | null
  updated_at?: string | Date
}

type ProductRecord = Pick<ProductTypes.ProductDTO, "id"> &
  Partial<
    Pick<
      ProductTypes.ProductDTO,
      "created_at" | "handle" | "status" | "thumbnail" | "title" | "updated_at"
    >
  >

type LinkRecord = {
  deleted_at?: string | Date | null
  product_id?: string
  producer_id?: string
}

export type ProductProducerLinkRecord = Required<LinkRecord>

type ProducerService = ProducerModuleService & {
  createProducerAttributeTypes: (
    data:
      | { name: string }
      | {
          name: string
        }[]
  ) => Promise<ProducerAttributeTypeRecord[]>
  listAndCountProducerAttributeTypes: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<[ProducerAttributeTypeRecord[], number]>
  listProducerAttributes: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<ProducerAttributeRecord[]>
  listAndCountProducerAttributes: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<[ProducerAttributeRecord[], number]>
  listProducers: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<ProducerRecord[]>
  listAndCountProducers: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<[ProducerRecord[], number]>
  retrieveProducer: (
    id: string,
    config?: Record<string, unknown>
  ) => Promise<ProducerRecord>
}

type ListProductsOptions = {
  order?: Record<string, "ASC" | "DESC">
  q?: string
  skip?: number
  take?: number
}

type RetrieveProducerOptions = {
  withDeleted?: boolean
}

const LIKE_WILDCARD_REGEX = /[\\%_]/g

export const getProducerService = (scope: MedusaContainer) =>
  scope.resolve<ProducerService>(PRODUCER_MODULE)

const getProductService = (scope: MedusaContainer) =>
  scope.resolve<IProductModuleService>(Modules.PRODUCT)

export const toProducerResponse = (
  producer: ProducerRecord,
  activeProductCount = 0
): ProducerResponse => ({
  active_product_count: activeProductCount,
  attributes: (producer.attributes ?? []).flatMap((attribute) => {
    const name = attribute.attributeType?.name
    const attributeTypeId = attribute.attributeType?.id

    if (!(name && attributeTypeId)) {
      return []
    }

    return [
      {
        attribute_type_deleted_at: attribute.attributeType?.deleted_at ?? null,
        attribute_type_id: attributeTypeId,
        id: attribute.id,
        name,
        value: attribute.value,
      },
    ]
  }),
  created_at: producer.created_at,
  deleted_at: producer.deleted_at ?? null,
  handle: producer.handle,
  id: producer.id,
  title: producer.title,
  updated_at: producer.updated_at,
})

export const toProducerAttributeTypeResponse = (
  attributeType: ProducerAttributeTypeRecord,
  usageCount: number
): ProducerAttributeTypeResponse => ({
  deleted_at: attributeType.deleted_at ?? null,
  id: attributeType.id,
  name: attributeType.name,
  usage_count: usageCount,
})

export const toProducerAttributeTypeProducerResponse = (
  attribute: ProducerAttributeRecord,
  activeProductCount = 0
): ProducerAttributeTypeProducerResponse | null => {
  if (!attribute.producer?.id) {
    return null
  }

  const producer = {
    ...attribute.producer,
    id: attribute.producer.id,
  }

  return {
    ...toProducerResponse(producer, activeProductCount),
    attribute_value: attribute.value,
  }
}

export const getProducerAttributeTypeUsageCounts = async (
  scope: MedusaContainer,
  attributeTypeIds: string[]
) => {
  if (!attributeTypeIds.length) {
    return new Map<string, number>()
  }

  const attributes = await getProducerService(scope).listProducerAttributes(
    {
      attribute_type_id: { $in: attributeTypeIds },
    },
    {
      relations: ["producer"],
    }
  )

  const producerIdsByAttributeTypeId = new Map<string, Set<string>>()

  for (const attribute of attributes as ProducerAttributeRecord[]) {
    const attributeTypeId =
      attribute.attribute_type_id ?? attribute.attributeType_id
    const producerId = attribute.producer?.id ?? attribute.producer_id

    if (!(attributeTypeId && producerId) || attribute.producer?.deleted_at) {
      continue
    }

    const producerIds =
      producerIdsByAttributeTypeId.get(attributeTypeId) ?? new Set<string>()
    producerIds.add(producerId)
    producerIdsByAttributeTypeId.set(attributeTypeId, producerIds)
  }

  return new Map(
    [...producerIdsByAttributeTypeId.entries()].map(
      ([attributeTypeId, producerIds]) => [attributeTypeId, producerIds.size]
    )
  )
}

export const getProducerActiveProductCounts = async (
  scope: MedusaContainer,
  producerIds: string[]
) => {
  if (!producerIds.length) {
    return new Map<string, number>()
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: links } = await query.graph({
    entity: ProductProducerLink.entryPoint,
    fields: ["producer_id", "product_id"],
    filters: {
      producer_id: { $in: producerIds },
    },
  })
  const productIds = uniqueIds(
    (links as LinkRecord[])
      .map((link) => link.product_id)
      .filter((productId): productId is string => !!productId)
  )

  if (!productIds.length) {
    return new Map<string, number>()
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {
      id: { $in: productIds },
      status: ProductStatus.PUBLISHED,
    },
  })
  const activeProductIds = new Set(
    (products as ProductRecord[]).map((product) => product.id)
  )
  const activeProductIdsByProducerId = new Map<string, Set<string>>()

  for (const link of links as LinkRecord[]) {
    if (!(link.producer_id && link.product_id)) {
      continue
    }

    if (!activeProductIds.has(link.product_id)) {
      continue
    }

    const productIdsForProducer =
      activeProductIdsByProducerId.get(link.producer_id) ?? new Set<string>()
    productIdsForProducer.add(link.product_id)
    activeProductIdsByProducerId.set(link.producer_id, productIdsForProducer)
  }

  return new Map(
    [...activeProductIdsByProducerId.entries()].map(
      ([producerId, activeIds]) => [producerId, activeIds.size]
    )
  )
}

export const toProductResponse = (product: ProductRecord) => ({
  created_at: product.created_at,
  handle: product.handle,
  id: product.id,
  status: product.status,
  thumbnail: product.thumbnail,
  title: product.title,
  updated_at: product.updated_at,
})

export const escapeLikePattern = (value: string) =>
  value.replace(LIKE_WILDCARD_REGEX, (match) => `\\${match}`)

export const uniqueIds = (ids: string[]) => [...new Set(ids)]

export const retrieveProducerOrThrow = async (
  scope: MedusaContainer,
  producerId: string,
  options: RetrieveProducerOptions = {}
) => {
  const [producer] = await getProducerService(scope).listProducers(
    {
      id: producerId,
    },
    {
      relations: ["attributes", "attributes.attributeType"],
      take: 1,
      withDeleted: options.withDeleted ?? false,
    }
  )

  if (!producer) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Producer with id "${producerId}" was not found`
    )
  }

  return producer
}

export const ensureProducerIdsExist = async (
  scope: MedusaContainer,
  producerIds: string[]
) => {
  const ids = uniqueIds(producerIds)

  if (!ids.length) {
    return ids
  }

  const producers = await getProducerService(scope).listProducers(
    {
      id: { $in: ids },
    },
    {
      select: ["id"],
      withDeleted: false,
    }
  )
  const found = new Set(producers.map((producer) => producer.id))
  const missing = ids.filter((id) => !found.has(id))

  if (missing.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Producer ids were not found: ${missing.join(", ")}`
    )
  }

  return ids
}

export const getActiveProducerIds = async (
  scope: MedusaContainer,
  producerIds: string[]
) => {
  const ids = uniqueIds(producerIds)

  if (!ids.length) {
    return new Set<string>()
  }

  const producers = await getProducerService(scope).listProducers(
    {
      id: { $in: ids },
    },
    {
      select: ["id"],
      withDeleted: false,
    }
  )

  return new Set(producers.map((producer) => producer.id))
}

export const ensureProductIdsExist = async (
  scope: MedusaContainer,
  productIds: string[]
) => {
  const ids = uniqueIds(productIds)

  if (!ids.length) {
    return ids
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {
      id: { $in: ids },
    },
  })
  const found = new Set((data as ProductRecord[]).map((product) => product.id))
  const missing = ids.filter((id) => !found.has(id))

  if (missing.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Product ids were not found: ${missing.join(", ")}`
    )
  }

  return ids
}

export const listProductProducerLinksByProductIds = async (
  scope: MedusaContainer,
  productIds: string[],
  options: { withDeleted?: boolean } = {}
): Promise<ProductProducerLinkRecord[]> => {
  const ids = uniqueIds(productIds)

  if (!ids.length) {
    return []
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductProducerLink.entryPoint,
    fields: ["deleted_at", "product_id", "producer_id"],
    filters: {
      product_id: { $in: ids },
    },
    withDeleted: options.withDeleted,
  })

  return (data as LinkRecord[]).filter(
    (link): link is ProductProducerLinkRecord =>
      !!(link.product_id && link.producer_id)
  )
}

export const listProductProducerLinks = async (
  scope: MedusaContainer,
  options: { withDeleted?: boolean } = {}
): Promise<ProductProducerLinkRecord[]> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductProducerLink.entryPoint,
    fields: ["deleted_at", "product_id", "producer_id"],
    withDeleted: options.withDeleted,
  })

  return (data as LinkRecord[]).filter(
    (link): link is ProductProducerLinkRecord =>
      !!(link.product_id && link.producer_id)
  )
}

export const ensureProductsAssignableToProducer = async (
  scope: MedusaContainer,
  producerId: string,
  productIds: string[]
) => {
  const links = await listProductProducerLinksByProductIds(scope, productIds)
  const linksToOtherProducers = links.filter(
    (link) => link.producer_id !== producerId
  )

  const activeProducerIds = await getActiveProducerIds(
    scope,
    linksToOtherProducers.map((link) => link.producer_id)
  )
  const conflictingLinks = linksToOtherProducers.filter((link) =>
    activeProducerIds.has(link.producer_id)
  )

  if (!conflictingLinks.length) {
    return
  }

  const producers = await listProducersByIds(
    scope,
    uniqueIds(conflictingLinks.map((link) => link.producer_id))
  )
  const producerNamesById = new Map(
    producers.map((producer) => [producer.id, producer.title])
  )
  const conflictText = conflictingLinks
    .map((link) => {
      const producerName = producerNamesById.get(link.producer_id)
      return `${link.product_id}${producerName ? ` (${producerName})` : ""}`
    })
    .join(", ")

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `Products are already linked to another producer: ${conflictText}`
  )
}

export const retrieveProductOrThrow = async (
  scope: MedusaContainer,
  productId: string
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {
      id: productId,
    },
  })

  const product = (data as ProductRecord[])[0]

  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id "${productId}" was not found`
    )
  }

  return product
}

export const listProducerIdsForProduct = async (
  scope: MedusaContainer,
  productId: string
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductProducerLink.entryPoint,
    fields: ["producer_id"],
    filters: {
      product_id: productId,
    },
  })

  return (data as LinkRecord[])
    .map((link) => link.producer_id)
    .filter((producerId): producerId is string => !!producerId)
}

export const listProductIdsForProducer = async (
  scope: MedusaContainer,
  producerId: string
) => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductProducerLink.entryPoint,
    fields: ["product_id"],
    filters: {
      producer_id: producerId,
    },
  })

  return (data as LinkRecord[])
    .map((link) => link.product_id)
    .filter((productId): productId is string => !!productId)
}

export const listProducersByIds = async (
  scope: MedusaContainer,
  producerIds: string[]
) => {
  if (!producerIds.length) {
    return []
  }

  return getProducerService(scope).listProducers(
    {
      id: { $in: producerIds },
    },
    {
      order: {
        title: "ASC",
      },
      relations: ["attributes", "attributes.attributeType"],
      withDeleted: true,
    }
  )
}

export const listProductsByIds = async (
  scope: MedusaContainer,
  productIds: string[]
) => {
  if (!productIds.length) {
    return []
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "thumbnail", "status", "created_at"],
    filters: {
      id: { $in: productIds },
    },
  })

  return data as ProductRecord[]
}

export const listAndCountProducts = async (
  scope: MedusaContainer,
  filters: Record<string, unknown> = {},
  options: ListProductsOptions = {}
): Promise<[ProductRecord[], number]> => {
  const { order, q, skip, take } = options

  return getProductService(scope).listAndCountProducts(
    {
      ...filters,
      ...(q ? { q } : {}),
    },
    {
      order,
      select: ["id", "title", "handle", "thumbnail", "status", "created_at"],
      skip,
      take,
    }
  )
}

export const listAndCountProductsByIds = async (
  scope: MedusaContainer,
  productIds: string[],
  options: ListProductsOptions = {}
) => {
  const ids = uniqueIds(productIds)

  if (!ids.length) {
    return [[], 0] as [ProductRecord[], number]
  }

  return listAndCountProducts(
    scope,
    {
      id: { $in: ids },
    },
    options
  )
}
