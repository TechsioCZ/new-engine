import type { Pool, PoolClient } from "pg"
import type { PostgresTestContext } from "./postgres-test-harness"

export const SOURCE_EVENT_FINGERPRINT = `sha256:${"a".repeat(64)}`
export const INSERT_SOURCE_EVENT_RECEIPT_SQL = `
  INSERT INTO url_registry.url_registry_source_event_receipt (
    source_system, source_type, source_id, market, stream_sequence,
    source_event_id, envelope_fingerprint, change_type, action,
    command_idempotency_key
  ) VALUES ($1, 'product', $2, 'sk', $3, $4, $5, $6, $7, $8)
`
const INSERT_SOURCE_EVENT_RECEIPT_FOR_TYPE_SQL = `
  INSERT INTO url_registry.url_registry_source_event_receipt (
    source_system, source_type, source_id, market, stream_sequence,
    source_event_id, envelope_fingerprint, change_type, action,
    command_idempotency_key
  ) VALUES ($1, $2, $3, 'sk', $4, $5, $6, $7, $8, $9)
`

type ReceiptInput = Readonly<{
  action: string
  changeType: string
  commandKey?: string | null
  eventId: string
  sequence: number
  sourceId: string
  sourceSystem?: string
  sourceType?: string
}>

export const inTransaction = async <Value>(
  pool: Pool,
  run: (client: PoolClient) => Promise<Value>
): Promise<Value> => {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const value = await run(client)
    await client.query("COMMIT")
    return value
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {
      // Cleanup must not mask the transaction failure under test.
    })
    throw error
  } finally {
    client.release()
  }
}

export const insertSourceEventReceipt = (
  client: PoolClient,
  input: ReceiptInput
) =>
  client.query(INSERT_SOURCE_EVENT_RECEIPT_FOR_TYPE_SQL, [
    input.sourceSystem ?? "medusa",
    input.sourceType ?? "product",
    input.sourceId,
    input.sequence,
    input.eventId,
    SOURCE_EVENT_FINGERPRINT,
    input.changeType,
    input.action,
    input.commandKey ?? null,
  ])

export const advanceSourceEventCursor = (
  client: PoolClient,
  sourceId: string,
  sequence: number,
  sourceType = "product"
) =>
  sequence === 1
    ? client.query(
        `INSERT INTO url_registry.url_registry_source_event_cursor (
          source_system, source_type, source_id, market, last_sequence
        ) VALUES ('medusa', $1, $2, 'sk', 1)`,
        [sourceType, sourceId]
      )
    : client.query(
        `UPDATE url_registry.url_registry_source_event_cursor
         SET last_sequence = $2
         WHERE source_system = 'medusa'
           AND source_type = $3
           AND source_id = $1
           AND market = 'sk'`,
        [sourceId, sequence, sourceType]
      )

export const appendSourceEvent = (
  context: PostgresTestContext,
  input: ReceiptInput
) =>
  inTransaction(context.runtime, async (client) => {
    await insertSourceEventReceipt(client, input)
    await advanceSourceEventCursor(
      client,
      input.sourceId,
      input.sequence,
      input.sourceType
    )
  })
