import { createHash } from "node:crypto"
import type { RoCatalogImportPlan } from "./types"

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`
  }
  const record = asRecord(value)
  if (record) {
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value) ?? "null"
}

export const hashRoCatalogImportScope = (scope: RoCatalogImportPlan["scope"]) =>
  createHash("sha256").update(stableJson(scope)).digest("hex")
