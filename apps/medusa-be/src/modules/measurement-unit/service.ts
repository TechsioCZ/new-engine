import { MedusaService } from "@medusajs/framework/utils"
import MeasurementUnit from "./models/measurement-unit"
import ProductMeasurement from "./models/product-measurement"
import ProductVariantMeasurement from "./models/product-variant-measurement"

class MeasurementUnitModuleService extends MedusaService({
  MeasurementUnit,
  ProductMeasurement,
  ProductVariantMeasurement,
}) {}

export default MeasurementUnitModuleService
