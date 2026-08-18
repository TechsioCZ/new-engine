import { UrlRegistryError } from "../errors"
import { postgresErrorField } from "./sql"

const UNIQUE_CONSTRAINTS = {
  url_entity_slug_market_kind_slug_unique: "SLUG_CONFLICT",
  url_entity_slug_one_current_per_route: "INVARIANT_VIOLATION",
  static_route_path_no_reuse_unique: "STATIC_PATH_CONFLICT",
  static_route_path_one_current_per_route: "INVARIANT_VIOLATION",
  url_route_source_identity_unique: "IDENTITY_CONFLICT",
  url_route_static_identity_unique: "IDENTITY_CONFLICT",
  url_route_active_equivalence_unique: "EQUIVALENCE_CONFLICT",
  url_registry_command_pkey: "IDEMPOTENCY_CONFLICT",
  url_registry_command_source_event_unique: "SOURCE_EVENT_CONFLICT",
  url_route_pkey: "INVARIANT_VIOLATION",
  url_entity_slug_pkey: "INVARIANT_VIOLATION",
  static_route_path_pkey: "INVARIANT_VIOLATION",
} as const

export const translatePostgresWriteError = (error: unknown): never => {
  if (error instanceof UrlRegistryError) {
    throw error
  }
  const code = postgresErrorField(error, "code")
  const constraint = postgresErrorField(error, "constraint")
  if (code === "23505" && constraint && constraint in UNIQUE_CONSTRAINTS) {
    const mapped =
      UNIQUE_CONSTRAINTS[constraint as keyof typeof UNIQUE_CONSTRAINTS]
    throw new UrlRegistryError(
      mapped,
      `PostgreSQL rejected URL registry uniqueness constraint ${constraint}`,
      { constraint },
      { cause: error }
    )
  }
  if (
    code === "23503" &&
    (constraint === "url_route_successor_foreign" ||
      constraint === "static_route_path_parent_foreign")
  ) {
    throw new UrlRegistryError(
      "INVALID_TRANSITION",
      `PostgreSQL rejected URL registry relationship ${constraint}`,
      { constraint },
      { cause: error }
    )
  }
  if (code === "22P02") {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "PostgreSQL rejected a malformed URL registry identifier",
      {},
      { cause: error }
    )
  }
  if (code === "23514") {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "PostgreSQL rejected a URL registry invariant",
      constraint ? { constraint } : {},
      { cause: error }
    )
  }
  throw error
}
