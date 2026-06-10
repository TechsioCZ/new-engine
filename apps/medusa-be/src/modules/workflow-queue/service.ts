import type { Context } from "@medusajs/framework/types"
import { MedusaService } from "@medusajs/framework/utils"
import WorkflowQueueItem from "./models/workflow-queue-item"

type QueryBuilder = {
  andWhere: (condition: Record<string, unknown> | string, params?: unknown[]) => QueryBuilder
  execute: <T = unknown>(method?: "all" | "get" | "run") => Promise<T>
  limit: (limit: number) => QueryBuilder
  select: (fields: string[]) => QueryBuilder
  where: (condition: Record<string, unknown>) => QueryBuilder
}

type QueryBuilderManager = {
  createQueryBuilder: (entity: unknown, alias: string) => QueryBuilder
}

type ServiceWithBaseRepository = {
  baseRepository_: {
    getFreshManager: (context?: Context) => QueryBuilderManager
  }
}

class WorkflowQueueModuleService extends MedusaService({
  WorkflowQueueItem,
}) {
  async hasQueuedWorkflowForOrder(
    {
      orderId,
      workflow,
    }: {
      orderId: string
      workflow: string
    },
    sharedContext: Context = {}
  ) {
    const manager = (
      this as unknown as ServiceWithBaseRepository
    ).baseRepository_.getFreshManager(sharedContext)
    const row = await manager
      .createQueryBuilder(WorkflowQueueItem, "item")
      .select(["item.id"])
      .where({
        deleted_at: null,
        workflow,
      })
      .andWhere('"item"."arguments"->>\'order_id\' = ?', [orderId])
      .limit(1)
      .execute<{ id: string } | undefined>("get")

    return Boolean(row)
  }
}

export default WorkflowQueueModuleService
