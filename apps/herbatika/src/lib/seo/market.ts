import { MARKETS, type Market } from "@/lib/url/types"

const isMarket = (value: string): value is Market =>
  (MARKETS as readonly string[]).includes(value)

export function resolveAllowedMarketParam(value: string): Market | null {
  if (!isMarket(value)) {
    return null
  }

  const configured = process.env.ALLOWED_MARKETS
  if (!configured?.trim()) {
    return value
  }
  const allowed = new Set(
    configured
      .split(",")
      .map((candidate) => candidate.trim().toLowerCase())
      .filter(isMarket)
  )
  return allowed.has(value) ? value : null
}
