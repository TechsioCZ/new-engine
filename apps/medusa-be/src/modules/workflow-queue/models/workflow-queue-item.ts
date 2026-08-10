import { model } from "@medusajs/framework/utils"

const WorkflowQueueItem = model
  .define("workflow_queue_item", {
    arguments: model.json(),
    dedupe_key: model.text().nullable(),
    id: model.id().primaryKey(),
    run_at: model.dateTime(),
    workflow: model.text(),
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
      name: "IDX_workflow_queue_item_workflow_dedupe_key_unique",
      on: ["workflow", "dedupe_key"],
      unique: true,
      where: "deleted_at IS NULL AND dedupe_key IS NOT NULL",
    },
  ])

export default WorkflowQueueItem
