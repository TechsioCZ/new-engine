import { getRecordValue, isRecord } from "@techsio/std/object"

import type { ApiStoreCredentials } from "../api-store/types"

type OptionalTokenDate = Date | string | null

export interface ZboziApiStoreTokenSource {
  access_token_expires_at?: OptionalTokenDate
  api_key?: string | null
  credentials?: ApiStoreCredentials | null
  name?: string
}

export const normalizeSecret = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null

export const getCredentialValue = (
  credentials: ApiStoreCredentials | null | undefined,
  key: string,
): string | null =>
  normalizeSecret(
    isRecord(credentials) ? getRecordValue(credentials, key) : undefined,
  )

export const toValidDate = (value?: OptionalTokenDate): Date | null => {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
