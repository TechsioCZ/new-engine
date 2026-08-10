import { model } from "@medusajs/framework/utils"

const ApiStore = model
  .define("api_store", {
    access_token_expires_at: model.dateTime().nullable(),
    api_key: model.text().nullable(),
    api_url: model.text().nullable(),
    credentials: model.text().nullable(),
    enabled: model.boolean().default(true),
    id: model.id().primaryKey(),
    is_internal: model.boolean().default(false),
    name: model.text().searchable(),
  })
  .indexes([
    {
      name: "IDX_api_store_name_unique",
      on: ["name"],
      unique: true,
      where: { deleted_at: null },
    },
  ])

export default ApiStore
