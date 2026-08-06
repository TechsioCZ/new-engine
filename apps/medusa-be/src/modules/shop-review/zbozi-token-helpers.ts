import { toValidDate } from "./zbozi-token-normalizers"

export const ZBOZI_ACCESS_TOKEN_REFRESH_WINDOW_MS = 2 * 60 * 1000
export const ZBOZI_ACCESS_TOKEN_RETRY_DELAY_MS = 5 * 60 * 1000

export const shouldRefreshZboziAccessToken = ({
  expiresAt,
  now = new Date(),
  refreshWindowMs = ZBOZI_ACCESS_TOKEN_REFRESH_WINDOW_MS,
}: {
  expiresAt?: Date | string | null
  now?: Date
  refreshWindowMs?: number
}): boolean => {
  const expiry = toValidDate(expiresAt)

  if (!expiry) {
    return true
  }

  return expiry.getTime() <= now.getTime() + refreshWindowMs
}

export const calculateNextRefreshDelayMs = ({
  expiresAt,
  now = new Date(),
  refreshWindowMs = ZBOZI_ACCESS_TOKEN_REFRESH_WINDOW_MS,
  warn,
}: {
  expiresAt: Date | string
  now?: Date
  refreshWindowMs?: number
  warn?: (message: string) => void
}): number => {
  const expiry = toValidDate(expiresAt)
  if (!expiry) {
    warn?.(
      "Zboží access token expiry is invalid; scheduling immediate refresh.",
    )
    return 0
  }

  const delay = expiry.getTime() - refreshWindowMs - now.getTime()
  if (delay <= 0) {
    warn?.(
      "Zboží access token refresh time is already due or in the past; scheduling immediate refresh.",
    )
    return 0
  }

  return delay
}
