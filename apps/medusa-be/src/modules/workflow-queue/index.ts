import { Module } from "@medusajs/framework/utils"
import WorkflowQueueModuleService from "./service"

export const WORKFLOW_QUEUE_MODULE = "workflow_queue"

export default Module(WORKFLOW_QUEUE_MODULE, {
  service: WorkflowQueueModuleService,
})
