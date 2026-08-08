import { randomUUID } from "node:crypto"

import { generateJwtToken, MedusaError } from "@medusajs/framework/utils"
import { omitKeys } from "@techsio/std/object"
import { jwtVerify } from "jose"

const CUSTOMER_ACCOUNT_DEACTIVATION_TOKEN_EXPIRES_IN = "30m"
const CUSTOMER_ACCOUNT_DEACTIVATION_TOKEN_PURPOSE =
  "customer-account-deactivation"

const TRAILING_SLASH_REGEX = /\/$/u

export const CUSTOMER_ACCOUNT_DEACTIVATION_NONCE_METADATA_KEY =
  "customer_account_deactivation_nonce"

export interface VerifiedCustomerAccountDeactivationToken {
  customer_id: string
  deactivation_nonce: string
  email?: string | undefined
}

export const buildCustomerAccountDeactivationUrl = (token: string): string => {
  const storefrontUrl = process.env["STOREFRONT_URL"]

  if (storefrontUrl === undefined || storefrontUrl === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "STOREFRONT_URL env var is not set — cannot build account deactivation link",
    )
  }

  const baseUrl = storefrontUrl.replace(TRAILING_SLASH_REGEX, "")
  return `${baseUrl}/account/deactivate/confirm?token=${encodeURIComponent(token)}`
}

export const createCustomerAccountDeactivationNonce = (): string => randomUUID()

export const withoutCustomerAccountDeactivationNonce = (
  metadata?: Record<string, unknown> | null,
): Record<string, unknown> =>
  omitKeys(metadata ?? {}, [CUSTOMER_ACCOUNT_DEACTIVATION_NONCE_METADATA_KEY])

export const createCustomerAccountDeactivationToken = (input: {
  customer_id: string
  deactivation_nonce: string
  email?: string | undefined
}): string => {
  const jwtSecret = process.env["JWT_SECRET"]

  if (jwtSecret === undefined || jwtSecret === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "JWT_SECRET env var is not set — cannot generate account deactivation token",
    )
  }

  return generateJwtToken(
    {
      customer_id: input.customer_id,
      deactivation_nonce: input.deactivation_nonce,
      email: input.email,
      purpose: CUSTOMER_ACCOUNT_DEACTIVATION_TOKEN_PURPOSE,
    },
    {
      expiresIn: CUSTOMER_ACCOUNT_DEACTIVATION_TOKEN_EXPIRES_IN,
      secret: jwtSecret,
    },
  )
}

export const verifyCustomerAccountDeactivationToken = async (
  token: string,
): Promise<VerifiedCustomerAccountDeactivationToken> => {
  const jwtSecret = process.env["JWT_SECRET"]

  if (jwtSecret === undefined || jwtSecret === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "JWT_SECRET env var is not set — cannot verify account deactivation token",
    )
  }

  let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"]
  try {
    const { payload: verifiedPayload } = await jwtVerify(
      token,
      new TextEncoder().encode(jwtSecret),
    )
    payload = verifiedPayload
  } catch {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Account deactivation link is invalid or expired.",
    )
  }

  const {
    customer_id: customerId,
    deactivation_nonce: deactivationNonce,
    email,
    purpose,
  } = payload
  if (
    purpose !== CUSTOMER_ACCOUNT_DEACTIVATION_TOKEN_PURPOSE ||
    typeof customerId !== "string" ||
    typeof deactivationNonce !== "string" ||
    deactivationNonce === ""
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Account deactivation link is invalid or expired.",
    )
  }

  return {
    customer_id: customerId,
    deactivation_nonce: deactivationNonce,
    email: typeof email === "string" ? email : undefined,
  }
}
