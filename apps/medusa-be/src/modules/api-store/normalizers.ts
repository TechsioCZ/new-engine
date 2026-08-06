import { isRecord } from "@techsio/std/object"

import type { ApiStoreCredentials } from "./types"

export const SENSITIVE_FIELDS = ["api_key", "credentials"] as const

export const normalizeName = (name: string): string => name.trim()

export const normalizeAccessTokenExpiresAt = (
  value?: Date | string | null,
): Date | null | undefined => {
  if (value === undefined) {
    return undefined
  }

  if (value === null || value instanceof Date) {
    return value
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const normalizeApiUrl = (
  apiUrl?: string | null,
): string | null | undefined => {
  if (apiUrl === undefined) {
    return undefined
  }

  const trimmed = apiUrl?.trim()
  return trimmed === undefined || trimmed === "" ? null : trimmed
}

export const serializeCredentials = (
  credentials: ApiStoreCredentials | null | undefined,
): string | null | undefined => {
  if (credentials === undefined) {
    return undefined
  }

  return credentials === null ? null : JSON.stringify(credentials)
}

export const parseCredentials = (
  credentials: string | null,
): ApiStoreCredentials | null => {
  if (credentials === null || credentials === "") {
    return null
  }

  const parsed: unknown = JSON.parse(credentials)
  return isRecord(parsed) ? parsed : null
}
