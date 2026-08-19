import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto"

export const PAYMENT_RETURN_STATE_TTL_MS = 30 * 60 * 1000
export const PAYMENT_RESULT_TOKEN_TTL_MS = 15 * 60 * 1000

export type PaymentReturnStateClaims = {
  cart_id: string
  exp: number
  nonce: string
  provider_id: string
  sales_channel_id: string
  v: 1
}

const deriveKey = (secret: string) =>
  createHash("sha256")
    .update("herbatika/payment-return-state/v1\0", "utf8")
    .update(secret, "utf8")
    .digest()

const decodeCanonical = (value: string) => {
  const decoded = Buffer.from(value, "base64url")
  return decoded.toString("base64url") === value ? decoded : undefined
}

export const hashPaymentReturnState = (state: string) =>
  createHash("sha256").update(state, "utf8").digest("hex")

export const createPaymentResultToken = (stateHash: string, secret: string) =>
  createHmac("sha256", deriveKey(secret))
    .update("herbatika/payment-result/v1\0", "utf8")
    .update(stateHash, "utf8")
    .digest("base64url")

export const createPaymentReturnState = (
  input: Omit<PaymentReturnStateClaims, "exp" | "nonce" | "v">,
  secret: string,
  now = Date.now()
) => {
  const claims: PaymentReturnStateClaims = {
    ...input,
    exp: Math.floor((now + PAYMENT_RETURN_STATE_TTL_MS) / 1000),
    nonce: randomBytes(16).toString("base64url"),
    v: 1,
  }
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(claims), "utf8"),
    cipher.final(),
  ])

  return [iv, encrypted, cipher.getAuthTag()]
    .map((part) => part.toString("base64url"))
    .join(".")
}

export const verifyPaymentReturnState = (
  state: string,
  secret: string,
  now = Date.now()
): PaymentReturnStateClaims | undefined => {
  if (
    !state ||
    state !== state.trim() ||
    state.includes("\0") ||
    state.length > 2048
  ) {
    return
  }

  const parts = state.split(".")
  if (parts.length !== 3) {
    return
  }

  const [encodedIv, encodedCiphertext, encodedTag] = parts
  if (!(encodedIv && encodedCiphertext && encodedTag)) {
    return
  }

  const iv = decodeCanonical(encodedIv)
  const ciphertext = decodeCanonical(encodedCiphertext)
  const tag = decodeCanonical(encodedTag)
  if (!(iv && ciphertext && tag) || iv.length !== 12 || tag.length !== 16) {
    return
  }

  let decoded: unknown
  try {
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), iv)
    decipher.setAuthTag(tag)
    decoded = JSON.parse(
      Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
        "utf8"
      )
    )
  } catch {
    return
  }

  if (!(decoded && typeof decoded === "object")) {
    return
  }

  const value = decoded as Record<string, unknown>
  if (
    value.v !== 1 ||
    typeof value.cart_id !== "string" ||
    !value.cart_id ||
    typeof value.provider_id !== "string" ||
    !value.provider_id ||
    typeof value.sales_channel_id !== "string" ||
    !value.sales_channel_id ||
    typeof value.nonce !== "string" ||
    !value.nonce ||
    typeof value.exp !== "number" ||
    !Number.isInteger(value.exp) ||
    value.exp <= Math.floor(now / 1000)
  ) {
    return
  }

  return value as PaymentReturnStateClaims
}
