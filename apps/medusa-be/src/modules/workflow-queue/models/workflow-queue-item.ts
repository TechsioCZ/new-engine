import { model } from "@medusajs/framework/utils"

const WorkflowQueueItem = model
  .define("workflow_queue_item", {
    id: model.id().primaryKey(),
    run_at: model.dateTime(),
    workflow: model.text(),
    arguments: model.json(),
    deduplication_key: model.text().nullable(),
  })
  .indexes([
    {
      name: "IDX_workflow_queue_item_run_at",
      on: ["run_at"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_workflow_queue_item_workflow",
      on: ["workflow"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_workflow_queue_item_workflow_deduplication_key",
      on: ["workflow", "deduplication_key"],
      where: "deleted_at IS NULL",
    },
  ])

export default WorkflowQueueItem
