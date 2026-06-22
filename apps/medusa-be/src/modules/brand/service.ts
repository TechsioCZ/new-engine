import type { Context } from "@medusajs/framework/types"
import { kebabCase, MedusaService } from "@medusajs/framework/utils"
import Brand from "./models/brand"
import BrandAttribute from "./models/brand-attribute"
import BrandAttributeType from "./models/brand-attribute-type"

export type BrandAttributeInput = {
  name: string
  value: string
}

export type UpsertBrandDTO = {
  name: string
  handle?: string
  attributes: BrandAttributeInput[]
}

type BrandAttributeRecord = {
  deleted_at?: string | Date | null
  id: string
  value: string
  attributeType?: {
    id: string
    name: string
  }
}

type BrandAttributeTypeRecord = {
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

class BrandModuleService extends MedusaService({
  Brand,
  BrandAttribute,
  BrandAttributeType,
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

  private async getReusableAttributesByName({
    attributeTypeIdsByName,
    attributes,
    brandId,
    sharedContext,
  }: {
    attributeTypeIdsByName: Map<string, string>
    attributes: BrandAttributeInput[]
    brandId: string
    sharedContext: Context
  }) {
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

  async setBrandAttributes(
    brandId: string,
    inputAttributes: BrandAttributeInput[] = [],
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
        brandId,
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
      .filter((attribute) => !isDeleted(attribute))
      .filter((attribute) => {
        const name = attribute.attributeType?.name
        return !(name && names.includes(name))
      })
      .map((attribute) => attribute.id)

    if (toCreate.length) {
      await this.createBrandAttributes(toCreate, sharedContext)
    }

    if (toUpdate.length) {
      await this.updateBrandAttributes(toUpdate, sharedContext)
    }

    if (toDelete.length) {
      await this.deleteBrandAttributes(toDelete, sharedContext)
    }
  }

  async upsertBrand(
    input: UpsertBrandDTO
  ): Promise<Awaited<ReturnType<typeof this.createBrands>>[number]> {
    const handle = input.handle ?? kebabCase(input.name)

    return await this.withTransaction({}, async (context) => {
      let brand = (
        await this.listBrands({ handle }, { take: 1 }, context)
      ).shift()

      if (!brand) {
        brand = await this.createBrands(
          {
            handle,
            title: input.name,
          },
          context
        )
      }

      if (brand.title !== input.name) {
        brand = (await this.updateBrands(
          {
            id: brand.id,
            title: input.name,
          },
          context
        )) as typeof brand
      }

      await this.setBrandAttributes(brand.id, input.attributes, context)

      return brand
    })
  }
}

export default BrandModuleService
