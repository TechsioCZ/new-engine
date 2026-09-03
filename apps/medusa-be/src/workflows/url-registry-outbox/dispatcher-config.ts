import { MedusaError } from "@medusajs/framework/utils"

const LIFECYCLE_PATH = "/api/internal/url-registry/product-lifecycle"
const CATALOG_LIFECYCLE_PATH = "/api/internal/url-registry/catalog-lifecycle"
const TOKEN_PATTERN = /^[\x21-\x7e]{32,512}$/
const CRON_PATTERN = /^\S+(?:[ \t]+\S+){4}$/
const MAX_SCHEDULE_LENGTH = 128

export const DEFAULT_URL_REGISTRY_DISPATCH_SCHEDULE = "* * * * *"

export type UrlRegistryDispatcherConfig =
  | Readonly<{ enabled: false }>
  | Readonly<{
      enabled: true
      catalogEndpoint: string
      endpoint: string
      token: string
    }>

const readInternalOrigin = (environment: NodeJS.ProcessEnv): string => {
  const raw = environment.URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN
  if (!(raw && raw === raw.trim())) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN is required"
    )
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN is invalid"
    )
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN is invalid"
    )
  }
  return url.origin
}

const readLifecycleToken = (environment: NodeJS.ProcessEnv): string => {
  const token = environment.URL_REGISTRY_PRODUCT_LIFECYCLE_TOKEN
  if (!(token && TOKEN_PATTERN.test(token))) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "URL_REGISTRY_PRODUCT_LIFECYCLE_TOKEN is invalid"
    )
  }
  return token
}

export const parseUrlRegistryDispatcherConfig = (
  environment: NodeJS.ProcessEnv = process.env
): UrlRegistryDispatcherConfig => {
  if (environment.URL_REGISTRY_PRODUCT_LIFECYCLE_ENABLED !== "1") {
    return { enabled: false }
  }

  const origin = readInternalOrigin(environment)
  return {
    enabled: true,
    catalogEndpoint: new URL(CATALOG_LIFECYCLE_PATH, `${origin}/`).toString(),
    endpoint: new URL(LIFECYCLE_PATH, `${origin}/`).toString(),
    token: readLifecycleToken(environment),
  }
}

export const readUrlRegistryDispatchSchedule = (
  environment: NodeJS.ProcessEnv = process.env
): string => {
  const schedule = environment.URL_REGISTRY_PRODUCT_LIFECYCLE_DISPATCH_SCHEDULE
  if (schedule === undefined) {
    return DEFAULT_URL_REGISTRY_DISPATCH_SCHEDULE
  }
  if (
    schedule.length === 0 ||
    schedule.length > MAX_SCHEDULE_LENGTH ||
    schedule !== schedule.trim() ||
    !CRON_PATTERN.test(schedule)
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "URL_REGISTRY_PRODUCT_LIFECYCLE_DISPATCH_SCHEDULE is invalid"
    )
  }
  return schedule
}
