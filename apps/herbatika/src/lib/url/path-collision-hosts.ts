import { decodeAtMostTwice } from "./path-collision-analysis"
import type {
  PublicHostAssignment,
  PublicPathCollisionDiagnostic,
} from "./path-collision-contracts"
import type { Market } from "./types"

const CANONICAL_HOST_PATTERN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/
const TRAILING_DOT_PATTERN = /\.$/u

const normalizeHost = (
  assignment: PublicHostAssignment
): Readonly<{
  diagnostic?: PublicPathCollisionDiagnostic
  normalizedHost?: string
}> => {
  const trimmed = assignment.host.trim()
  const decoded = decodeAtMostTwice(trimmed)
  if (!decoded.ok) {
    return {
      diagnostic: {
        assignmentId: assignment.assignmentId,
        code: "invalid-host-assignment",
        host: assignment.host,
        market: assignment.market,
        reason: "malformed-percent-encoding",
      },
    }
  }

  const normalizedHost = decoded.value
    .toLowerCase()
    .replace(TRAILING_DOT_PATTERN, "")
  if (!CANONICAL_HOST_PATTERN.test(normalizedHost)) {
    return {
      diagnostic: {
        assignmentId: assignment.assignmentId,
        code: "invalid-host-assignment",
        host: assignment.host,
        market: assignment.market,
        reason: "invalid-hostname",
      },
      normalizedHost,
    }
  }

  if (assignment.host !== normalizedHost) {
    return {
      diagnostic: {
        assignmentId: assignment.assignmentId,
        code: "invalid-host-assignment",
        host: assignment.host,
        market: assignment.market,
        reason: "noncanonical-hostname",
      },
      normalizedHost,
    }
  }

  return { normalizedHost }
}

export function addHostDiagnostics(
  assignments: readonly PublicHostAssignment[],
  diagnostics: PublicPathCollisionDiagnostic[]
): void {
  const hostGroups = new Map<
    string,
    { assignmentIds: string[]; markets: Market[] }
  >()

  for (const assignment of assignments) {
    const normalized = normalizeHost(assignment)
    if (normalized.diagnostic) {
      diagnostics.push(normalized.diagnostic)
    }
    if (!normalized.normalizedHost) {
      continue
    }

    const group = hostGroups.get(normalized.normalizedHost)
    if (group) {
      group.assignmentIds.push(assignment.assignmentId)
      group.markets.push(assignment.market)
    } else {
      hostGroups.set(normalized.normalizedHost, {
        assignmentIds: [assignment.assignmentId],
        markets: [assignment.market],
      })
    }
  }

  for (const [normalizedHost, group] of hostGroups) {
    if (new Set(group.markets).size > 1) {
      diagnostics.push({
        assignmentIds: group.assignmentIds,
        code: "conflicting-host-assignment",
        markets: group.markets,
        normalizedHost,
      })
    }
  }
}
