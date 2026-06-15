export type MeasurementUnitInput = {
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
  product_unit_quantity: number
}

export type DeleteProductMeasurementWorkflowInput = {
  product_id: string
}
