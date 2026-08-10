import { model } from "@medusajs/framework/utils"

const SymmyImportJob = model
  .define("symmy_import_job", {
    attempts: model.number().default(0),
    error: model.text().nullable(),
    failed: model.number().default(0),
    finished_at: model.dateTime().nullable(),
    id: model.id().primaryKey(),
    idempotency_key: model.text().nullable(),
    payload: model.json(),
    processed: model.number().default(0),
    result: model.json().nullable(),
    started_at: model.dateTime().nullable(),
    status: model.text(),
    total: model.number().default(0),
    type: model.text(),
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
