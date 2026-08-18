import { randomUUID } from "node:crypto"
import { fingerprintUrlRegistryRequest } from "./command-fingerprint"
import type {
  UrlRegistryAuditRecord,
  UrlRegistryCommand,
  UrlRegistryCommandCommit,
  UrlRegistryCommandRequest,
  UrlRegistryInvalidationOutboxRecord,
} from "./commands"
import { UrlRegistryError } from "./errors"
import { assertBoundedUrlRegistryInvalidationTags } from "./invalidation-tags"
import { assertMemoryInvariants } from "./memory-invariants"
import {
  cloneMemoryState,
  cloneValue,
  emptyMemoryState,
  type MemoryRegistryState,
  type StoredCommandResult,
  sourceEventKey,
} from "./memory-state"
import {
  type InMemoryUrlRegistryOptions,
  type MemoryIdKind,
  sortedUnique,
} from "./memory-support"
import {
  assertNonEmpty,
  assertSafeVersion,
  assertSource,
} from "./memory-validation"

export type CommitInput = Readonly<{
  outcome: "applied" | "noop"
  routeId: string | null
  affectedRouteIds: readonly string[]
  previousVersion: number | null
  resultVersion: number | null
  details: Readonly<Record<string, unknown>>
  tags: readonly string[] | null
  createdAt: string
}>

export class MemoryCommandExecutor {
  private state = emptyMemoryState()
  private readonly now: () => Date
  private readonly createId: (kind: MemoryIdKind) => string

  constructor(options: InMemoryUrlRegistryOptions = {}) {
    this.now = options.now ?? (() => new Date())
    this.createId = options.createId ?? (() => randomUUID())
  }

  readState(): MemoryRegistryState {
    return this.state
  }

  transactionState(): MemoryRegistryState {
    return cloneMemoryState(this.state)
  }

  prepare(
    command: UrlRegistryCommand,
    expectedType: UrlRegistryCommandRequest["commandType"]
  ): StoredCommandResult | null {
    if (
      command.commandVersion !== 1 ||
      command.request.commandType !== expectedType
    ) {
      throw new UrlRegistryError(
        "INVALID_COMMAND",
        `Expected a version 1 ${expectedType} command`
      )
    }
    assertNonEmpty(command.idempotencyKey, "idempotencyKey")
    assertSource(command.request.source)
    assertSafeVersion(command.request.expectedVersion, "expectedVersion", 0)
    const calculated = fingerprintUrlRegistryRequest(1, command.request)
    const byKey = this.state.commands.get(command.idempotencyKey)
    if (byKey) {
      if (
        byKey.commandType === expectedType &&
        byKey.requestFingerprint === command.requestFingerprint &&
        calculated === command.requestFingerprint
      ) {
        return this.replay(byKey.result)
      }
      throw new UrlRegistryError(
        "IDEMPOTENCY_CONFLICT",
        `Idempotency key ${command.idempotencyKey} is bound to another request`
      )
    }
    const eventKey = sourceEventKey(
      command.request.source.sourceSystem,
      command.request.source.sourceEventId
    )
    const eventCommandKey = this.state.sourceEvents.get(eventKey)
    if (eventCommandKey) {
      const existing = this.state.commands.get(eventCommandKey)
      if (
        existing?.commandType === expectedType &&
        existing.requestFingerprint === command.requestFingerprint &&
        calculated === command.requestFingerprint
      ) {
        return this.replay(existing.result)
      }
      throw new UrlRegistryError(
        "SOURCE_EVENT_CONFLICT",
        "A source event cannot represent more than one URLR command"
      )
    }
    if (calculated !== command.requestFingerprint) {
      throw new UrlRegistryError(
        "INVALID_REQUEST_FINGERPRINT",
        "requestFingerprint does not match the canonical command request"
      )
    }
    return null
  }

  commit(
    next: MemoryRegistryState,
    command: UrlRegistryCommand,
    input: CommitInput
  ): UrlRegistryCommandCommit {
    const affectedRouteIds = sortedUnique(input.affectedRouteIds)
    const audit: UrlRegistryAuditRecord = {
      id: this.newId(next, "audit"),
      commandVersion: 1,
      idempotencyKey: command.idempotencyKey,
      requestFingerprint: command.requestFingerprint,
      action: command.request.commandType,
      outcome: input.outcome,
      routeId: input.routeId,
      affectedRouteIds,
      source: cloneValue(command.request.source),
      previousVersion: input.previousVersion,
      resultVersion: input.resultVersion,
      details: cloneValue(input.details),
      createdAt: input.createdAt,
    }
    next.audits.push(audit)
    const invalidation = this.createInvalidation(next, command, input, audit)
    return { outcome: input.outcome, replayed: false, audit, invalidation }
  }

  finish<Result extends StoredCommandResult>(
    next: MemoryRegistryState,
    command: UrlRegistryCommand,
    result: Result
  ): Result {
    if (next.commands.has(command.idempotencyKey)) {
      throw new UrlRegistryError(
        "INVARIANT_VIOLATION",
        `Duplicate command key ${command.idempotencyKey}`
      )
    }
    next.commands.set(command.idempotencyKey, {
      commandType: command.request.commandType,
      requestFingerprint: command.requestFingerprint,
      result: cloneValue(result),
    })
    next.sourceEvents.set(
      sourceEventKey(
        command.request.source.sourceSystem,
        command.request.source.sourceEventId
      ),
      command.idempotencyKey
    )
    assertMemoryInvariants(next)
    this.state = next
    return cloneValue(result)
  }

  timestamp(): string {
    const value = this.now()
    if (Number.isNaN(value.getTime())) {
      throw new UrlRegistryError(
        "INVALID_COMMAND",
        "Clock returned an invalid date"
      )
    }
    return value.toISOString()
  }

  newId(state: MemoryRegistryState, kind: MemoryIdKind): string {
    const id = this.createId(kind)
    assertNonEmpty(id, `${kind} id`)
    const collision =
      (kind === "route" && state.routes.has(id)) ||
      (kind === "slug" && state.slugs.has(id)) ||
      (kind === "static-path" && state.staticPaths.has(id)) ||
      (kind === "audit" && state.audits.some((item) => item.id === id)) ||
      (kind === "outbox" && state.invalidations.some((item) => item.id === id))
    if (collision) {
      throw new UrlRegistryError(
        "INVARIANT_VIOLATION",
        `Generated ${kind} ID ${id} already exists`
      )
    }
    return id
  }

  private replay(result: StoredCommandResult): StoredCommandResult {
    const cloned = cloneValue(result)
    return { ...cloned, commit: { ...cloned.commit, replayed: true } }
  }

  private createInvalidation(
    next: MemoryRegistryState,
    command: UrlRegistryCommand,
    input: CommitInput,
    audit: UrlRegistryAuditRecord
  ): UrlRegistryInvalidationOutboxRecord | null {
    if (!input.tags) {
      return null
    }
    assertBoundedUrlRegistryInvalidationTags(input.tags)
    const invalidation: UrlRegistryInvalidationOutboxRecord = {
      id: this.newId(next, "outbox"),
      auditId: audit.id,
      idempotencyKey: command.idempotencyKey,
      status: "pending",
      tags: sortedUnique(input.tags),
      createdAt: input.createdAt,
    }
    next.invalidations.push(invalidation)
    return invalidation
  }
}
