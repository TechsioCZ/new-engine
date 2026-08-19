import { model } from "@medusajs/framework/utils"
import UrlRegistryOutboxEvent from "./url-registry-outbox-event"

const UrlRegistryOutboxStream = model
  .define("url_registry_outbox_stream", {
    id: model.id({ prefix: "urlros" }).primaryKey(),
    source: model.text(),
    entity_kind: model.text(),
    entity_id: model.text(),
    market_code: model.enum(["sk", "cz", "hu", "ro"]),
    last_sequence: model.number().default(0),
    events: model.hasMany(() => UrlRegistryOutboxEvent, {
      mappedBy: "stream",
    }),
  })
  .indexes([
    {
      name: "IDX_url_registry_outbox_stream_identity_unique",
      on: ["source", "entity_kind", "entity_id", "market_code"],
      unique: true,
      where: "TRUE",
    },
  ])
  .checks([
    {
      name: "url_registry_outbox_stream_sequence_check",
      expression: (columns) => `${columns.last_sequence} >= 0`,
    },
  ])

export default UrlRegistryOutboxStream
