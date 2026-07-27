import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type { Context } from "@medusajs/framework/types"
import {
  InjectManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"
import MeasurementUnit from "./models/measurement-unit"
import ProductMeasurement from "./models/product-measurement"
import ProductVariantMeasurement from "./models/product-variant-measurement"

export type ActiveProductCountRow = {
  count: number | string
  measurement_unit_id: string
}

class MeasurementUnitModuleService extends MedusaService({
  MeasurementUnit,
  ProductMeasurement,
  ProductVariantMeasurement,
}) {
  @InjectManager()
  async getActiveProductCounts(
    unitIds: string[],
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<ActiveProductCountRow[]> {
    const ids = [...new Set(unitIds)].filter(Boolean)

    if (!ids.length) {
      return [] as ActiveProductCountRow[]
    }

    const manager = sharedContext.manager

    if (!manager) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Measurement Unit Module manager is unavailable while counting product assignments."
      )
    }

    const placeholders = ids.map(() => "?").join(", ")

    return await manager.getConnection().execute<ActiveProductCountRow[]>(
      `select "measurement_unit_id", count(*)::int as "count"
       from "product_measurement"
       where "deleted_at" is null
         and "measurement_unit_id" in (${placeholders})
       group by "measurement_unit_id"`,
      ids
    )
  }
}

export default MeasurementUnitModuleService
