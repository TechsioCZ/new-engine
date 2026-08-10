import type { Context } from "@medusajs/framework/types"
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils"

import Brand, { BrandAttribute, BrandAttributeType } from "./models/brand"

export interface BrandAttributeInput {
  name: string
  value: string
}

type Nullable<T> = T | null
type DeletionTimestamp = Nullable<string | Date>

export interface BrandAttributeRecord {
  deleted_at?: DeletionTimestamp
  id: string
  value: string
  attributeType?: {
    deleted_at?: DeletionTimestamp
    id: string
    name: string
  }
}

interface BrandAttributeTypeRecord {
  deleted_at?: DeletionTimestamp
  id: string
  name: string
}

const normalizeAttributes = (attributes: BrandAttributeInput[] = []) => {
  const byName = new Map<string, BrandAttributeInput>()

  for (const attribute of attributes) {
    const name = attribute.name.trim()
    if (name.length === 0) {
      continue
    }

    byName.set(name, {
      name,
      value: attribute.value,
    })
  }

  return [...byName.values()]
}

const isDeleted = (record: { deleted_at?: DeletionTimestamp }) =>
  Boolean(record.deleted_at)

export const shouldDeleteBrandAttribute = (
  attribute: BrandAttributeRecord,
  requestedNames: ReadonlySet<string>,
) => {
  if (isDeleted(attribute) || isDeleted(attribute.attributeType ?? {})) {
    return false
  }

  const name = attribute.attributeType?.name
  return name === undefined || !requestedNames.has(name)
}

class BrandModuleService extends MedusaService({
  Brand,
  BrandAttribute,
  BrandAttributeType,
}) {
  private readonly operations = {
    executeTransactionTask: async <T>(
      task: (context: Context) => Promise<T>,
      sharedContext: Context,
    ): Promise<T> => await task(sharedContext),
  }

  @InjectManager()
  async runInTransaction<T>(
    task: (context: Context) => Promise<T>,
    @MedusaContext() sharedContext: Context = {},
  ) {
    return await this.runInTransactionWithManager(task, sharedContext)
  }

  @InjectTransactionManager()
  protected async runInTransactionWithManager<T>(
    task: (context: Context) => Promise<T>,
    @MedusaContext() sharedContext: Context = {},
  ) {
    return await this.operations.executeTransactionTask(task, sharedContext)
  }

  @InjectTransactionManager()
  protected async getAttributeTypeIdsByName(
    names: string[],
    @MedusaContext() sharedContext: Context = {},
  ) {
    const existingAttributeTypes: BrandAttributeTypeRecord[] =
      names.length > 0
        ? await this.listBrandAttributeTypes(
            {
              name: { $in: names },
            },
            {
              withDeleted: true,
            },
            sharedContext,
          )
        : []
    const attributeTypeIdsByName = new Map<string, string>()
    const deletedAttributeTypesByName = new Map<
      string,
      BrandAttributeTypeRecord
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

      if (deletedAttributeType === undefined) {
        return []
      }

      attributeTypeIdsByName.set(name, deletedAttributeType.id)
      return [deletedAttributeType.id]
    })

    if (attributeTypeIdsToRestore.length > 0) {
      await this.restoreBrandAttributeTypes(
        attributeTypeIdsToRestore,
        {},
        sharedContext,
      )
    }

    const missingAttributeTypeNames = names.filter(
      (name) => !attributeTypeIdsByName.has(name),
    )

    if (missingAttributeTypeNames.length > 0) {
      const createdAttributeTypes = await this.createBrandAttributeTypes(
        missingAttributeTypeNames.map((name) => ({ name })),
        sharedContext,
      )

      for (const attributeType of createdAttributeTypes) {
        attributeTypeIdsByName.set(attributeType.name, attributeType.id)
      }
    }

    return attributeTypeIdsByName
  }

  @InjectTransactionManager()
  protected async getReusableAttributesByName(
    {
      attributeTypeIdsByName,
      attributes,
      brandId,
    }: {
      attributeTypeIdsByName: Map<string, string>
      attributes: BrandAttributeInput[]
      brandId: string
    },
    @MedusaContext() sharedContext: Context = {},
  ) {
    const existingAttributes: BrandAttributeRecord[] =
      await this.listBrandAttributes(
        { brand_id: brandId },
        {
          relations: ["attributeType"],
          withDeleted: true,
        },
        sharedContext,
      )
    const existingByName = new Map<string, BrandAttributeRecord>()
    const deletedAttributesByName = new Map<string, BrandAttributeRecord>()

    for (const attribute of existingAttributes) {
      const name = attribute.attributeType?.name

      if (name !== undefined && name.length > 0) {
        if (isDeleted(attribute)) {
          if (!deletedAttributesByName.has(name)) {
            deletedAttributesByName.set(name, attribute)
          }
        } else {
          existingByName.set(name, attribute)
        }
      }
    }

    const attributeIdsToRestore = attributes.flatMap((attribute) => {
      if (existingByName.has(attribute.name)) {
        return []
      }

      const deletedAttribute = deletedAttributesByName.get(attribute.name)
      const attributeTypeId = attributeTypeIdsByName.get(attribute.name)

      if (
        deletedAttribute?.attributeType?.id === undefined ||
        deletedAttribute.attributeType.id.length === 0 ||
        deletedAttribute.attributeType.id !== attributeTypeId
      ) {
        return []
      }

      existingByName.set(attribute.name, deletedAttribute)
      return [deletedAttribute.id]
    })

    if (attributeIdsToRestore.length > 0) {
      await this.restoreBrandAttributes(
        attributeIdsToRestore,
        {},
        sharedContext,
      )
    }

    return { existingAttributes, existingByName }
  }

  @InjectManager()
  async setBrandAttributes(
    brandId: string,
    inputAttributes: BrandAttributeInput[] = [],
    @MedusaContext() sharedContext: Context = {},
  ) {
    await this.setBrandAttributesWithManager(
      brandId,
      inputAttributes,
      sharedContext,
    )
  }

  @InjectTransactionManager()
  protected async setBrandAttributesWithManager(
    brandId: string,
    inputAttributes: BrandAttributeInput[] = [],
    @MedusaContext() sharedContext: Context = {},
  ) {
    const attributes = normalizeAttributes(inputAttributes)
    const names = attributes.map((attribute) => attribute.name)
    const requestedNames = new Set(names)
    const attributeTypeIdsByName = await this.getAttributeTypeIdsByName(
      names,
      sharedContext,
    )
    const { existingAttributes, existingByName } =
      await this.getReusableAttributesByName(
        {
          attributeTypeIdsByName,
          attributes,
          brandId,
        },
        sharedContext,
      )

    const toCreate = attributes.flatMap((attribute) => {
      if (existingByName.has(attribute.name)) {
        return []
      }

      const attributeTypeId = attributeTypeIdsByName.get(attribute.name)

      if (attributeTypeId === undefined || attributeTypeId.length === 0) {
        return []
      }

      return [
        {
          attribute_type_id: attributeTypeId,
          brand_id: brandId,
          value: attribute.value,
        },
      ]
    })

    const toUpdate = attributes
      .map((attribute) => {
        const existing = existingByName.get(attribute.name)

        if (existing === undefined || existing.value === attribute.value) {
          return null
        }

        return {
          id: existing.id,
          value: attribute.value,
        }
      })
      .filter(
        (attribute): attribute is { id: string; value: string } =>
          attribute !== null,
      )

    const toDelete = existingAttributes.flatMap((attribute) =>
      shouldDeleteBrandAttribute(attribute, requestedNames)
        ? [attribute.id]
        : [],
    )

    if (toCreate.length > 0) {
      await this.createBrandAttributes(toCreate, sharedContext)
    }

    if (toUpdate.length > 0) {
      await this.updateBrandAttributes(toUpdate, sharedContext)
    }

    if (toDelete.length > 0) {
      await this.softDeleteBrandAttributes(toDelete, {}, sharedContext)
    }
  }
}

export default BrandModuleService
