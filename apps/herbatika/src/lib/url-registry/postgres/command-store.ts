import {
  fingerprintUrlRegistryRequest,
  type UrlRegistryCommand,
} from "../contracts"
import { UrlRegistryError } from "../errors"
import {
  type CommandClaim,
  isExactRequest,
  parseLedgerRow,
  replayLedgerRow,
} from "./command-ledger-codec"
import type { SqlExecutor } from "./sql"

export const claimCommand = async (
  executor: SqlExecutor,
  command: UrlRegistryCommand
): Promise<CommandClaim> => {
  const { request } = command
  if (
    command.commandVersion !== 1 ||
    command.request.commandType.length === 0
  ) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "Only URLR command v1 is supported"
    )
  }
  const calculatedFingerprint = fingerprintUrlRegistryRequest(1, request)
  const inserted = await executor.query(
    `INSERT INTO url_registry.url_registry_command (
       idempotency_key, producer, command_version, command_type,
       request_fingerprint, source_system, source_type, source_id,
       source_version, source_event_id, expected_route_version
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT DO NOTHING
     RETURNING idempotency_key`,
    [
      command.idempotencyKey,
      request.source.producer,
      command.commandVersion,
      request.commandType,
      command.requestFingerprint,
      request.source.sourceSystem,
      request.source.sourceType,
      request.source.sourceId,
      request.source.sourceVersion,
      request.source.sourceEventId,
      request.expectedVersion,
    ]
  )

  if (inserted.rows.length === 1) {
    if (calculatedFingerprint !== command.requestFingerprint) {
      throw new UrlRegistryError(
        "INVALID_REQUEST_FINGERPRINT",
        "requestFingerprint does not match the canonical command request"
      )
    }
    return { kind: "claimed" }
  }

  const existing = await executor.query(
    `SELECT idempotency_key, producer, command_version, command_type,
            request_fingerprint, source_system, source_type, source_id,
            source_version, source_event_id, expected_route_version, status,
            outcome, route_id, result_route_version, response_snapshot
       FROM url_registry.url_registry_command
      WHERE idempotency_key = $1
         OR (source_system = $2 AND source_event_id = $3)
      ORDER BY CASE WHEN idempotency_key = $1 THEN 0 ELSE 1 END,
               idempotency_key
      FOR SHARE`,
    [
      command.idempotencyKey,
      request.source.sourceSystem,
      request.source.sourceEventId,
    ]
  )
  const rows = existing.rows.map(parseLedgerRow)
  const byKey = rows.find(
    (row) => row.idempotencyKey === command.idempotencyKey
  )
  if (byKey) {
    if (isExactRequest(byKey, command, calculatedFingerprint)) {
      return replayLedgerRow(byKey, command)
    }
    throw new UrlRegistryError(
      "IDEMPOTENCY_CONFLICT",
      `Idempotency key ${command.idempotencyKey} is bound to another request`
    )
  }

  const bySourceEvent = rows.find(
    (row) =>
      row.sourceSystem === request.source.sourceSystem &&
      row.sourceEventId === request.source.sourceEventId
  )
  if (bySourceEvent) {
    if (isExactRequest(bySourceEvent, command, calculatedFingerprint)) {
      return replayLedgerRow(bySourceEvent, command)
    }
    throw new UrlRegistryError(
      "SOURCE_EVENT_CONFLICT",
      "A source event cannot represent more than one URLR command"
    )
  }

  throw new UrlRegistryError(
    "INVARIANT_VIOLATION",
    "A command claim conflicted without a visible idempotency or source-event row"
  )
}
