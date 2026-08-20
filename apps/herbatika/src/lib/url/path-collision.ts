import {
  addEquivalenceDiagnostics,
  addPathDiagnostics,
  addRouteAndSourceDiagnostics,
} from "./path-collision-claim-groups"
import type {
  InvalidHostAssignmentReason as InvalidHostAssignmentReasonContract,
  InvalidPublicPathReason as InvalidPublicPathReasonContract,
  PublicHostAssignment as PublicHostAssignmentContract,
  PublicPathClaim as PublicPathClaimContract,
  PublicPathClaimKind as PublicPathClaimKindContract,
  PublicPathClaimOwner as PublicPathClaimOwnerContract,
  PublicPathCollisionDiagnostic as PublicPathCollisionDiagnosticContract,
  PublicPathCollisionInput as PublicPathCollisionInputContract,
  PublicPathCollisionResult as PublicPathCollisionResultContract,
} from "./path-collision-contracts"
import { addHostDiagnostics } from "./path-collision-hosts"

export type InvalidHostAssignmentReason = InvalidHostAssignmentReasonContract
export type InvalidPublicPathReason = InvalidPublicPathReasonContract
export type PublicHostAssignment = PublicHostAssignmentContract
export type PublicPathClaim = PublicPathClaimContract
export type PublicPathClaimKind = PublicPathClaimKindContract
export type PublicPathClaimOwner = PublicPathClaimOwnerContract
export type PublicPathCollisionDiagnostic =
  PublicPathCollisionDiagnosticContract
export type PublicPathCollisionInput = PublicPathCollisionInputContract
export type PublicPathCollisionResult = PublicPathCollisionResultContract

export class PublicPathCollisionError extends Error {
  override readonly name = "PublicPathCollisionError"
  readonly diagnostics: readonly PublicPathCollisionDiagnostic[]

  constructor(diagnostics: readonly PublicPathCollisionDiagnostic[]) {
    super(
      `Public URL collision validation failed with ${diagnostics.length} diagnostic(s)`
    )
    this.diagnostics = diagnostics
  }
}

/**
 * Validate a build/publish snapshot of explicit, complete public path claims.
 * Prefix templates and runtime precedence are deliberately outside this API.
 */
export function validatePublicPathCollisionSet(
  input: PublicPathCollisionInput
): PublicPathCollisionResult {
  const diagnostics: PublicPathCollisionDiagnostic[] = []

  addPathDiagnostics(input.pathClaims, diagnostics)
  addRouteAndSourceDiagnostics(input.pathClaims, diagnostics)
  addEquivalenceDiagnostics(input.pathClaims, diagnostics)
  addHostDiagnostics(input.hostAssignments ?? [], diagnostics)

  return diagnostics.length === 0 ? { ok: true } : { diagnostics, ok: false }
}

/** Hard build/publish gate. This function never repairs, suffixes, or rewrites. */
export function assertPublicPathCollisionFree(
  input: PublicPathCollisionInput
): void {
  const result = validatePublicPathCollisionSet(input)
  if (!result.ok) {
    throw new PublicPathCollisionError(result.diagnostics)
  }
}
