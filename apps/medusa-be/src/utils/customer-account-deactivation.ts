import { generateJwtToken, MedusaError } from "@medusajs/framework/utils"
import { type JWTPayload, jwtVerify } from "jose"

export const CUSTOMER_ACCOUNT_DEACTIVATION_TOKEN_EXPIRES_IN = "30m"
export const CUSTOMER_ACCOUNT_DEACTIVATION_TOKEN_PURPOSE =
  "customer-account-deactivation"

const TRAILING_SLASH_REGEX = /\/$/

type CustomerAccountDeactivationTokenPayload = JWTPayload & {
  customer_id?: unknown
  email?: unknown
  purpose?: unknown
}

export type VerifiedCustomerAccountDeactivationToken = {
  customer_id: string
  email?: string
}

export function buildCustomerAccountDeactivationUrl(token: string) {
  const storefrontUrl = process.env.STOREFRONT_URL

  if (!storefrontUrl) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "STOREFRONT_URL env var is not set — cannot build account deactivation link"
    )
  }

  const baseUrl = storefrontUrl.replace(TRAILING_SLASH_REGEX, "")
  return `${baseUrl}/account/deactivate/confirm?token=${encodeURIComponent(token)}`
}

export function createCustomerAccountDeactivationToken(input: {
  customer_id: string
  email?: string
}) {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "JWT_SECRET env var is not set — cannot generate account deactivation token"
    )
  }

  return generateJwtToken(
    {
      customer_id: input.customer_id,
      email: input.email,
      purpose: CUSTOMER_ACCOUNT_DEACTIVATION_TOKEN_PURPOSE,
    },
    {
      expiresIn: CUSTOMER_ACCOUNT_DEACTIVATION_TOKEN_EXPIRES_IN,
      secret: jwtSecret,
    }
  )
}

export async function verifyCustomerAccountDeactivationToken(
  token: string
): Promise<VerifiedCustomerAccountDeactivationToken> {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "JWT_SECRET env var is not set — cannot verify account deactivation token"
    )
  }

  let payload: JWTPayload
  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(jwtSecret))
    payload = verified.payload
  } catch {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Account deactivation link is invalid or expired."
    )
  }

  const deactivationPayload = payload as CustomerAccountDeactivationTokenPayload

  if (
    deactivationPayload.purpose !==
      CUSTOMER_ACCOUNT_DEACTIVATION_TOKEN_PURPOSE ||
    typeof deactivationPayload.customer_id !== "string"
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Account deactivation link is invalid or expired."
    )
  }

  return {
    customer_id: deactivationPayload.customer_id,
    email:
      typeof deactivationPayload.email === "string"
        ? deactivationPayload.email
        : undefined,
  }
}
