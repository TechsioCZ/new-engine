import type { Link } from "@medusajs/framework/modules-sdk"
import type { MedusaContainer, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  createLinksWorkflow,
  dismissLinksWorkflow,
} from "@medusajs/medusa/core-flows"
import { ProductMeasurementLink } from "../../../links/product-measurement"
import { ProductVariantMeasurementLink } from "../../../links/product-variant-measurement"
import { MEASUREMENT_UNIT_MODULE } from "../../../modules/measurement-unit"
import type {
  MeasurementUnitRecord,
  ProductMeasurementRecord,
  ProductVariantMeasurementRecord,
} from "../../../utils/measurement-units"
import { getMeasurementUnitService } from "../../../utils/measurement-units"

type ProductRecord = {
  id: string
}

type ProductVariantRecord = {
  id: string
  product_id?: null | string
}

type ProductMeasurementLinkRecord = {
  deleted_at?: Date | string | null
  product_id?: string
  product_measurement_id?: string
}

type ProductMeasurementLinkIds = {
  product_id: string
  product_measurement_id: string
}

type ProductVariantMeasurementLinkRecord = {
  deleted_at?: Date | string | null
  product_variant_id?: string
  product_variant_measurement_id?: string
}

type ProductVariantMeasurementLinkIds = {
  product_variant_id: string
  product_variant_measurement_id: string
}

type TimestampedRecord = {
  created_at?: Date | string
  deleted_at?: Date | string | null
  id: string
  updated_at?: Date | string
}

const getTime = (value?: Date | string) => {
  if (!value) {
    return 0
  }

  const time = new Date(value).getTime()

  return Number.isFinite(time) ? time : 0
}

const isDeleted = (record: { deleted_at?: Date | string | null }) =>
  !!record.deleted_at

export const pickCanonicalRecord = <TRecord extends TimestampedRecord>(
  records: TRecord[]
) => {
  const [record] = [...records].sort((left, right) => {
    const activeCompare = Number(isDeleted(left)) - Number(isDeleted(right))

    if (activeCompare !== 0) {
      return activeCompare
    }

    const leftTime = Math.max(
      getTime(left.updated_at),
      getTime(left.created_at)
    )
    const rightTime = Math.max(
      getTime(right.updated_at),
      getTime(right.created_at)
    )
    const timeCompare = rightTime - leftTime

    if (timeCompare !== 0) {
      return timeCompare
    }

    return left.id.localeCompare(right.id)
  })

  return record
}

export const normalizeUnitCode = (code: string) =>
  code.trim().toLowerCase().replace(/\s+/g, "_")

export const productMeasurementLink = (
  productId: string,
  productMeasurementId: string
) => ({
  [Modules.PRODUCT]: {
    product_id: productId,
  },
  [MEASUREMENT_UNIT_MODULE]: {
    product_measurement_id: productMeasurementId,
  },
})

export const productVariantMeasurementLink = (
  productVariantId: string,
  productVariantMeasurementId: string
) => ({
  [Modules.PRODUCT]: {
    product_variant_id: productVariantId,
  },
  [MEASUREMENT_UNIT_MODULE]: {
    product_variant_measurement_id: productVariantMeasurementId,
  },
})

export const restoreProductMeasurementLink = async (
  container: MedusaContainer,
  productMeasurementId: string
) => {
  const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

  await link.restore({
    [MEASUREMENT_UNIT_MODULE]: {
      product_measurement_id: productMeasurementId,
    },
  })
}

export const restoreOrCreateProductMeasurementLink = async (
  container: MedusaContainer,
  productId: string,
  productMeasurementId: string
) => {
  await dismissProductMeasurementLinksByProduct(container, productId)
  await restoreProductMeasurementLink(container, productMeasurementId)

  const activeLink = await getProductMeasurementLinkByPair(
    container,
    productId,
    productMeasurementId
  )

  if (!activeLink) {
    await createLinksWorkflow(container).run({
      input: [productMeasurementLink(productId, productMeasurementId)],
    })
  }
}

export const restoreProductVariantMeasurementLinks = async (
  container: MedusaContainer,
  productVariantMeasurementIds: string[]
) => {
  if (!productVariantMeasurementIds.length) {
    return
  }

  const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

  await link.restore({
    [MEASUREMENT_UNIT_MODULE]: {
      product_variant_measurement_id: productVariantMeasurementIds,
    },
  })
}

export const restoreOrCreateProductVariantMeasurementLinks = async (
  container: MedusaContainer,
  variantMeasurements: ProductVariantMeasurementRecord[]
) => {
  await dismissProductVariantMeasurementLinksByVariantIds(
    container,
    variantMeasurements.map((measurement) => measurement.product_variant_id)
  )
  await restoreProductVariantMeasurementLinks(
    container,
    variantMeasurements.map((measurement) => measurement.id)
  )

  const missingLinks: ProductVariantMeasurementRecord[] = []

  for (const measurement of variantMeasurements) {
    const activeLink = await getProductVariantMeasurementLinkByPair(
      container,
      measurement.product_variant_id,
      measurement.id
    )

    if (!activeLink) {
      missingLinks.push(measurement)
    }
  }

  if (missingLinks.length) {
    await createLinksWorkflow(container).run({
      input: missingLinks.map((measurement) =>
        productVariantMeasurementLink(
          measurement.product_variant_id,
          measurement.id
        )
      ),
    })
  }
}

export const dismissProductMeasurementLink = async (
  container: MedusaContainer,
  productId: string,
  productMeasurementId: string
) => {
  await dismissLinksWorkflow(container).run({
    input: [productMeasurementLink(productId, productMeasurementId)],
  })
}

export const dismissProductMeasurementLinksByProduct = async (
  container: MedusaContainer,
  productId: string
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductMeasurementLink.entryPoint,
    fields: ["product_id", "product_measurement_id"],
    filters: {
      product_id: productId,
    },
  })
  const links = (data as ProductMeasurementLinkRecord[]).flatMap((link) =>
    link.product_id && link.product_measurement_id
      ? [
          {
            product_id: link.product_id,
            product_measurement_id: link.product_measurement_id,
          } satisfies ProductMeasurementLinkIds,
        ]
      : []
  )

  if (!links.length) {
    return
  }

  await dismissLinksWorkflow(container).run({
    input: links.map((link) =>
      productMeasurementLink(link.product_id, link.product_measurement_id)
    ),
  })
}

export const getProductMeasurementLinkByPair = async (
  container: MedusaContainer,
  productId: string,
  productMeasurementId: string,
  options: { withDeleted?: boolean } = {}
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductMeasurementLink.entryPoint,
    fields: ["deleted_at", "product_id", "product_measurement_id"],
    filters: {
      product_id: productId,
      product_measurement_id: productMeasurementId,
    },
    withDeleted: options.withDeleted,
  })

  return (data as ProductMeasurementLinkRecord[])[0]
}

export const dismissProductVariantMeasurementLinksByVariantIds = async (
  container: MedusaContainer,
  productVariantIds: string[]
) => {
  const ids = [...new Set(productVariantIds)].filter(Boolean)

  if (!ids.length) {
    return
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductVariantMeasurementLink.entryPoint,
    fields: ["product_variant_id", "product_variant_measurement_id"],
    filters: {
      product_variant_id: { $in: ids },
    },
  })
  const links = (data as ProductVariantMeasurementLinkRecord[]).flatMap(
    (link) =>
      link.product_variant_id && link.product_variant_measurement_id
        ? [
            {
              product_variant_id: link.product_variant_id,
              product_variant_measurement_id:
                link.product_variant_measurement_id,
            } satisfies ProductVariantMeasurementLinkIds,
          ]
        : []
  )

  if (!links.length) {
    return
  }

  await dismissLinksWorkflow(container).run({
    input: links.map((link) =>
      productVariantMeasurementLink(
        link.product_variant_id,
        link.product_variant_measurement_id
      )
    ),
  })
}

export const getProductVariantMeasurementLinkByPair = async (
  container: MedusaContainer,
  productVariantId: string,
  productVariantMeasurementId: string,
  options: { withDeleted?: boolean } = {}
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: ProductVariantMeasurementLink.entryPoint,
    fields: [
      "deleted_at",
      "product_variant_id",
      "product_variant_measurement_id",
    ],
    filters: {
      product_variant_id: productVariantId,
      product_variant_measurement_id: productVariantMeasurementId,
    },
    withDeleted: options.withDeleted,
  })

  return (data as ProductVariantMeasurementLinkRecord[])[0]
}

export const dismissProductVariantMeasurementLinks = async (
  container: MedusaContainer,
  variantMeasurements: ProductVariantMeasurementRecord[]
) => {
  const input = variantMeasurements.map((measurement) =>
    productVariantMeasurementLink(
      measurement.product_variant_id,
      measurement.id
    )
  )

  if (input.length) {
    await dismissLinksWorkflow(container).run({ input })
  }
}

export const ensureProductExists = async (
  container: MedusaContainer,
  productId: string
) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {
      id: productId,
    },
  })
  const product = (data as ProductRecord[])[0]

  if (!product?.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id "${productId}" was not found`
    )
  }

  return product
}

export const ensureProductVariantBelongsToProduct = async (
  container: MedusaContainer,
  productId: string,
  productVariantId: string
) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product_id"],
    filters: {
      id: productVariantId,
    },
  })
  const variant = (data as ProductVariantRecord[])[0]

  if (!variant?.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product variant with id "${productVariantId}" was not found`
    )
  }

  if (variant.product_id !== productId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Product variant "${productVariantId}" does not belong to product "${productId}".`
    )
  }

  return variant
}

export const retrieveActiveUnitOrThrow = async (
  container: MedusaContainer,
  unitId: string
) => {
  const [unit] = (await getMeasurementUnitService(
    container
  ).listMeasurementUnits(
    {
      id: unitId,
    },
    {
      take: 1,
    }
  )) as MeasurementUnitRecord[]

  if (!unit) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Measurement unit with id "${unitId}" was not found`
    )
  }

  return unit
}

export const ensureUnitCodeAvailable = async ({
  code,
  container,
  excludeId,
}: {
  code: string
  container: MedusaContainer
  excludeId?: string
}) => {
  const normalizedCode = normalizeUnitCode(code)
  const [existing] = (await getMeasurementUnitService(
    container
  ).listMeasurementUnits(
    {
      code: normalizedCode,
    },
    {
      take: 1,
      withDeleted: true,
    }
  )) as MeasurementUnitRecord[]

  if (existing && existing.id !== excludeId) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      `Measurement unit with code "${normalizedCode}" already exists.`
    )
  }

  return normalizedCode
}

export const getCurrentProductMeasurement = async (
  container: MedusaContainer,
  productId: string,
  options: { withDeleted?: boolean } = {}
) => {
  const [measurement] = (await getMeasurementUnitService(
    container
  ).listProductMeasurements(
    {
      product_id: productId,
    },
    {
      relations: ["measurement_unit", "variant_measurements"],
      take: 1,
      withDeleted: options.withDeleted,
    }
  )) as ProductMeasurementRecord[]

  return measurement
}

export const listProductMeasurementsForProduct = async (
  container: MedusaContainer,
  productId: string,
  options: { withDeleted?: boolean } = {}
) =>
  (await getMeasurementUnitService(container).listProductMeasurements(
    {
      product_id: productId,
    },
    {
      relations: ["measurement_unit", "variant_measurements"],
      withDeleted: options.withDeleted,
    }
  )) as ProductMeasurementRecord[]

export const getCanonicalProductMeasurement = async ({
  container,
  productId,
  unitId,
  withDeleted = false,
}: {
  container: MedusaContainer
  productId: string
  unitId?: string
  withDeleted?: boolean
}) => {
  const measurements = await listProductMeasurementsForProduct(
    container,
    productId,
    {
      withDeleted,
    }
  )
  const filtered = unitId
    ? measurements.filter(
        (measurement) => measurement.measurement_unit_id === unitId
      )
    : measurements

  return pickCanonicalRecord(filtered)
}

export const getCanonicalProductVariantMeasurement = async ({
  container,
  productMeasurementId,
  productVariantId,
  withDeleted = false,
}: {
  container: MedusaContainer
  productMeasurementId: string
  productVariantId: string
  withDeleted?: boolean
}) => {
  const measurements = (await getMeasurementUnitService(
    container
  ).listProductVariantMeasurements(
    {
      product_measurement_id: productMeasurementId,
      product_variant_id: productVariantId,
    },
    {
      withDeleted,
    }
  )) as ProductVariantMeasurementRecord[]

  return pickCanonicalRecord(measurements)
}
