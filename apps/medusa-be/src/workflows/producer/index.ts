import type { LinkDefinition, MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  createLinksWorkflow,
  dismissLinksWorkflow,
} from "@medusajs/medusa/core-flows"
import { ProductProducerLink } from "../../links/product-producer"
import { PRODUCER_MODULE } from "../../modules/producer"
import type ProducerModuleService from "../../modules/producer/service"

export type ProducerAttributeInput = {
  name: string
  value: string
}

export type ProducerAttributeTypeInput = {
  name: string
}

export type ProducerInput = {
  title: string
  handle: string
  attributes?: ProducerAttributeInput[]
}

export type CreateProducersWorkflowInput = {
  producers: ProducerInput[]
}

export type UpdateProducersWorkflowInput = {
  selector: {
    id: string
  }
  update: Partial<ProducerInput>
}

export type DeleteProducersWorkflowInput = {
  ids: string[]
}

export type RestoreProducersWorkflowInput = {
  ids: string[]
}

export type SetProductProducersWorkflowInput = {
  product_id: string
  producer_ids: string[]
}

export type SetProducerProductsWorkflowInput = {
  producer_id: string
  product_ids: string[]
}

export type CreateProducerAttributeTypesWorkflowInput = {
  attribute_types: ProducerAttributeTypeInput[]
}

export type DeleteProducerAttributeTypesWorkflowInput = {
  ids: string[]
}

export type RestoreProducerAttributeTypesWorkflowInput = {
  ids: string[]
}

type ProducerAttributeRecord = {
  id: string
  value: string
  attributeType?: {
    id: string
    name: string
  }
}

type ProducerSnapshot = {
  id: string
  title: string
  handle: string
  attributes: ProducerAttributeInput[]
}

type ProductProducerLinkRecord = {
  product_id?: string
  producer_id?: string
}

const getProducerService = (container: MedusaContainer) =>
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

const snapshotProducer = async (
  service: ProducerModuleService,
  producerId: string
): Promise<ProducerSnapshot> => {
  const producer = (await service.retrieveProducer(producerId, {
    relations: ["attributes", "attributes.attributeType"],
  })) as {
    id: string
    title: string
    handle: string
    attributes?: ProducerAttributeRecord[]
  }

  return {
    id: producer.id,
    title: producer.title,
    handle: producer.handle,
    attributes: (producer.attributes ?? []).flatMap((attribute) => {
      const name = attribute.attributeType?.name

      if (!name) {
        return []
      }

      return [
        {
          name,
          value: attribute.value,
        },
      ]
    }),
  }
}

const setProducerAttributes = async (
  service: ProducerModuleService,
  producerId: string,
  inputAttributes: ProducerAttributeInput[] = []
) => {
  const attributes = normalizeAttributes(inputAttributes)
  const names = attributes.map((attribute) => attribute.name)

  const existingAttributeTypes = names.length
    ? ((await service.listProducerAttributeTypes({
        name: { $in: names },
      })) as Array<{ id: string; name: string }>)
    : []

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
    }
  )) as ProducerAttributeRecord[]

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

const producerProductLink = (productId: string, producerId: string) => ({
  [Modules.PRODUCT]: {
    product_id: productId,
  },
  [PRODUCER_MODULE]: {
    producer_id: producerId,
  },
})

const getCurrentProductProducerIds = async (
  container: MedusaContainer,
  productId: string
) => {
  const query = container.resolve("query")
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

const getCurrentProducerProductIds = async (
  container: MedusaContainer,
  producerId: string
) => {
  const query = container.resolve("query")
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

const asArray = <T>(value: T | T[]) => (Array.isArray(value) ? value : [value])

export const createProducersStep = createStep(
  "create-producers",
  async (input: CreateProducersWorkflowInput, { container }) => {
    const service = getProducerService(container)

    const producers = (await service.createProducers(
      input.producers.map((producer) => ({
        handle: producer.handle,
        title: producer.title,
      }))
    )) as Array<{ id: string }>

    await Promise.all(
      producers.map((producer, index) =>
        setProducerAttributes(
          service,
          producer.id,
          input.producers[index]?.attributes
        )
      )
    )

    return new StepResponse(
      producers,
      producers.map((producer) => producer.id)
    )
  },
  async (createdIds, { container }) => {
    if (!createdIds?.length) {
      return
    }

    await getProducerService(container).deleteProducers(createdIds)
  }
)

export const updateProducersStep = createStep(
  "update-producers",
  async (input: UpdateProducersWorkflowInput, { container }) => {
    const service = getProducerService(container)
    const previous = await snapshotProducer(service, input.selector.id)

    const producers = asArray(
      (await service.updateProducers({
        id: input.selector.id,
        ...(input.update.title !== undefined
          ? { title: input.update.title }
          : {}),
        ...(input.update.handle !== undefined
          ? { handle: input.update.handle }
          : {}),
      })) as { id: string } | Array<{ id: string }>
    )

    if (input.update.attributes) {
      await setProducerAttributes(
        service,
        input.selector.id,
        input.update.attributes
      )
    }

    return new StepResponse(producers, previous)
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }

    const service = getProducerService(container)

    await service.updateProducers({
      handle: previous.handle,
      id: previous.id,
      title: previous.title,
    })
    await setProducerAttributes(service, previous.id, previous.attributes)
  }
)

export const deleteProducersStep = createStep(
  "delete-producers",
  async (input: DeleteProducersWorkflowInput, { container }) => {
    const service = getProducerService(container)

    await service.softDeleteProducers(input.ids)
    return new StepResponse(undefined, input.ids)
  },
  async (deletedIds, { container }) => {
    if (!deletedIds?.length) {
      return
    }

    await getProducerService(container).restoreProducers(deletedIds)
  }
)

export const restoreProducersStep = createStep(
  "restore-producers",
  async (input: RestoreProducersWorkflowInput, { container }) => {
    await getProducerService(container).restoreProducers(input.ids)

    return new StepResponse(input.ids, input.ids)
  },
  async (restoredIds, { container }) => {
    if (restoredIds?.length) {
      await getProducerService(container).softDeleteProducers(restoredIds)
    }
  }
)

export const setProductProducersStep = createStep(
  "set-product-producers",
  async (input: SetProductProducersWorkflowInput, { container }) => {
    const currentIds = await getCurrentProductProducerIds(
      container,
      input.product_id
    )
    const { add, remove } = diffIds(currentIds, input.producer_ids)

    const linksToCreate = add.map((producerId) =>
      producerProductLink(input.product_id, producerId)
    ) as LinkDefinition[]
    const linksToDismiss = remove.map((producerId) =>
      producerProductLink(input.product_id, producerId)
    ) as LinkDefinition[]

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

    return new StepResponse(
      {
        added: add,
        removed: remove,
      },
      {
        product_id: input.product_id,
        producer_ids: currentIds,
      }
    )
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }

    await setProductProducersWorkflow(container).run({
      input: previous,
    })
  }
)

export const setProducerProductsStep = createStep(
  "set-producer-products",
  async (input: SetProducerProductsWorkflowInput, { container }) => {
    const currentIds = await getCurrentProducerProductIds(
      container,
      input.producer_id
    )
    const { add, remove } = diffIds(currentIds, input.product_ids)

    const linksToCreate = add.map((productId) =>
      producerProductLink(productId, input.producer_id)
    ) as LinkDefinition[]
    const linksToDismiss = remove.map((productId) =>
      producerProductLink(productId, input.producer_id)
    ) as LinkDefinition[]

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

    return new StepResponse(
      {
        added: add,
        removed: remove,
      },
      {
        producer_id: input.producer_id,
        product_ids: currentIds,
      }
    )
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }

    await setProducerProductsWorkflow(container).run({
      input: previous,
    })
  }
)

export const createProducerAttributeTypesStep = createStep(
  "create-producer-attribute-types",
  async (input: CreateProducerAttributeTypesWorkflowInput, { container }) => {
    const attributeTypes = await getProducerService(
      container
    ).createProducerAttributeTypes(input.attribute_types)

    return new StepResponse(
      attributeTypes,
      attributeTypes.map((attributeType) => attributeType.id)
    )
  },
  async (createdIds, { container }) => {
    if (createdIds?.length) {
      await getProducerService(container).deleteProducerAttributeTypes(
        createdIds
      )
    }
  }
)

export const deleteProducerAttributeTypesStep = createStep(
  "delete-producer-attribute-types",
  async (input: DeleteProducerAttributeTypesWorkflowInput, { container }) => {
    await getProducerService(container).softDeleteProducerAttributeTypes(
      input.ids
    )

    return new StepResponse(input.ids, input.ids)
  },
  async (deletedIds, { container }) => {
    if (deletedIds?.length) {
      await getProducerService(container).restoreProducerAttributeTypes(
        deletedIds
      )
    }
  }
)

export const restoreProducerAttributeTypesStep = createStep(
  "restore-producer-attribute-types",
  async (input: RestoreProducerAttributeTypesWorkflowInput, { container }) => {
    await getProducerService(container).restoreProducerAttributeTypes(input.ids)

    return new StepResponse(input.ids, input.ids)
  },
  async (restoredIds, { container }) => {
    if (restoredIds?.length) {
      await getProducerService(container).softDeleteProducerAttributeTypes(
        restoredIds
      )
    }
  }
)

export const createProducersWorkflow = createWorkflow(
  "create-producers-workflow",
  (input: CreateProducersWorkflowInput) =>
    new WorkflowResponse(createProducersStep(input))
)

export const updateProducersWorkflow = createWorkflow(
  "update-producers-workflow",
  (input: UpdateProducersWorkflowInput) =>
    new WorkflowResponse(updateProducersStep(input))
)

export const deleteProducersWorkflow = createWorkflow(
  "delete-producers-workflow",
  (input: DeleteProducersWorkflowInput) =>
    new WorkflowResponse(deleteProducersStep(input))
)

export const restoreProducersWorkflow = createWorkflow(
  "restore-producers-workflow",
  (input: RestoreProducersWorkflowInput) =>
    new WorkflowResponse(restoreProducersStep(input))
)

export const setProductProducersWorkflow = createWorkflow(
  "set-product-producers-workflow",
  (input: SetProductProducersWorkflowInput) =>
    new WorkflowResponse(setProductProducersStep(input))
)

export const setProducerProductsWorkflow = createWorkflow(
  "set-producer-products-workflow",
  (input: SetProducerProductsWorkflowInput) =>
    new WorkflowResponse(setProducerProductsStep(input))
)

export const createProducerAttributeTypesWorkflow = createWorkflow(
  "create-producer-attribute-types-workflow",
  (input: CreateProducerAttributeTypesWorkflowInput) =>
    new WorkflowResponse(createProducerAttributeTypesStep(input))
)

export const deleteProducerAttributeTypesWorkflow = createWorkflow(
  "delete-producer-attribute-types-workflow",
  (input: DeleteProducerAttributeTypesWorkflowInput) =>
    new WorkflowResponse(deleteProducerAttributeTypesStep(input))
)

export const restoreProducerAttributeTypesWorkflow = createWorkflow(
  "restore-producer-attribute-types-workflow",
  (input: RestoreProducerAttributeTypesWorkflowInput) =>
    new WorkflowResponse(restoreProducerAttributeTypesStep(input))
)
