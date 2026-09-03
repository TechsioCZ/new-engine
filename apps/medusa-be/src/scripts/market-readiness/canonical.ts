import { createHash, createHmac, timingSafeEqual } from "node:crypto"

const CANONICAL_ARTIFACT_ERROR =
  "Artifact must be canonical JSON with exactly one trailing LF"
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const canonicalJsonValue = (value: unknown, path: string): string => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value)
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${path} contains a non-finite number`)
    }
    return JSON.stringify(Object.is(value, -0) ? 0 : value)
  }
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) {
      throw new TypeError(`${path} contains a sparse or decorated array`)
    }
    return `[${value
      .map((entry, index) => canonicalJsonValue(entry, `${path}[${index}]`))
      .join(",")}]`
  }
  if (isPlainRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJsonValue(value[key], `${path}.${key}`)}`
      )
      .join(",")}}`
  }
  throw new TypeError(`${path} contains a non-JSON value`)
}

export const canonicalJson = (value: unknown): string =>
  canonicalJsonValue(value, "artifact")

export const canonicalJsonWithLf = (value: unknown): string =>
  `${canonicalJson(value)}\n`

export const parseCanonicalJsonWithLf = (serialized: string): unknown => {
  let value: unknown
  try {
    if (
      !serialized.endsWith("\n") ||
      serialized.endsWith("\n\n") ||
      serialized.includes("\r")
    ) {
      throw new Error(CANONICAL_ARTIFACT_ERROR)
    }
    value = JSON.parse(serialized.slice(0, -1))
    if (canonicalJsonWithLf(value) !== serialized) {
      throw new Error(CANONICAL_ARTIFACT_ERROR)
    }
  } catch (error) {
    if (error instanceof Error && error.message === CANONICAL_ARTIFACT_ERROR) {
      throw error
    }
    throw new Error(CANONICAL_ARTIFACT_ERROR, { cause: error })
  }
  return value
}

export const sha256CanonicalJsonWithLf = (value: unknown): string =>
  createHash("sha256").update(canonicalJsonWithLf(value)).digest("hex")

export const hmacSha256DomainSeparated = (
  domain: string,
  value: unknown,
  secret: string
): string =>
  createHmac("sha256", secret)
    .update(domain, "utf8")
    .update(Buffer.from([0]))
    .update(canonicalJsonWithLf(value), "utf8")
    .digest("hex")

export const equalLowercaseSha256 = (left: string, right: string): boolean => {
  if (!(LOWERCASE_SHA256.test(left) && LOWERCASE_SHA256.test(right))) {
    return false
  }
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"))
}
