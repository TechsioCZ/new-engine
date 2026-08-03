import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type { Context } from "@medusajs/framework/types"
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"

import ProductAttribute from "./models/product-attribute"
import ProductAttributeDefinition from "./models/product-attribute-definition"
import ProductAttributeOption from "./models/product-attribute-option"

export type ProductAttributeUsageCount = {
  count: number | string
  id: string
}

const USAGE_COUNT_CHUNK_SIZE = 500

class ProductAttributeModuleService extends MedusaService({
  ProductAttribute,
  ProductAttributeDefinition,
  ProductAttributeOption,
}) {
  @InjectManager()
  async runInTransaction<T>(
    task: (context: Context<SqlEntityManager>) => Promise<T>,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    return await this.runInTransaction_(task, sharedContext)
  }

  @InjectTransactionManager()
  protected async runInTransaction_<T>(
    task: (context: Context<SqlEntityManager>) => Promise<T>,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    return await task(sharedContext)
  }

  @InjectManager()
  async getActiveDefinitionUsageCounts(
    definitionIds: string[],
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<ProductAttributeUsageCount[]> {
    return await this.getActiveUsageCounts(
      "definition_id",
      definitionIds,
      sharedContext
    )
  }

  @InjectManager()
  async getActiveOptionUsageCounts(
    optionIds: string[],
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<ProductAttributeUsageCount[]> {
    return await this.getActiveUsageCounts(
      "option_id",
      optionIds,
      sharedContext
    )
  }

  @InjectTransactionManager()
  private async getActiveUsageCounts(
    column: "definition_id" | "option_id",
    ids: string[],
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<ProductAttributeUsageCount[]> {
    const uniqueIds = [...new Set(ids)].filter(Boolean)

    if (!uniqueIds.length) {
      return []
    }

    const manager = sharedContext.manager
    if (!manager) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Product Attribute Module manager is unavailable while counting assignments."
      )
    }

    const countsById = new Map<string, number>()

    for (
      let index = 0;
      index < uniqueIds.length;
      index += USAGE_COUNT_CHUNK_SIZE
    ) {
      const chunk = uniqueIds.slice(index, index + USAGE_COUNT_CHUNK_SIZE)
      const placeholders = chunk.map(() => "?").join(", ")
      const rows = await manager
        .getConnection()
        .execute<ProductAttributeUsageCount[]>(
          `select "${column}" as "id", count(*)::int as "count"
           from "product_attribute"
           where "deleted_at" is null
             and "${column}" in (${placeholders})
           group by "${column}"`,
          chunk
        )

      for (const row of rows) {
        countsById.set(
          row.id,
          (countsById.get(row.id) ?? 0) + Number(row.count)
        )
      }
    }

    return [...countsById].map(([id, count]) => ({ count, id }))
  }
}

export default ProductAttributeModuleService
