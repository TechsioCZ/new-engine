import { model } from "@medusajs/framework/utils"

import ProducerAttribute from "./producer-attribute"

const Producer = model
  .define("producer", {
    id: model.id().primaryKey(),
    title: model.text().searchable(),
    handle: model.text().searchable(),
    attributes: model.hasMany(() => ProducerAttribute, {
      mappedBy: "producer",
    }),
  })
  .indexes([
    {
      name: "IDX_producer_handle_unique",
      on: ["handle"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default Producer
