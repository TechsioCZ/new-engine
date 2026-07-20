import { Module } from "@medusajs/framework/utils"
import MeasurementUnitModuleService from "./service"

export const MEASUREMENT_UNIT_MODULE = "measurement_unit"

export default Module(MEASUREMENT_UNIT_MODULE, {
  service: MeasurementUnitModuleService,
})
