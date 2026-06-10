import { MedusaService } from "@medusajs/framework/utils"
import WorkflowQueueItem from "./models/workflow-queue-item"

class WorkflowQueueModuleService extends MedusaService({
  WorkflowQueueItem,
}) {}

export default WorkflowQueueModuleService
