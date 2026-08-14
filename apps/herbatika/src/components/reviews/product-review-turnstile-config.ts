type ProductReviewTurnstileEnv = {
  enabled?: string
  siteKey?: string
}

const ENABLED_VALUES = new Set(["1", "true"])
const DISABLED_VALUES = new Set(["0", "false"])

export const resolveProductReviewTurnstileConfig = ({
  enabled,
  siteKey,
}: ProductReviewTurnstileEnv) => {
  const normalizedEnabled = enabled?.trim().toLowerCase()
  const normalizedSiteKey = siteKey?.trim() ?? ""

  if (normalizedEnabled && ENABLED_VALUES.has(normalizedEnabled)) {
    return {
      enabled: true,
      siteKey: normalizedSiteKey,
    }
  }

  if (normalizedEnabled && DISABLED_VALUES.has(normalizedEnabled)) {
    return {
      enabled: false,
      siteKey: normalizedSiteKey,
    }
  }

  return {
    enabled: Boolean(normalizedSiteKey),
    siteKey: normalizedSiteKey,
  }
}

export const productReviewTurnstileConfig = resolveProductReviewTurnstileConfig(
  {
    enabled: process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_ENABLED,
    siteKey: process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY,
  }
)
