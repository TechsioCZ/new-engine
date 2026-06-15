import { MedusaService } from "@medusajs/framework/utils"
import MeasurementUnit from "./models/measurement-unit"
import ProductMeasurement from "./models/product-measurement"

class MeasurementUnitModuleService extends MedusaService({
  MeasurementUnit,
  ProductMeasurement,
}) {}

export default MeasurementUnitModuleService
