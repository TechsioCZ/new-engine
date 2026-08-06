import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  PayloadRequest,
} from "payload"

export type UrlRegistryKind = "page" | "article"

type Market = "sk" | "cz" | "hu" | "ro"
type SupportedLocale = "sk" | "cs" | "hu" | "ro"
type RegistryAction = "sync" | "tombstone" | "tombstone-all"
type UrlRegistryEnvironment = Record<string, string | undefined>

type UrlRegistryDocument = {
  id: number | string
  slug?: string | null
  status?: string | null
  visibility?: string | null
}

type UrlRegistryHookArgs = {
  doc: UrlRegistryDocument
  operation?: string
  req: PayloadRequest
}

const LOCALE_MARKETS: Record<SupportedLocale, Market> = {
  sk: "sk",
  cs: "cz",
  hu: "hu",
  ro: "ro",
}
const MARKETS = Object.values(LOCALE_MARKETS)
const TRAILING_SLASHES = /\/+$/
const SAFE_REQUEST_ERROR = "URL registry request failed."

const isSupportedLocale = (locale: string): locale is SupportedLocale =>
  Object.hasOwn(LOCALE_MARKETS, locale)

const resolveBaseUrl = (
  market: Market,
  environment: UrlRegistryEnvironment
): string => {
  const envName = `HERBATICA_ORIGIN_${market.toUpperCase()}`
  const configured = environment[envName]?.trim()
  if (!configured) {
    throw new Error(`Missing required URL registry configuration: ${envName}.`)
  }

  let parsed: URL
  try {
    parsed = new URL(configured)
  } catch {
    throw new Error(`Invalid URL registry configuration: ${envName}.`)
  }

  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(`Invalid URL registry configuration: ${envName}.`)
  }

  return parsed.toString().replace(TRAILING_SLASHES, "")
}

const resolveToken = (environment: UrlRegistryEnvironment): string => {
  const token = environment.URL_REGISTRY_ADMIN_TOKEN
  if (!token?.trim()) {
    throw new Error(
      "Missing required URL registry configuration: URL_REGISTRY_ADMIN_TOKEN."
    )
  }
  return token
}

type RegistryRequest = {
  action: RegistryAction
  market: Market
  kind: UrlRegistryKind
  entityId: string
  body: Record<string, unknown>
  req: PayloadRequest
  environment: UrlRegistryEnvironment
}

const logRequestFailure = (
  request: RegistryRequest,
  status: number | "network"
) => {
  const { entityId, kind, market, req } = request
  req.payload.logger.error(
    `URL registry request failed: status=${status} market=${market} kind=${kind} entity=${entityId}`
  )
}

const postToRegistry = async (request: RegistryRequest): Promise<void> => {
  const { action, body, environment, market } = request
  const baseUrl = resolveBaseUrl(market, environment)
  const token = resolveToken(environment)
  let response: Response

  try {
    response = await fetch(`${baseUrl}/api/url-registry/${action}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    logRequestFailure(request, "network")
    throw new Error(SAFE_REQUEST_ERROR)
  }

  if (response.ok || (action === "tombstone" && response.status === 404)) {
    return
  }

  logRequestFailure(request, response.status)
  throw new Error(SAFE_REQUEST_ERROR)
}

const tombstone = (request: Omit<RegistryRequest, "action" | "body">) =>
  postToRegistry({
    ...request,
    action: "tombstone",
    body: {
      market: request.market,
      kind: request.kind,
      entityId: request.entityId,
    },
  })

const tombstoneAllMarkets = (
  request: Omit<RegistryRequest, "action" | "body" | "market">
) => {
  const configuredMarket = MARKETS.find((market) =>
    request.environment[`HERBATICA_ORIGIN_${market.toUpperCase()}`]?.trim()
  )
  if (!configuredMarket) {
    throw new Error(
      "Missing required URL registry configuration: one HERBATICA_ORIGIN_* value is required."
    )
  }
  return postToRegistry({
    ...request,
    action: "tombstone-all",
    market: configuredMarket,
    body: { kind: request.kind, entityId: request.entityId },
  })
}

const synchronizePublishedDocument = async ({
  doc,
  entityId,
  environment,
  kind,
  req,
}: {
  doc: UrlRegistryDocument
  entityId: string
  environment: UrlRegistryEnvironment
  kind: UrlRegistryKind
  req: PayloadRequest
}) => {
  const locale = typeof req.locale === "string" ? req.locale : "unset"
  if (!isSupportedLocale(locale)) {
    req.payload.logger.warn(
      `Unsupported Payload locale "${locale}" for URL registry sync; skipping.`
    )
    return
  }

  const market = LOCALE_MARKETS[locale]
  const slug = typeof doc.slug === "string" ? doc.slug.trim() : ""
  if (!slug) {
    await tombstone({ market, kind, entityId, req, environment })
    return
  }

  await postToRegistry({
    action: "sync",
    market,
    kind,
    entityId,
    body: {
      market,
      kind,
      slug,
      entityId,
      equivalenceKey: `${kind}:${entityId}`,
      indexable: true,
    },
    req,
    environment,
  })
}

/**
 * Create a Payload lifecycle hook that keeps Herbatika's URL registry aligned
 * with the localized page or article document.
 */
export const createUrlRegistrySyncHook = (
  kind: UrlRegistryKind,
  environment: UrlRegistryEnvironment = process.env
): CollectionAfterChangeHook & CollectionAfterDeleteHook => {
  const syncUrlRegistry = async ({
    doc,
    operation,
    req,
  }: UrlRegistryHookArgs) => {
    if (environment.URL_REGISTRY_SYNC_ENABLED === "0") {
      return doc
    }
    const entityId = String(doc.id)

    // Delete, publication status, and page visibility are document-wide.
    // Apply removals to every market so another locale cannot remain public.
    if (operation === undefined || operation === "delete") {
      await tombstoneAllMarkets({ kind, entityId, req, environment })
      return doc
    }

    if (operation !== "create" && operation !== "update") {
      return doc
    }

    const mustRemovePublicUrls =
      doc.status !== "published" ||
      (kind === "page" && doc.visibility !== "public")
    if (mustRemovePublicUrls) {
      await tombstoneAllMarkets({ kind, entityId, req, environment })
      return doc
    }

    await synchronizePublishedDocument({
      doc,
      entityId,
      environment,
      kind,
      req,
    })

    return doc
  }

  return syncUrlRegistry as CollectionAfterChangeHook &
    CollectionAfterDeleteHook
}
