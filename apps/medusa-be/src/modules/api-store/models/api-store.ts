import { model } from "@medusajs/framework/utils"

const ApiStore = model
  .define("api_store", {
    id: model.id().primaryKey(),
    name: model.text().searchable(),
    api_url: model.text().nullable(),
    api_key: model.text().nullable(),
    credentials: model.text().nullable(),
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
