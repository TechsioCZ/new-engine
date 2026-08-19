import type {
  UrlRegistryAuditRecord,
  UrlRegistryInvalidationOutboxRecord,
} from "./commands"
import { pageRecords } from "./memory-pagination"
import type { MemoryRegistryState } from "./memory-state"
import type {
  SourceReadResult,
  UrlRegistryPage,
  UrlRegistryPageRequest,
} from "./reads"

export const listAuditRecords = (
  state: MemoryRegistryState,
  input: UrlRegistryPageRequest
): SourceReadResult<UrlRegistryPage<UrlRegistryAuditRecord>> => ({
  kind: "found",
  value: pageRecords(state.audits, input, "audit"),
})

export const listPendingInvalidations = (
  state: MemoryRegistryState,
  input: UrlRegistryPageRequest
): SourceReadResult<UrlRegistryPage<UrlRegistryInvalidationOutboxRecord>> => ({
  kind: "found",
  value: pageRecords(
    state.invalidations,
    input,
    "pending-outbox",
    (record) => record.status === "pending"
  ),
})
