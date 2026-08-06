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

export interface ProductAttributeUsageCount {
  count: number | string
  id: string
}

const USAGE_COUNT_CHUNK_SIZE = 500

const getActiveUsageCounts = async (
  column: "definition_id" | "option_id",
  ids: string[],
  sharedContext: Context<SqlEntityManager>,
): Promise<ProductAttributeUsageCount[]> => {
  const uniqueIds = [...new Set(ids)].filter((id) => id.length > 0)

  if (uniqueIds.length === 0) {
    return []
  }

  const { manager } = sharedContext
  if (manager === undefined) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Product Attribute Module manager is unavailable while counting assignments.",
    )
  }

  const chunks: string[][] = []
  for (
    let index = 0;
    index < uniqueIds.length;
    index += USAGE_COUNT_CHUNK_SIZE
  ) {
    chunks.push(uniqueIds.slice(index, index + USAGE_COUNT_CHUNK_SIZE))
  }

  const rowGroups = await Promise.all(
    chunks.map(async (chunk) => {
      const placeholders = chunk.map(() => "?").join(", ")
      return await manager
        .getConnection()
        .execute<ProductAttributeUsageCount[]>(
          `select "${column}" as "id", count(*)::int as "count"
           from "product_attribute"
           where "deleted_at" is null
             and "${column}" in (${placeholders})
           group by "${column}"`,
          chunk,
        )
    }),
  )
  const countsById = new Map<string, number>()
  for (const row of rowGroups.flat()) {
    countsById.set(row.id, (countsById.get(row.id) ?? 0) + Number(row.count))
  }

  return [...countsById].map(([id, count]) => ({ count, id }))
}

class ProductAttributeModuleService extends MedusaService({
  ProductAttribute,
  ProductAttributeDefinition,
  ProductAttributeOption,
}) {
  private readonly operations = {
    countActiveUsage: getActiveUsageCounts,
    executeTransactionTask: async <T>(
      task: (context: Context<SqlEntityManager>) => Promise<T>,
      sharedContext: Context<SqlEntityManager>,
    ): Promise<T> => await task(sharedContext),
  }

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
    return await this.operations.executeTransactionTask(task, sharedContext)
  }

  @InjectManager()
  async getActiveDefinitionUsageCounts(
    definitionIds: string[],
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {},
  ): Promise<ProductAttributeUsageCount[]> {
    return await this.getActiveUsageCounts(
      "definition_id",
      definitionIds,
      sharedContext,
    )
  }

  @InjectManager()
  async getActiveOptionUsageCounts(
    optionIds: string[],
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {},
  ): Promise<ProductAttributeUsageCount[]> {
    return await this.getActiveUsageCounts(
      "option_id",
      optionIds,
      sharedContext,
    )
  }

  @InjectTransactionManager()
  private async getActiveUsageCounts(
    column: "definition_id" | "option_id",
    ids: string[],
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {},
  ): Promise<ProductAttributeUsageCount[]> {
    return await this.operations.countActiveUsage(column, ids, sharedContext)
  }
}

export default ProductAttributeModuleService
