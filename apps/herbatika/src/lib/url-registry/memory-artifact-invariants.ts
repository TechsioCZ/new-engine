import { UrlRegistryError } from "./errors"
import { type MemoryRegistryState, sourceEventKey } from "./memory-state"

const fail = (message: string): never => {
  throw new UrlRegistryError("INVARIANT_VIOLATION", message)
}

const auditIds = (state: MemoryRegistryState) => {
  const ids = new Set<string>()
  for (const audit of state.audits) {
    if (ids.has(audit.id) || !state.commands.has(audit.idempotencyKey)) {
      fail("Duplicate or orphaned audit record")
    }
    ids.add(audit.id)
  }
}

const outboxIds = (state: MemoryRegistryState) => {
  const ids = new Set<string>()
  for (const outbox of state.invalidations) {
    const audit = state.audits.find((item) => item.id === outbox.auditId)
    if (
      ids.has(outbox.id) ||
      !audit ||
      audit.idempotencyKey !== outbox.idempotencyKey
    ) {
      fail("Invalid invalidation outbox identity or audit reference")
    }
    ids.add(outbox.id)
  }
}

const commandArtifacts = (state: MemoryRegistryState) => {
  for (const [key, command] of state.commands) {
    const audits = state.audits.filter((audit) => audit.idempotencyKey === key)
    const outboxes = state.invalidations.filter(
      (outbox) => outbox.idempotencyKey === key
    )
    const expectedOutboxes = command.result.commit.outcome === "applied" ? 1 : 0
    if (
      audits.length !== 1 ||
      outboxes.length !== expectedOutboxes ||
      command.result.commit.audit.id !== audits[0]?.id ||
      command.result.commit.invalidation?.id !== outboxes[0]?.id
    ) {
      fail(`Command ${key} has invalid audit/outbox cardinality`)
    }
    const sourceKey = sourceEventKey(
      audits[0].source.sourceSystem,
      audits[0].source.sourceEventId
    )
    if (state.sourceEvents.get(sourceKey) !== key) {
      fail(`Command ${key} has no matching source event reservation`)
    }
  }
}

const sourceEvents = (state: MemoryRegistryState) => {
  for (const [eventKey, commandKey] of state.sourceEvents) {
    if (!state.commands.has(commandKey)) {
      fail(`Source event ${eventKey} references an unknown command`)
    }
  }
}

export const assertCommandArtifacts = (state: MemoryRegistryState) => {
  auditIds(state)
  outboxIds(state)
  commandArtifacts(state)
  sourceEvents(state)
}
