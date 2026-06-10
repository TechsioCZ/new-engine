import { Module } from "@medusajs/framework/utils"
import WorkflowQueueModuleService from "./service"

export const WORKFLOW_QUEUE_MODULE = "workflowQueue"

export default Module(WORKFLOW_QUEUE_MODULE, {
  service: WorkflowQueueModuleService,
})
