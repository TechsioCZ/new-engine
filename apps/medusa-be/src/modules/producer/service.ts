import type { Context } from "@medusajs/framework/types"
import { kebabCase, MedusaService } from "@medusajs/framework/utils"
import Producer from "./models/producer"
import ProducerAttribute from "./models/producer-attribute"
import ProducerAttributeType from "./models/producer-attribute-type"

export type ProducerAttributeInput = {
  name: string
  value: string
}

export type UpsertProducerDTO = {
  name: string
  handle?: string
  attributes: ProducerAttributeInput[]
}

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

type ServiceWithTransaction = {
  baseRepository_: {
    transaction: <T>(
      task: (transactionManager: unknown) => Promise<T>
    ) => Promise<T>
  }
}

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

const isDeleted = (record: { deleted_at?: string | Date | null }) =>
  !!record.deleted_at

class ProducerModuleService extends MedusaService({
  Producer,
  ProducerAttribute,
  ProducerAttributeType,
}) {
  private async withTransaction<T>(
    sharedContext: Context,
    task: (context: Context) => Promise<T>
  ) {
    return await (
      this as unknown as ServiceWithTransaction
    ).baseRepository_.transaction(async (transactionManager) =>
      task({
        ...sharedContext,
        transactionManager,
      })
    )
  }

  private async getAttributeTypeIdsByName(
    names: string[],
    sharedContext: Context
  ) {
    const existingAttributeTypes = names.length
      ? ((await this.listProducerAttributeTypes(
          {
            name: { $in: names },
          },
          {
            withDeleted: true,
          },
          sharedContext
        )) as ProducerAttributeTypeRecord[])
      : []
    const attributeTypeIdsByName = new Map<string, string>()
    const deletedAttributeTypesByName = new Map<
      string,
      ProducerAttributeTypeRecord
    >()

    for (const attributeType of existingAttributeTypes) {
      if (isDeleted(attributeType)) {
        if (!deletedAttributeTypesByName.has(attributeType.name)) {
          deletedAttributeTypesByName.set(attributeType.name, attributeType)
        }
        continue
      }

      attributeTypeIdsByName.set(attributeType.name, attributeType.id)
    }

    const attributeTypeIdsToRestore = names.flatMap((name) => {
      if (attributeTypeIdsByName.has(name)) {
        return []
      }

      const deletedAttributeType = deletedAttributeTypesByName.get(name)

      if (!deletedAttributeType) {
        return []
      }

      attributeTypeIdsByName.set(name, deletedAttributeType.id)
      return [deletedAttributeType.id]
    })

    if (attributeTypeIdsToRestore.length) {
      await this.restoreProducerAttributeTypes(
        attributeTypeIdsToRestore,
        {},
        sharedContext
      )
    }

    const missingAttributeTypeNames = names.filter(
      (name) => !attributeTypeIdsByName.has(name)
    )

    if (missingAttributeTypeNames.length) {
      const createdAttributeTypes = (await this.createProducerAttributeTypes(
        missingAttributeTypeNames.map((name) => ({ name })),
        sharedContext
      )) as Array<{ id: string; name: string }>

      for (const attributeType of createdAttributeTypes) {
        attributeTypeIdsByName.set(attributeType.name, attributeType.id)
      }
    }

    return attributeTypeIdsByName
  }

  private async getReusableAttributesByName({
    attributeTypeIdsByName,
    attributes,
    producerId,
    sharedContext,
  }: {
    attributeTypeIdsByName: Map<string, string>
    attributes: ProducerAttributeInput[]
    producerId: string
    sharedContext: Context
  }) {
    const existingAttributes = (await this.listProducerAttributes(
      { producer_id: producerId },
      {
        relations: ["attributeType"],
        withDeleted: true,
      },
      sharedContext
    )) as ProducerAttributeRecord[]
    const existingByName = new Map<string, ProducerAttributeRecord>()
    const deletedAttributesByName = new Map<string, ProducerAttributeRecord>()

    for (const attribute of existingAttributes) {
      const name = attribute.attributeType?.name

      if (!name) {
        continue
      }

      if (isDeleted(attribute)) {
        if (!deletedAttributesByName.has(name)) {
          deletedAttributesByName.set(name, attribute)
        }
        continue
      }

      existingByName.set(name, attribute)
    }

    const attributeIdsToRestore = attributes.flatMap((attribute) => {
      if (existingByName.has(attribute.name)) {
        return []
      }

      const deletedAttribute = deletedAttributesByName.get(attribute.name)
      const attributeTypeId = attributeTypeIdsByName.get(attribute.name)

      if (
        !deletedAttribute?.attributeType?.id ||
        deletedAttribute.attributeType.id !== attributeTypeId
      ) {
        return []
      }

      existingByName.set(attribute.name, deletedAttribute)
      return [deletedAttribute.id]
    })

    if (attributeIdsToRestore.length) {
      await this.restoreProducerAttributes(
        attributeIdsToRestore,
        {},
        sharedContext
      )
    }

    return { existingAttributes, existingByName }
  }

  async setProducerAttributes(
    producerId: string,
    inputAttributes: ProducerAttributeInput[] = [],
    sharedContext: Context = {}
  ) {
    const attributes = normalizeAttributes(inputAttributes)
    const names = attributes.map((attribute) => attribute.name)
    const attributeTypeIdsByName = await this.getAttributeTypeIdsByName(
      names,
      sharedContext
    )
    const { existingAttributes, existingByName } =
      await this.getReusableAttributesByName({
        attributeTypeIdsByName,
        attributes,
        producerId,
        sharedContext,
      })

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
      .filter((attribute) => !isDeleted(attribute))
      .filter((attribute) => {
        const name = attribute.attributeType?.name
        return !(name && names.includes(name))
      })
      .map((attribute) => attribute.id)

    if (toCreate.length) {
      await this.createProducerAttributes(toCreate, sharedContext)
    }

    if (toUpdate.length) {
      await this.updateProducerAttributes(toUpdate, sharedContext)
    }

    if (toDelete.length) {
      await this.deleteProducerAttributes(toDelete, sharedContext)
    }
  }

  async upsertProducer(
    input: UpsertProducerDTO
  ): Promise<Awaited<ReturnType<typeof this.createProducers>>[number]> {
    const handle = input.handle ?? kebabCase(input.name)

    return await this.withTransaction({}, async (context) => {
      let producer = (
        await this.listProducers({ handle }, { take: 1 }, context)
      ).shift()

      if (!producer) {
        producer = await this.createProducers(
          {
            handle,
            title: input.name,
          },
          context
        )
      }

      if (producer.title !== input.name) {
        producer = (await this.updateProducers(
          {
            id: producer.id,
            title: input.name,
          },
          context
        )) as typeof producer
      }

      await this.setProducerAttributes(producer.id, input.attributes, context)

      return producer
    })
  }
}

export default ProducerModuleService
