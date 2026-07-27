export type MeasurementUnitInput = {
  base_quantity: number
  code: string
  description?: null | string
  name: string
  symbol: string
}

export type CreateMeasurementUnitsWorkflowInput = {
  units: MeasurementUnitInput[]
}

export type UpdateMeasurementUnitWorkflowInput = {
  id: string
  update: Partial<MeasurementUnitInput>
}

export type DeleteMeasurementUnitsWorkflowInput = {
  ids: string[]
}

export type RestoreMeasurementUnitsWorkflowInput = {
  ids: string[]
}

export type SetProductMeasurementWorkflowInput = {
  measurement_unit_id: string
  product_id: string
}

export type ProductVariantMeasurementInput = {
  product_unit_quantity: number
  product_variant_id: string
}

export type SetProductVariantMeasurementWorkflowInput =
  ProductVariantMeasurementInput & {
    product_id: string
  }

export type DeleteProductVariantMeasurementWorkflowInput = {
  product_id: string
  product_variant_id: string
}

export type DeleteProductMeasurementWorkflowInput = {
  product_id: string
}
