export const RO_POST_COMMERCE_ENVELOPE_KEYS: readonly string[]
export const RO_POST_COMMERCE_ENVIRONMENT_KEYS: readonly string[]
export const stablePostCommerceJson: (value: unknown) => string
export const postCommerceSha256: (value: string | Uint8Array) => string
export const parseRoPostCommerceEnvelopeContract: (
  contents: string,
  options?: Readonly<{ maxAgeMs?: number; now?: Date }>
) => Record<string, unknown>
