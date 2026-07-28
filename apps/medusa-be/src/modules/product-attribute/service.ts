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

    const placeholders = uniqueIds.map(() => "?").join(", ")

    return await manager.getConnection().execute<ProductAttributeUsageCount[]>(
      `select "${column}" as "id", count(*)::int as "count"
       from "product_attribute"
       where "deleted_at" is null
         and "${column}" in (${placeholders})
       group by "${column}"`,
      uniqueIds
    )
  }
}

export default ProductAttributeModuleService
