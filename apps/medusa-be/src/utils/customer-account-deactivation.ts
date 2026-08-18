import { generateJwtToken, MedusaError } from "@medusajs/framework/utils"
import { jwtVerify } from "jose"

export const CUSTOMER_ACCOUNT_DEACTIVATION_TOKEN_EXPIRES_IN = "30m"
export const CUSTOMER_ACCOUNT_DEACTIVATION_TOKEN_PURPOSE =
  "customer-account-deactivation"

const TRAILING_SLASH_REGEX = /\/$/

export type VerifiedCustomerAccountDeactivationToken = {
  customer_id: string
  email?: string
}

export function buildCustomerAccountDeactivationUrl(
  token: string,
  storefrontBaseUrl: string
) {
  let storefrontUrl: URL

  try {
    storefrontUrl = new URL(storefrontBaseUrl)
  } catch {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "storefront_base_url must be a valid absolute URL"
    )
  }

  if (
    storefrontUrl.protocol !== "https:" &&
    storefrontUrl.protocol !== "http:"
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "storefront_base_url must use HTTP or HTTPS"
    )
  }

  const confirmationUrl = new URL(
    "/account/deactivate/confirm",
    storefrontUrl.origin.replace(TRAILING_SLASH_REGEX, "")
  )
  confirmationUrl.searchParams.set("token", token)

  return confirmationUrl.toString()
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

  let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"]
  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(jwtSecret))
    payload = verified.payload
  } catch {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Account deactivation link is invalid or expired."
    )
  }

  if (
    payload.purpose !== CUSTOMER_ACCOUNT_DEACTIVATION_TOKEN_PURPOSE ||
    typeof payload.customer_id !== "string"
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Account deactivation link is invalid or expired."
    )
  }

  return {
    customer_id: payload.customer_id,
    email: typeof payload.email === "string" ? payload.email : undefined,
  }
}
