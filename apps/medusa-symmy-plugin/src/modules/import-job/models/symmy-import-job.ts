import { model } from "@medusajs/framework/utils"

const SymmyImportJob = model
  .define("symmy_import_job", {
    id: model.id().primaryKey(),
    type: model.text(),
    status: model.text(),
    payload: model.json(),
    result: model.json().nullable(),
    error: model.text().nullable(),
    total: model.number().default(0),
    processed: model.number().default(0),
    failed: model.number().default(0),
    attempts: model.number().default(0),
    idempotency_key: model.text().nullable(),
    started_at: model.dateTime().nullable(),
    finished_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["type"] },
    { on: ["status"] },
    {
      on: ["type", "idempotency_key"],
      unique: true,
      where: { deleted_at: null },
    },
  ])

export default SymmyImportJob
