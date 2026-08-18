import { model } from "@medusajs/framework/utils"
import UrlRegistryOutboxStream from "./url-registry-outbox-stream"

const UrlRegistryOutboxEvent = model
  .define("url_registry_outbox_event", {
    id: model.id({ prefix: "urlroe" }).primaryKey(),
    event_id: model.text(),
    source: model.text(),
    entity_kind: model.text(),
    entity_id: model.text(),
    market_code: model.enum(["sk", "cz", "hu", "ro"]),
    stream_sequence: model.number(),
    change_type: model.enum(["reconcile", "delete"]),
    envelope_fingerprint: model.text(),
    payload: model.json(),
    occurred_at: model.dateTime(),
    status: model
      .enum(["pending", "processing", "delivered", "failed"])
      .default("pending"),
    attempt_count: model.number().default(0),
    available_at: model.dateTime(),
    claim_token: model.text().nullable(),
    claimed_by: model.text().nullable(),
    claimed_at: model.dateTime().nullable(),
    lease_expires_at: model.dateTime().nullable(),
    last_error_code: model.text().nullable(),
    delivery_outcome: model
      .enum(["applied", "already-applied", "noop-stale"])
      .nullable(),
    delivered_at: model.dateTime().nullable(),
    failed_at: model.dateTime().nullable(),
    stream: model.belongsTo(() => UrlRegistryOutboxStream, {
      mappedBy: "events",
    }),
  })
  .indexes([
    {
      name: "IDX_url_registry_outbox_event_source_event_unique",
      on: ["source", "event_id", "market_code"],
      unique: true,
      where: "TRUE",
    },
    {
      name: "IDX_url_registry_outbox_event_stream_sequence_unique",
      on: ["stream_id", "stream_sequence"],
      unique: true,
      where: "TRUE",
    },
    {
      name: "IDX_url_registry_outbox_event_dispatch",
      on: ["available_at", "id"],
      where: "status = 'pending' AND deleted_at IS NULL",
    },
    {
      name: "IDX_url_registry_outbox_event_reclaim",
      on: ["lease_expires_at", "id"],
      where: "status = 'processing' AND deleted_at IS NULL",
    },
  ])
  .checks([
    {
      name: "url_registry_outbox_event_sequence_check",
      expression: (columns) => `${columns.stream_sequence} > 0`,
    },
    {
      name: "url_registry_outbox_event_attempt_count_check",
      expression: (columns) => `${columns.attempt_count} >= 0`,
    },
  ])

export default UrlRegistryOutboxEvent
