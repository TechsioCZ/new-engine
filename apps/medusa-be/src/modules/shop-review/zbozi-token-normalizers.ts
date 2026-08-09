export type ZboziApiStoreTokenSource = {
  access_token_expires_at?: Date | string | null
  api_key?: string | null
  credentials?: Record<string, unknown> | null
  name?: string
}

export const normalizeSecret = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null

export const getCredentialValue = (
  credentials: Record<string, unknown> | null | undefined,
  key: string
): string | null => normalizeSecret(credentials?.[key])

export const toValidDate = (
  value: Date | string | null | undefined
): Date | null => {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
