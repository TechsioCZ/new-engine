import { createHash } from "node:crypto"
import type { Logger } from "@medusajs/framework/types"

export function hashValueForLogs(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  if (!normalized) {
    return null
  }

  return createHash("sha256").update(normalized).digest("hex").slice(0, 12)
}

function logCompanyCheckDebug(
  logger: Logger,
  scope: string,
  event: string,
  details: Record<string, unknown>
): void {
  logger.info(`Company check ${scope}: ${event} ${JSON.stringify(details)}`)
}

export function logCompanyInfoDebug(
  logger: Logger,
  event: string,
  details: Record<string, unknown> = {}
): void {
  logCompanyCheckDebug(logger, "info", event, details)
}

export function logAddressCountDebug(
  logger: Logger,
  event: string,
  details: Record<string, unknown> = {}
): void {
  logCompanyCheckDebug(logger, "address-count", event, details)
}
