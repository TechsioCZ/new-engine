import type {
  Context,
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
  id: string
  value: string
  attributeType?: {
    name: string
  }
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

type ProducerIdRecord = {
  id: string
}

type ProducerServiceWithTransaction = ProducerModuleService & {
  baseRepository_: {
    transaction: <T>(
      task: (transactionManager: unknown) => Promise<T>
    ) => Promise<T>
  }
}

export const getProducerService = (container: MedusaContainer) =>
  container.resolve<ProducerModuleService>(PRODUCER_MODULE)

export const withProducerTransaction = <T>(
  service: ProducerModuleService,
  task: (sharedContext: Context) => Promise<T>
) =>
  (service as ProducerServiceWithTransaction).baseRepository_.transaction(
    (transactionManager) => task({ transactionManager } as Context)
  )

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
  producerId: string,
  sharedContext: Context = {}
): Promise<ProducerSnapshot> => {
  const producer = await service.retrieveProducer(
    producerId,
    {
      relations: ["attributes", "attributes.attributeType"],
    },
    sharedContext
  )

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
  inputAttributes: ProducerAttributeInput[] = [],
  sharedContext: Context = {}
) => service.setProducerAttributes(producerId, inputAttributes, sharedContext)

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

export const dismissProductProducerLinks = async (
  container: MedusaContainer,
  links: Array<{ producer_id: string; product_id: string }>
) => {
  if (!links.length) {
    return
  }

  await dismissLinksWorkflow(container).run({
    input: links.map((link) =>
      producerProductLink(link.product_id, link.producer_id)
    ),
  })
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

export const getProductProducerIdsToReplace = (
  currentIds: string[],
  activeProducerIds: Set<string>,
  nextIds: string[]
) =>
  nextIds.length
    ? currentIds
    : currentIds.filter((producerId) => activeProducerIds.has(producerId))

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

export const getActiveProducerIds = async (
  container: MedusaContainer,
  producerIds: string[]
) => {
  const ids = [...new Set(producerIds)]

  if (!ids.length) {
    return new Set<string>()
  }

  const producers = await getProducerService(container).listProducers(
    {
      id: { $in: ids },
    },
    {
      select: ["id"],
      withDeleted: false,
    }
  )

  return new Set(
    (producers as ProducerIdRecord[]).map((producer) => producer.id)
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
