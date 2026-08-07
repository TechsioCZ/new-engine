import { timingSafeEqual } from "node:crypto"
import { SlugError, validateSlug } from "@/lib/url/slug"
import {
  MARKETS,
  type Market,
  URL_KINDS,
  type UrlKind,
  type UrlStatus,
} from "@/lib/url/types"
import type {
  CreateUrlRecordInput,
  UrlRegistryListQuery,
} from "@/lib/url-registry/contracts"
import { isUrlRegistryError } from "@/lib/url-registry/errors"

const NON_NEGATIVE_INTEGER_PATTERN = /^\d+$/

const unauthorized = () =>
  Response.json({ error: "Unauthorized" }, { status: 401 })

export const authorizeUrlRegistryAdmin = (
  request: Request
): Response | null => {
  const configuredToken = process.env.URL_REGISTRY_ADMIN_TOKEN
  const authorization = request.headers.get("authorization")
  if (!(configuredToken && authorization?.startsWith("Bearer "))) {
    return unauthorized()
  }
  const suppliedToken = authorization.slice("Bearer ".length)
  const expected = Buffer.from(configuredToken)
  const supplied = Buffer.from(suppliedToken)
  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  ) {
    return unauthorized()
  }
  return null
}

/**
 * Wrap an admin route handler with the shared bearer-token check and the
 * canonical error translation, so each route only expresses its own logic.
 */
export const withUrlRegistryAdmin =
  <TContext>(
    handler: (request: Request, context: TContext) => Promise<Response>
  ) =>
  async (request: Request, context?: TContext): Promise<Response> => {
    const unauthorizedResponse = authorizeUrlRegistryAdmin(request)
    if (unauthorizedResponse) {
      return unauthorizedResponse
    }
    try {
      return await handler(request, context as TContext)
    } catch (error) {
      return urlRegistryErrorResponse(error)
    }
  }

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const requiredString = (value: unknown, field: string) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SyntaxError(`${field} must be a non-empty string`)
  }
  return value.trim()
}

const parseMarket = (value: unknown): Market => {
  const market = requiredString(value, "market") as Market
  if (!MARKETS.includes(market)) {
    throw new SyntaxError(`Unsupported market: ${market}`)
  }
  return market
}

const parseKind = (value: unknown): UrlKind => {
  const kind = requiredString(value, "kind") as UrlKind
  if (!URL_KINDS.includes(kind)) {
    throw new SyntaxError(`Unsupported kind: ${kind}`)
  }
  return kind
}

export const parseCreateInput = (value: unknown): CreateUrlRecordInput => {
  if (!isObject(value)) {
    throw new SyntaxError("Request body must be an object")
  }
  if (typeof value.indexable !== "boolean") {
    throw new SyntaxError("indexable must be a boolean")
  }
  return {
    market: parseMarket(value.market),
    kind: parseKind(value.kind),
    slug: validateSlug(requiredString(value.slug, "slug")),
    entityId: requiredString(value.entityId, "entityId"),
    equivalenceKey: requiredString(value.equivalenceKey, "equivalenceKey"),
    indexable: value.indexable,
  }
}

export const parseEntityActionInput = (value: unknown) => {
  if (!isObject(value)) {
    throw new SyntaxError("Request body must be an object")
  }
  return {
    market: parseMarket(value.market),
    kind: parseKind(value.kind),
    entityId: requiredString(value.entityId, "entityId"),
  }
}

export const parseTombstoneAllInput = (value: unknown) => {
  if (!isObject(value)) {
    throw new SyntaxError("Request body must be an object")
  }
  return {
    kind: parseKind(value.kind),
    entityId: requiredString(value.entityId, "entityId"),
  }
}

export const parseSlugChangeInput = (value: unknown) => {
  const entity = parseEntityActionInput(value)
  const input = value as Record<string, unknown>
  return {
    ...entity,
    newSlug: validateSlug(requiredString(input.newSlug, "newSlug")),
  }
}

const optionalInteger = (value: string | null, field: string) => {
  if (value === null) {
    return
  }
  if (!NON_NEGATIVE_INTEGER_PATTERN.test(value)) {
    throw new SyntaxError(`${field} must be a non-negative integer`)
  }
  return Number(value)
}

export const parseListQuery = (url: URL): UrlRegistryListQuery => {
  const allowed = new Set([
    "market",
    "kind",
    "entityId",
    "equivalenceKey",
    "status",
    "limit",
    "offset",
  ])
  for (const key of url.searchParams.keys()) {
    if (!allowed.has(key)) {
      throw new SyntaxError(`Unknown query parameter: ${key}`)
    }
  }
  const market = url.searchParams.get("market")
  const kind = url.searchParams.get("kind")
  const status = url.searchParams.get("status")
  if (status && !["current", "alias", "tombstone"].includes(status)) {
    throw new SyntaxError(`Unsupported status: ${status}`)
  }
  return {
    ...(market ? { market: parseMarket(market) } : {}),
    ...(kind ? { kind: parseKind(kind) } : {}),
    ...(url.searchParams.get("entityId")
      ? { entityId: url.searchParams.get("entityId") as string }
      : {}),
    ...(url.searchParams.get("equivalenceKey")
      ? { equivalenceKey: url.searchParams.get("equivalenceKey") as string }
      : {}),
    ...(status ? { status: status as UrlStatus } : {}),
    limit: optionalInteger(url.searchParams.get("limit"), "limit"),
    offset: optionalInteger(url.searchParams.get("offset"), "offset"),
  }
}

export const readJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json()
  } catch {
    throw new SyntaxError("Request body must be valid JSON")
  }
}

export const urlRegistryErrorResponse = (error: unknown): Response => {
  if (error instanceof SyntaxError || error instanceof SlugError) {
    return Response.json({ error: error.message }, { status: 400 })
  }
  if (isUrlRegistryError(error)) {
    const status = error.code === "NOT_FOUND" ? 404 : 409
    return Response.json({ error: error.message, code: error.code }, { status })
  }
  console.error("URL registry admin operation failed", error)
  return Response.json({ error: "Internal server error" }, { status: 500 })
}
