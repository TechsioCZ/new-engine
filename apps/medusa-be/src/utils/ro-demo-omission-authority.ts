import { createHmac, timingSafeEqual } from "node:crypto"
import { PRODUCT_CONTENT_TRANSLATABLE_FIELDS } from "./product-content"

export const RO_DEMO_OMISSION_AUTHORITY_KEY =
  "__demo_omission_authority" as const
export const RO_DEMO_OMISSION_AUTHORITY_SECRET_ENV =
  "RO_DEMO_OMISSION_AUTHORITY_SECRET" as const

const SHA256 = /^[0-9a-f]{64}$/
const SIGNATURE = /^hmac-sha256:([0-9a-f]{64})$/

export type RoDemoOmissionAuthorityPayload = Readonly<{
  ledgerSha256: string
  mode: "official-ro-description-only"
  omittedFields: readonly (typeof PRODUCT_CONTENT_TRANSLATABLE_FIELDS)[number][]
  productContentId: string
  productId: string
  roDescriptionSha256: string
  schemaVersion: 1
  sourceContentSha256: string
  sourceUrl: string
}>

export type RoDemoOmissionAuthority = RoDemoOmissionAuthorityPayload &
  Readonly<{ signature: `hmac-sha256:${string}` }>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const officialSourceUrl = (value: unknown) => {
  if (typeof value !== "string") {
    return false
  }
  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (url.hostname === "herbatica.ro" ||
        url.hostname.endsWith(".herbatica.ro"))
    )
  } catch {
    return false
  }
}

const validSecret = (secret: unknown): secret is string =>
  typeof secret === "string" && Buffer.byteLength(secret, "utf8") >= 32

const payloadKeys = [
  "ledgerSha256",
  "mode",
  "omittedFields",
  "productContentId",
  "productId",
  "roDescriptionSha256",
  "schemaVersion",
  "sourceContentSha256",
  "sourceUrl",
] as const

const parsePayload = (
  value: unknown
): RoDemoOmissionAuthorityPayload | null => {
  if (!isRecord(value)) {
    return null
  }
  const allowed = new Set([...payloadKeys, "signature"])
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    return null
  }
  const omittedFields = value.omittedFields
  const sourceUrl = value.sourceUrl
  if (
    value.schemaVersion !== 1 ||
    value.mode !== "official-ro-description-only" ||
    typeof value.productId !== "string" ||
    value.productId.length === 0 ||
    typeof value.productContentId !== "string" ||
    value.productContentId.length === 0 ||
    typeof value.sourceContentSha256 !== "string" ||
    !SHA256.test(value.sourceContentSha256) ||
    typeof value.roDescriptionSha256 !== "string" ||
    !SHA256.test(value.roDescriptionSha256) ||
    typeof value.ledgerSha256 !== "string" ||
    !SHA256.test(value.ledgerSha256) ||
    !officialSourceUrl(sourceUrl) ||
    !Array.isArray(omittedFields) ||
    omittedFields.length !== PRODUCT_CONTENT_TRANSLATABLE_FIELDS.length ||
    !PRODUCT_CONTENT_TRANSLATABLE_FIELDS.every(
      (field, index) => omittedFields[index] === field
    )
  ) {
    return null
  }
  return {
    ledgerSha256: value.ledgerSha256,
    mode: value.mode,
    omittedFields: [...PRODUCT_CONTENT_TRANSLATABLE_FIELDS],
    productContentId: value.productContentId,
    productId: value.productId,
    roDescriptionSha256: value.roDescriptionSha256,
    schemaVersion: 1,
    sourceContentSha256: value.sourceContentSha256,
    sourceUrl: sourceUrl as string,
  }
}

const canonicalPayload = (payload: RoDemoOmissionAuthorityPayload) =>
  JSON.stringify(
    Object.fromEntries(payloadKeys.map((key) => [key, payload[key]]))
  )

const signatureFor = (
  payload: RoDemoOmissionAuthorityPayload,
  secret: string
) =>
  createHmac("sha256", secret).update(canonicalPayload(payload)).digest("hex")

export const createRoDemoOmissionAuthority = (
  input: RoDemoOmissionAuthorityPayload,
  secret = process.env[RO_DEMO_OMISSION_AUTHORITY_SECRET_ENV]
): RoDemoOmissionAuthority => {
  const payload = parsePayload(input)
  if (!(payload && validSecret(secret))) {
    throw new Error("RO demo omission authority input or secret is invalid")
  }
  return {
    ...payload,
    signature: `hmac-sha256:${signatureFor(payload, secret)}`,
  }
}

export const verifyRoDemoOmissionAuthority = (
  value: unknown,
  expected: Readonly<{
    ledgerSha256?: string
    productContentId: string
    productId: string
    roDescriptionSha256: string
  }>,
  secret = process.env[RO_DEMO_OMISSION_AUTHORITY_SECRET_ENV]
): RoDemoOmissionAuthority | null => {
  if (!(isRecord(value) && validSecret(secret))) {
    return null
  }
  const payload = parsePayload(value)
  const signature =
    typeof value.signature === "string"
      ? value.signature.match(SIGNATURE)?.[1]
      : undefined
  if (
    !(
      payload &&
      signature &&
      payload.productId === expected.productId &&
      payload.productContentId === expected.productContentId &&
      payload.roDescriptionSha256 === expected.roDescriptionSha256 &&
      (!expected.ledgerSha256 || payload.ledgerSha256 === expected.ledgerSha256)
    )
  ) {
    return null
  }
  const actual = Buffer.from(signature, "hex")
  const calculated = Buffer.from(signatureFor(payload, secret), "hex")
  if (
    actual.length !== calculated.length ||
    !timingSafeEqual(actual, calculated)
  ) {
    return null
  }
  return {
    ...payload,
    signature: `hmac-sha256:${signature}`,
  }
}
