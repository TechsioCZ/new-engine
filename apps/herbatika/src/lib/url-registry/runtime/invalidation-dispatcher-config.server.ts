import "server-only"
import { verifyBearerAuthorization } from "../http/command-auth"

const INVALIDATION_PATH = "/api/url-registry/invalidate"

export type InvalidationDispatcherConfig =
  | Readonly<{ enabled: false }>
  | Readonly<{
      enabled: true
      endpoint: string
      token: string
    }>

const parseOrigin = (value: string | undefined): URL => {
  if (!(value && value === value.trim())) {
    throw new Error("URL_REGISTRY_INVALIDATION_DISPATCH_ORIGIN is required")
  }
  let origin: URL
  try {
    origin = new URL(value)
  } catch {
    throw new Error("URL_REGISTRY_INVALIDATION_DISPATCH_ORIGIN is invalid")
  }
  const isLoopback = ["127.0.0.1", "localhost", "::1"].includes(origin.hostname)
  if (
    (origin.protocol !== "https:" &&
      !(origin.protocol === "http:" && isLoopback)) ||
    origin.username !== "" ||
    origin.password !== "" ||
    origin.pathname !== "/" ||
    origin.search !== "" ||
    origin.hash !== ""
  ) {
    throw new Error("URL_REGISTRY_INVALIDATION_DISPATCH_ORIGIN is invalid")
  }
  return origin
}

export const parseInvalidationDispatcherConfig = (
  environment: NodeJS.ProcessEnv = process.env
): InvalidationDispatcherConfig => {
  if (environment.URL_REGISTRY_INVALIDATION_DISPATCH_ENABLED !== "1") {
    return { enabled: false }
  }
  if (
    environment.URL_REGISTRY_ENABLED !== "1" ||
    environment.URL_REGISTRY_INVALIDATION_ENABLED !== "1"
  ) {
    throw new Error(
      "URL registry and invalidation gates must be enabled before dispatch"
    )
  }
  const token = environment.URL_REGISTRY_INVALIDATION_TOKEN
  if (
    !token ||
    verifyBearerAuthorization(`Bearer ${token}`, token) !== "authorized"
  ) {
    throw new Error("URL_REGISTRY_INVALIDATION_TOKEN is invalid")
  }
  const origin = parseOrigin(
    environment.URL_REGISTRY_INVALIDATION_DISPATCH_ORIGIN
  )
  return {
    enabled: true,
    endpoint: new URL(INVALIDATION_PATH, origin).toString(),
    token,
  }
}
