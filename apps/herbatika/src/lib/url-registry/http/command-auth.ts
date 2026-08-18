import { createHash, timingSafeEqual } from "node:crypto"

export type BearerAuthorization =
  | "authorized"
  | "misconfigured"
  | "unauthorized"

export type UrlRegistryCommandAuthorization = BearerAuthorization

const TOKEN_PATTERN = /^[\x21-\x7e]{32,512}$/
const BEARER_PATTERN = /^Bearer ([\x21-\x7e]{1,512})$/i

const digest = (value: string) => createHash("sha256").update(value).digest()

export const verifyBearerAuthorization = (
  authorization: string | null,
  configuredToken: string | undefined
): BearerAuthorization => {
  if (!(configuredToken && TOKEN_PATTERN.test(configuredToken))) {
    return "misconfigured"
  }

  const candidate = authorization?.match(BEARER_PATTERN)?.[1]
  if (!candidate) {
    return "unauthorized"
  }

  return timingSafeEqual(digest(candidate), digest(configuredToken))
    ? "authorized"
    : "unauthorized"
}

export const verifyUrlRegistryCommandAuthorization = verifyBearerAuthorization
