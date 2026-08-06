import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type { Context } from "@medusajs/framework/types"
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"

import {
  MeasurementUnit,
  ProductMeasurement,
  ProductVariantMeasurement,
} from "./models/measurement-unit"

export interface ActiveProductCountRow {
  count: number | string
  measurement_unit_id: string
}

const measurementUnitOperations = {
  executeActiveProductCountsQuery: async (
    ids: string[],
    sharedContext: Context<SqlEntityManager>,
  ): Promise<ActiveProductCountRow[]> => {
    const { manager } = sharedContext

    if (!manager) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Measurement Unit Module manager is unavailable while counting product assignments.",
      )
    }

    const placeholders = ids.map(() => "?").join(", ")

    return await manager.getConnection().execute<ActiveProductCountRow[]>(
      `select "measurement_unit_id", count(*)::int as "count"
       from "product_measurement"
       where "deleted_at" is null
         and "measurement_unit_id" in (${placeholders})
       group by "measurement_unit_id"`,
      ids,
    )
  },
  executeTransactionTask: async <T>(
    task: (context: Context<SqlEntityManager>) => Promise<T>,
    sharedContext: Context<SqlEntityManager>,
  ): Promise<T> => await task(sharedContext),
}

class MeasurementUnitModuleService extends MedusaService({
  MeasurementUnit,
  ProductMeasurement,
  ProductVariantMeasurement,
}) {
  readonly #operations = measurementUnitOperations

  @InjectManager()
  async runInTransaction<T>(
    task: (context: Context<SqlEntityManager>) => Promise<T>,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {},
  ) {
    return await this.runInTransactionWithManager(task, sharedContext)
  }

  @InjectTransactionManager()
  protected async runInTransactionWithManager<T>(
    task: (context: Context<SqlEntityManager>) => Promise<T>,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {},
  ) {
    return await this.#operations.executeTransactionTask(task, sharedContext)
  }

  @InjectManager()
  async getActiveProductCounts(
    unitIds: string[],
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {},
  ): Promise<ActiveProductCountRow[]> {
    const ids = [...new Set(unitIds)].filter(Boolean)

    if (!ids.length) {
      return []
    }

    return await this.#operations.executeActiveProductCountsQuery(
      ids,
      sharedContext,
    )
  }
}

export default MeasurementUnitModuleService
