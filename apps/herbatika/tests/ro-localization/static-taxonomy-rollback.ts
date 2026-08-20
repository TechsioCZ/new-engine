import { createUrlRegistryCommand } from "../../src/lib/url-registry/command-fingerprint"
import type { StaticRouteMutationResult } from "../../src/lib/url-registry/commands"
import type {
  RouteUpdateCommand,
  StaticTransitionAction,
} from "./static-taxonomy-preflight-contract"

const unauthorized = (reason: string): never => {
  throw new Error(`Rollback is not authorized: ${reason}`)
}

export const authorizeStaticTaxonomyRollback = (
  action: StaticTransitionAction,
  applyReceipt: StaticRouteMutationResult
): RouteUpdateCommand => {
  const applyCommand = createUrlRegistryCommand(action.apply)
  const { audit, outcome } = applyReceipt.commit
  const expectedVersion = action.apply.request.expectedVersion + 1
  if (outcome !== "applied") {
    return unauthorized("apply outcome was not applied")
  }
  if (
    audit.idempotencyKey !== applyCommand.idempotencyKey ||
    audit.requestFingerprint !== applyCommand.requestFingerprint ||
    audit.source.sourceEventId !== action.apply.request.source.sourceEventId
  ) {
    return unauthorized("receipt does not belong to the planned apply command")
  }
  if (
    audit.routeId !== action.routeId ||
    audit.previousVersion !== action.apply.request.expectedVersion ||
    audit.resultVersion !== expectedVersion ||
    applyReceipt.snapshot.route.id !== action.routeId ||
    applyReceipt.snapshot.route.version !== expectedVersion ||
    applyReceipt.snapshot.route.indexPolicy !== "noindex"
  ) {
    return unauthorized("receipt route state or CAS version is inconsistent")
  }
  return action.rollbackTemplate
}
