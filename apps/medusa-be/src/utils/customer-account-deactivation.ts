import { generateJwtToken, MedusaError } from "@medusajs/framework/utils"
import { jwtVerify } from "jose"
import { buildStorefrontPublicFlowUrl } from "./storefront-public-flow-url"

export const CUSTOMER_ACCOUNT_DEACTIVATION_TOKEN_EXPIRES_IN = "30m"
export const CUSTOMER_ACCOUNT_DEACTIVATION_TOKEN_PURPOSE =
  "customer-account-deactivation"

export type VerifiedCustomerAccountDeactivationToken = {
  customer_id: string
  email?: string
  sales_channel_id: string
}

export function buildCustomerAccountDeactivationUrl(
  token: string,
  storefrontBaseUrl: string,
  marketCode: unknown
) {
  const confirmationUrl = buildStorefrontPublicFlowUrl({
    marketCode,
    storefrontBaseUrl,
    target: { kind: "account", section: "deactivation" },
  })
  confirmationUrl.searchParams.set("token", token)

  return confirmationUrl.toString()
}

export function createCustomerAccountDeactivationToken(input: {
  customer_id: string
  email?: string
  sales_channel_id: string
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
      sales_channel_id: input.sales_channel_id,
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
    typeof payload.customer_id !== "string" ||
    typeof payload.sales_channel_id !== "string" ||
    !payload.sales_channel_id
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Account deactivation link is invalid or expired."
    )
  }

  return {
    customer_id: payload.customer_id,
    email: typeof payload.email === "string" ? payload.email : undefined,
    sales_channel_id: payload.sales_channel_id,
  }
}
