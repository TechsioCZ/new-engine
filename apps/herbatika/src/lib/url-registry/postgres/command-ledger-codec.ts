import type { UrlRegistryCommand } from "../contracts"
import { UrlRegistryError } from "../errors"
import {
  parseStoredCommandResult,
  replayStoredResult,
  type StoredCommandResult,
} from "./result-codec"
import {
  asInteger,
  asNullableInteger,
  asNullableString,
  asRecord,
  asString,
  oneOf,
} from "./runtime"

export type CommandClaim =
  | Readonly<{ kind: "claimed" }>
  | Readonly<{ kind: "replay"; result: StoredCommandResult }>

export type LedgerRow = Readonly<{
  idempotencyKey: string
  producer: string
  commandVersion: number
  commandType: string
  requestFingerprint: string
  sourceSystem: string
  sourceType: string
  sourceId: string
  sourceVersion: string
  sourceEventId: string
  expectedRouteVersion: number
  status: "in_progress" | "completed"
  outcome: "applied" | "noop" | null
  routeId: string | null
  resultRouteVersion: number | null
  responseSnapshot: unknown
}>

export const parseLedgerRow = (value: unknown): LedgerRow => {
  const row = asRecord(value, "URL registry command ledger row")
  return {
    idempotencyKey: asString(row.idempotency_key, "command.idempotency_key"),
    producer: asString(row.producer, "command.producer"),
    commandVersion: asInteger(row.command_version, "command.command_version"),
    commandType: asString(row.command_type, "command.command_type"),
    requestFingerprint: asString(
      row.request_fingerprint,
      "command.request_fingerprint"
    ),
    sourceSystem: asString(row.source_system, "command.source_system"),
    sourceType: asString(row.source_type, "command.source_type"),
    sourceId: asString(row.source_id, "command.source_id"),
    sourceVersion: asString(row.source_version, "command.source_version"),
    sourceEventId: asString(row.source_event_id, "command.source_event_id"),
    expectedRouteVersion: asInteger(
      row.expected_route_version,
      "command.expected_route_version"
    ),
    status: oneOf(
      row.status,
      ["in_progress", "completed"] as const,
      "command.status"
    ),
    outcome:
      row.outcome === null
        ? null
        : oneOf(row.outcome, ["applied", "noop"] as const, "command.outcome"),
    routeId: asNullableString(row.route_id, "command.route_id"),
    resultRouteVersion: asNullableInteger(
      row.result_route_version,
      "command.result_route_version"
    ),
    responseSnapshot: row.response_snapshot,
  }
}

export const isExactRequest = (
  row: LedgerRow,
  command: UrlRegistryCommand,
  calculatedFingerprint: string
) => {
  const { request } = command
  return (
    row.status === "completed" &&
    row.commandVersion === command.commandVersion &&
    row.commandType === request.commandType &&
    row.requestFingerprint === command.requestFingerprint &&
    calculatedFingerprint === command.requestFingerprint &&
    row.producer === request.source.producer &&
    row.sourceSystem === request.source.sourceSystem &&
    row.sourceType === request.source.sourceType &&
    row.sourceId === request.source.sourceId &&
    row.sourceVersion === request.source.sourceVersion &&
    row.sourceEventId === request.source.sourceEventId &&
    row.expectedRouteVersion === request.expectedVersion
  )
}

const assertReplayMetadata = (result: StoredCommandResult, row: LedgerRow) => {
  const { audit, invalidation } = result.commit
  const sourceMatches =
    audit.source.producer === row.producer &&
    audit.source.sourceSystem === row.sourceSystem &&
    audit.source.sourceType === row.sourceType &&
    audit.source.sourceId === row.sourceId &&
    audit.source.sourceVersion === row.sourceVersion &&
    audit.source.sourceEventId === row.sourceEventId
  if (
    row.outcome === null ||
    audit.idempotencyKey !== row.idempotencyKey ||
    audit.commandVersion !== row.commandVersion ||
    audit.action !== row.commandType ||
    audit.requestFingerprint !== row.requestFingerprint ||
    audit.outcome !== row.outcome ||
    result.commit.outcome !== row.outcome ||
    audit.routeId !== row.routeId ||
    audit.resultVersion !== row.resultRouteVersion ||
    !sourceMatches ||
    (row.outcome === "applied" && invalidation === null) ||
    (row.outcome === "noop" && invalidation !== null) ||
    (invalidation !== null &&
      (invalidation.idempotencyKey !== row.idempotencyKey ||
        invalidation.auditId !== audit.id))
  ) {
    throw new TypeError("Stored command response does not match its ledger row")
  }
  if ("snapshot" in result) {
    if (
      result.snapshot.route.id !== row.routeId ||
      result.snapshot.route.version !== row.resultRouteVersion
    ) {
      throw new TypeError("Stored route response does not match ledger result")
    }
  } else if (row.routeId !== null || row.resultRouteVersion !== null) {
    throw new TypeError("Stored gone response unexpectedly references a route")
  }
}

export const replayLedgerRow = (
  row: LedgerRow,
  command: UrlRegistryCommand
): CommandClaim => {
  if (row.responseSnapshot === null || row.responseSnapshot === undefined) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "A completed URL registry command has no response snapshot"
    )
  }
  try {
    const parsed = parseStoredCommandResult(
      row.responseSnapshot,
      command.request.commandType
    )
    assertReplayMetadata(parsed, row)
    return { kind: "replay", result: replayStoredResult(parsed) }
  } catch (error) {
    if (error instanceof UrlRegistryError) {
      throw error
    }
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "A completed URL registry command contains an invalid response snapshot",
      {},
      { cause: error }
    )
  }
}
