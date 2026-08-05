export interface MeasurementUnitInput {
  base_quantity: number
  code: string
  description?: null | string | undefined
  name: string
  symbol: string
}

export interface CreateMeasurementUnitsWorkflowInput {
  units: MeasurementUnitInput[]
}

export interface UpdateMeasurementUnitWorkflowInput {
  id: string
  update: Partial<MeasurementUnitInput>
}

export interface DeleteMeasurementUnitsWorkflowInput {
  ids: string[]
}

export interface RestoreMeasurementUnitsWorkflowInput {
  ids: string[]
}

export interface SetProductMeasurementWorkflowInput {
  measurement_unit_id: string
  product_id: string
}

export interface ProductVariantMeasurementInput {
  product_unit_quantity: number
  product_variant_id: string
}

export type SetProductVariantMeasurementWorkflowInput =
  ProductVariantMeasurementInput & {
    product_id: string
  }

export interface DeleteProductVariantMeasurementWorkflowInput {
  product_id: string
  product_variant_id: string
}

export interface DeleteProductMeasurementWorkflowInput {
  product_id: string
}
