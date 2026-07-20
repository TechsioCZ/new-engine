import type { Context } from "@medusajs/framework/types"
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils"
import Brand from "./models/brand"
import BrandAttribute from "./models/brand-attribute"
import BrandAttributeType from "./models/brand-attribute-type"

export type BrandAttributeInput = {
  name: string
  value: string
}

export type BrandAttributeRecord = {
  deleted_at?: string | Date | null
  id: string
  value: string
  attributeType?: {
    deleted_at?: string | Date | null
    id: string
    name: string
  }
}

type BrandAttributeTypeRecord = {
  deleted_at?: string | Date | null
  id: string
  name: string
}

const normalizeAttributes = (attributes: BrandAttributeInput[] = []) => {
  const byName = new Map<string, BrandAttributeInput>()

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

export const shouldDeleteBrandAttribute = (
  attribute: BrandAttributeRecord,
  requestedNames: ReadonlySet<string>
) => {
  if (isDeleted(attribute) || isDeleted(attribute.attributeType ?? {})) {
    return false
  }

  const name = attribute.attributeType?.name
  return !(name && requestedNames.has(name))
}

class BrandModuleService extends MedusaService({
  Brand,
  BrandAttribute,
  BrandAttributeType,
}) {
  @InjectManager()
  async runInTransaction<T>(
    task: (context: Context) => Promise<T>,
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.runInTransaction_(task, sharedContext)
  }

  @InjectTransactionManager()
  protected async runInTransaction_<T>(
    task: (context: Context) => Promise<T>,
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await task(sharedContext)
  }

  @InjectTransactionManager()
  protected async getAttributeTypeIdsByName(
    names: string[],
    @MedusaContext() sharedContext: Context = {}
  ) {
    const existingAttributeTypes = names.length
      ? ((await this.listBrandAttributeTypes(
          {
            name: { $in: names },
          },
          {
            withDeleted: true,
          },
          sharedContext
        )) as BrandAttributeTypeRecord[])
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

      if (!deletedAttributeType) {
        return []
      }

      attributeTypeIdsByName.set(name, deletedAttributeType.id)
      return [deletedAttributeType.id]
    })

    if (attributeTypeIdsToRestore.length) {
      await this.restoreBrandAttributeTypes(
        attributeTypeIdsToRestore,
        {},
        sharedContext
      )
    }

    const missingAttributeTypeNames = names.filter(
      (name) => !attributeTypeIdsByName.has(name)
    )

    if (missingAttributeTypeNames.length) {
      const createdAttributeTypes = (await this.createBrandAttributeTypes(
        missingAttributeTypeNames.map((name) => ({ name })),
        sharedContext
      )) as Array<{ id: string; name: string }>

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
    @MedusaContext() sharedContext: Context = {}
  ) {
    const existingAttributes = (await this.listBrandAttributes(
      { brand_id: brandId },
      {
        relations: ["attributeType"],
        withDeleted: true,
      },
      sharedContext
    )) as BrandAttributeRecord[]
    const existingByName = new Map<string, BrandAttributeRecord>()
    const deletedAttributesByName = new Map<string, BrandAttributeRecord>()

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
      await this.restoreBrandAttributes(
        attributeIdsToRestore,
        {},
        sharedContext
      )
    }

    return { existingAttributes, existingByName }
  }

  @InjectManager()
  async setBrandAttributes(
    brandId: string,
    inputAttributes: BrandAttributeInput[] = [],
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.setBrandAttributes_(
      brandId,
      inputAttributes,
      sharedContext
    )
  }

  @InjectTransactionManager()
  protected async setBrandAttributes_(
    brandId: string,
    inputAttributes: BrandAttributeInput[] = [],
    @MedusaContext() sharedContext: Context = {}
  ) {
    const attributes = normalizeAttributes(inputAttributes)
    const names = attributes.map((attribute) => attribute.name)
    const requestedNames = new Set(names)
    const attributeTypeIdsByName = await this.getAttributeTypeIdsByName(
      names,
      sharedContext
    )
    const { existingAttributes, existingByName } =
      await this.getReusableAttributesByName(
        {
          attributeTypeIdsByName,
          attributes,
          brandId,
        },
        sharedContext
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
          brand_id: brandId,
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
      .filter((attribute) =>
        shouldDeleteBrandAttribute(attribute, requestedNames)
      )
      .map((attribute) => attribute.id)

    if (toCreate.length) {
      await this.createBrandAttributes(toCreate, sharedContext)
    }

    if (toUpdate.length) {
      await this.updateBrandAttributes(toUpdate, sharedContext)
    }

    if (toDelete.length) {
      await this.softDeleteBrandAttributes(toDelete, {}, sharedContext)
    }
  }
}

export default BrandModuleService
