import type { Context } from "@medusajs/framework/types"
import { MedusaService } from "@medusajs/framework/utils"
import WorkflowQueueItem from "./models/workflow-queue-item"

type SqlManager = {
  execute: <T = unknown>(sql: string, params?: unknown[]) => Promise<T>
}

type ServiceWithBaseRepository = {
  baseRepository_: {
    getFreshManager: (context?: Context) => SqlManager
  }
}

type IdRow = {
  id: string
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
    const manager = (this as unknown as ServiceWithBaseRepository).baseRepository_.getFreshManager(sharedContext)
    const rows = await manager.execute<IdRow[]>(
      `select "id"
         from "workflow_queue_item"
        where "workflow" = ?
          and "arguments"->>'order_id' = ?
          and "deleted_at" is null
        limit 1`,
      [workflow, orderId]
    )

    return rows.length > 0
  }
}

export default WorkflowQueueModuleService
