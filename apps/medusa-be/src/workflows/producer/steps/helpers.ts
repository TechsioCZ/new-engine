import type {
  LinkDefinition,
  MedusaContainer,
  Query,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  createLinksWorkflow,
  dismissLinksWorkflow,
} from "@medusajs/medusa/core-flows"
import { ProductProducerLink } from "../../../links/product-producer"
import { PRODUCER_MODULE } from "../../../modules/producer"
import type ProducerModuleService from "../../../modules/producer/service"
import type { ProducerAttributeInput } from "../types"

type ProducerAttributeRecord = {
  deleted_at?: string | Date | null
  id: string
  value: string
  attributeType?: {
    id: string
    name: string
  }
}

type ProducerAttributeTypeRecord = {
  deleted_at?: string | Date | null
  id: string
  name: string
}

type ProducerSnapshot = {
  id: string
  title: string
  handle: string
  attributes: ProducerAttributeInput[]
}

type ProducerSnapshotRecord = {
  id: string
  title: string
  handle: string
  attributes: Array<
    ProducerAttributeRecord & {
      attributeType: {
        id?: string
        name: string
      }
    }
  >
}

type ProductProducerLinkRecord = {
  product_id?: string
  producer_id?: string
}

export const getProducerService = (container: MedusaContainer) =>
  container.resolve<ProducerModuleService>(PRODUCER_MODULE)

const normalizeAttributes = (attributes: ProducerAttributeInput[] = []) => {
  const byName = new Map<string, ProducerAttributeInput>()

  for (const attribute of attributes) {
    const name = attribute.name.trim()
    if (!name) {
      continue
    }

    byName.set(name, {
      name,
      value: attribute.value,
    })
  }

  return [...byName.values()]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isProducerSnapshotRecord = (
  producer: unknown
): producer is ProducerSnapshotRecord => {
  if (!isRecord(producer)) {
    return false
  }

  if (
    typeof producer.id !== "string" ||
    typeof producer.title !== "string" ||
    typeof producer.handle !== "string" ||
    !Array.isArray(producer.attributes)
  ) {
    return false
  }

  return producer.attributes.every((attribute) => {
    if (!isRecord(attribute) || typeof attribute.value !== "string") {
      return false
    }

    return (
      isRecord(attribute.attributeType) &&
      typeof attribute.attributeType.name === "string"
    )
  })
}

const assertProducerSnapshotRecord: (
  producer: unknown,
  producerId: string
) => asserts producer is ProducerSnapshotRecord = (
  producer: unknown,
  producerId: string
) => {
  if (isProducerSnapshotRecord(producer)) {
    return
  }

  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    `Producer "${producerId}" was retrieved without the fields required for a workflow snapshot`
  )
}

export const snapshotProducer = async (
  service: ProducerModuleService,
  producerId: string
): Promise<ProducerSnapshot> => {
  const producer = await service.retrieveProducer(producerId, {
    relations: ["attributes", "attributes.attributeType"],
  })

  assertProducerSnapshotRecord(producer, producerId)

  return {
    id: producer.id,
    title: producer.title,
    handle: producer.handle,
    attributes: producer.attributes.map((attribute) => ({
      name: attribute.attributeType.name,
      value: attribute.value,
    })),
  }
}

export const setProducerAttributes = async (
  service: ProducerModuleService,
  producerId: string,
  inputAttributes: ProducerAttributeInput[] = []
) => {
  const attributes = normalizeAttributes(inputAttributes)
  const names = attributes.map((attribute) => attribute.name)

  const existingAttributeTypes = names.length
    ? ((await service.listProducerAttributeTypes(
        {
          name: { $in: names },
        },
        {
          withDeleted: true,
        }
      )) as ProducerAttributeTypeRecord[])
    : []
  const deletedAttributeTypeIds = existingAttributeTypes
    .filter((attributeType) => attributeType.deleted_at)
    .map((attributeType) => attributeType.id)

  if (deletedAttributeTypeIds.length) {
    // Reuse restored types so producer updates do not create duplicate names.
    await service.restoreProducerAttributeTypes(deletedAttributeTypeIds)
  }

  const attributeTypeIdsByName = new Map(
    existingAttributeTypes.map((attributeType) => [
      attributeType.name,
      attributeType.id,
    ])
  )

  const missingAttributeTypeNames = names.filter(
    (name) => !attributeTypeIdsByName.has(name)
  )

  if (missingAttributeTypeNames.length) {
    const createdAttributeTypes = (await service.createProducerAttributeTypes(
      missingAttributeTypeNames.map((name) => ({ name }))
    )) as Array<{ id: string; name: string }>

    for (const attributeType of createdAttributeTypes) {
      attributeTypeIdsByName.set(attributeType.name, attributeType.id)
    }
  }

  const existingAttributes = (await service.listProducerAttributes(
    { producer_id: producerId },
    {
      relations: ["attributeType"],
      withDeleted: true,
    }
  )) as ProducerAttributeRecord[]
  const deletedAttributeIds = existingAttributes
    .filter((attribute) => attribute.deleted_at)
    .map((attribute) => attribute.id)

  if (deletedAttributeIds.length) {
    await service.restoreProducerAttributes(deletedAttributeIds)
  }

  const existingByName = new Map(
    existingAttributes.flatMap((attribute) => {
      const name = attribute.attributeType?.name
      return name ? [[name, attribute] as const] : []
    })
  )

  const toCreate = attributes.flatMap((attribute) => {
    if (existingByName.has(attribute.name)) {
      return []
    }

    const attributeTypeId = attributeTypeIdsByName.get(attribute.name)

    if (!attributeTypeId) {
      return []
    }

    return [
      {
        attribute_type_id: attributeTypeId,
        producer_id: producerId,
        value: attribute.value,
      },
    ]
  })

  const toUpdate = attributes
    .map((attribute) => {
      const existing = existingByName.get(attribute.name)

      if (!existing || existing.value === attribute.value) {
        return null
      }

      return {
        id: existing.id,
        value: attribute.value,
      }
    })
    .filter(
      (attribute): attribute is { id: string; value: string } => !!attribute
    )

  const toDelete = existingAttributes
    .filter((attribute) => {
      const name = attribute.attributeType?.name
      return !(name && names.includes(name))
    })
    .map((attribute) => attribute.id)

  if (toCreate.length) {
    await service.createProducerAttributes(toCreate)
  }

  if (toUpdate.length) {
    await service.updateProducerAttributes(toUpdate)
  }

  if (toDelete.length) {
    await service.deleteProducerAttributes(toDelete)
  }
}

export const producerProductLink = (productId: string, producerId: string) => ({
  [Modules.PRODUCT]: {
    product_id: productId,
  },
  [PRODUCER_MODULE]: {
    producer_id: producerId,
  },
})

export const getProductProducerLockKeys = (productIds: string[]) =>
  [...new Set(productIds)]
    .sort()
    .map((productId) => `product-producer:${productId}`)

export const getProducerProductsLockKeys = (
  producerId: string,
  productIds: string[]
) => [
  `producer-products:${producerId}`,
  ...getProductProducerLockKeys(productIds),
]

export const replaceProductProducerLinks = async (
  container: MedusaContainer,
  currentIds: string[],
  nextIds: string[],
  toLinkDefinition: (id: string) => LinkDefinition
) => {
  const { add, remove } = diffIds(currentIds, nextIds)
  const linksToDismiss = remove.map(toLinkDefinition)
  const linksToCreate = add.map(toLinkDefinition)

  if (linksToDismiss.length) {
    await dismissLinksWorkflow(container).run({
      input: linksToDismiss,
    })
  }

  if (linksToCreate.length) {
    await createLinksWorkflow(container).run({
      input: linksToCreate,
    })
  }

  return { add, remove }
}

export const getCurrentProductProducerIds = async (
  container: MedusaContainer,
  productId: string
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductProducerLink.entryPoint,
    fields: ["producer_id"],
    filters: {
      product_id: productId,
    },
  })

  return (data as ProductProducerLinkRecord[])
    .map((link) => link.producer_id)
    .filter((producerId): producerId is string => !!producerId)
}

export const getCurrentProductProducerLinks = async (
  container: MedusaContainer,
  productIds: string[]
) => {
  const ids = [...new Set(productIds)]

  if (!ids.length) {
    return []
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductProducerLink.entryPoint,
    fields: ["product_id", "producer_id"],
    filters: {
      product_id: { $in: ids },
    },
  })

  return (data as ProductProducerLinkRecord[]).filter(
    (link): link is Required<ProductProducerLinkRecord> =>
      !!(link.product_id && link.producer_id)
  )
}

export const getCurrentProducerProductIds = async (
  container: MedusaContainer,
  producerId: string
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductProducerLink.entryPoint,
    fields: ["product_id"],
    filters: {
      producer_id: producerId,
    },
  })

  return (data as ProductProducerLinkRecord[])
    .map((link) => link.product_id)
    .filter((productId): productId is string => !!productId)
}

export const diffIds = (currentIds: string[], nextIds: string[]) => {
  const current = new Set(currentIds)
  const next = new Set(nextIds)

  return {
    add: [...next].filter((id) => !current.has(id)),
    remove: [...current].filter((id) => !next.has(id)),
  }
}

export const asArray = <T>(value: T | T[]) =>
  Array.isArray(value) ? value : [value]
