import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  createLinksWorkflow,
  dismissLinksWorkflow,
} from "@medusajs/medusa/core-flows"
import { MEASUREMENT_UNIT_MODULE } from "../../../modules/measurement-unit"
import type {
  MeasurementUnitRecord,
  ProductMeasurementRecord,
} from "../../../utils/measurement-units"
import { getMeasurementUnitService } from "../../../utils/measurement-units"

export { getMeasurementUnitService } from "../../../utils/measurement-units"

type ProductRecord = {
  id: string
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

export const createProductMeasurementLink = async (
  container: MedusaContainer,
  productId: string,
  productMeasurementId: string
) => {
  await createLinksWorkflow(container).run({
    input: [productMeasurementLink(productId, productMeasurementId)],
  })
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
      relations: ["measurementUnit"],
      take: 1,
      withDeleted: options.withDeleted,
    }
  )) as ProductMeasurementRecord[]

  return measurement
}
