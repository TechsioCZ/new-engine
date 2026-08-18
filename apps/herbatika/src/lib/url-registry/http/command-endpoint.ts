import type {
  RouteMutationResult,
  UrlRegistry,
  UrlRegistryCommand,
  UrlRegistryCommandRequest,
} from "../contracts"
import { isUrlRegistryError, type UrlRegistryErrorCode } from "../errors"
import { verifyUrlRegistryCommandAuthorization } from "./command-auth"
import {
  dispatchUrlRegistryCommand,
  URL_REGISTRY_COMMAND_TYPES,
} from "./command-dispatch"

type CommandEndpointDependencies = Readonly<{
  commandToken: string | undefined
  enabled: boolean
  readRegistry(): Promise<UrlRegistry>
}>

const MAX_BODY_BYTES = 64 * 1024
const FINGERPRINT_PATTERN = /^sha256:[0-9a-f]{64}$/
const PRIVATE_NO_STORE = "private, no-store, max-age=0"

const responseHeaders = {
  "cache-control": PRIVATE_NO_STORE,
  "x-robots-tag": "noindex, nofollow",
}

const jsonError = (error: string, status: number, headers?: HeadersInit) =>
  Response.json(
    { error },
    { headers: { ...responseHeaders, ...headers }, status }
  )

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isCommandType = (
  value: unknown
): value is UrlRegistryCommandRequest["commandType"] =>
  typeof value === "string" &&
  URL_REGISTRY_COMMAND_TYPES.has(
    value as UrlRegistryCommandRequest["commandType"]
  )

const parseCommand = (value: unknown): UrlRegistryCommand | null => {
  if (!(isRecord(value) && isRecord(value.request))) {
    return null
  }
  if (
    value.commandVersion !== 1 ||
    typeof value.idempotencyKey !== "string" ||
    value.idempotencyKey.length < 1 ||
    value.idempotencyKey.length > 255 ||
    typeof value.requestFingerprint !== "string" ||
    !FINGERPRINT_PATTERN.test(value.requestFingerprint) ||
    !isCommandType(value.request.commandType)
  ) {
    return null
  }
  return value as unknown as UrlRegistryCommand
}

const readCommand = async (request: Request) => {
  const contentLength = Number(request.headers.get("content-length"))
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return { kind: "too-large" } as const
  }
  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase()
  if (mediaType !== "application/json") {
    return { kind: "invalid" } as const
  }

  const body = await request.text()
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    return { kind: "too-large" } as const
  }

  try {
    const command = parseCommand(JSON.parse(body))
    return command
      ? ({ command, kind: "valid" } as const)
      : ({ kind: "invalid" } as const)
  } catch {
    return { kind: "invalid" } as const
  }
}

const conflictCodes = new Set<UrlRegistryErrorCode>([
  "EQUIVALENCE_CONFLICT",
  "IDEMPOTENCY_CONFLICT",
  "IDENTITY_CONFLICT",
  "INVALID_TRANSITION",
  "SLUG_CONFLICT",
  "SOURCE_EVENT_CONFLICT",
  "STATIC_PATH_CONFLICT",
  "VERSION_CONFLICT",
])

const mapErrorStatus = (code: UrlRegistryErrorCode) => {
  if (code === "NOT_FOUND") {
    return 404
  }
  if (conflictCodes.has(code)) {
    return 409
  }
  if (
    code === "INVALID_COMMAND" ||
    code === "INVALID_REQUEST_FINGERPRINT" ||
    code === "SOURCE_IDENTITY_MISMATCH"
  ) {
    return 400
  }
  return 503
}

const acknowledge = (result: RouteMutationResult) =>
  Response.json(
    {
      auditId: result.commit.audit.id,
      outcome: result.commit.outcome,
      replayed: result.commit.replayed,
      resultVersion: result.snapshot.route.version,
      routeId: result.snapshot.route.id,
    },
    { headers: responseHeaders, status: 200 }
  )

export const handleUrlRegistryCommandRequest = async (
  request: Request,
  dependencies: CommandEndpointDependencies
): Promise<Response> => {
  if (!dependencies.enabled) {
    return jsonError("not-found", 404)
  }

  const authorization = verifyUrlRegistryCommandAuthorization(
    request.headers.get("authorization"),
    dependencies.commandToken
  )
  if (authorization === "misconfigured") {
    return jsonError("service-unavailable", 503)
  }
  if (authorization !== "authorized") {
    return jsonError("unauthorized", 401, { "www-authenticate": "Bearer" })
  }

  const parsed = await readCommand(request)
  if (parsed.kind === "too-large") {
    return jsonError("payload-too-large", 413)
  }
  if (parsed.kind !== "valid") {
    return jsonError("invalid-command", 400)
  }

  try {
    const registry = await dependencies.readRegistry()
    const result = await dispatchUrlRegistryCommand(registry, parsed.command)
    if (!(result && "snapshot" in result)) {
      return Response.json(
        {
          auditId: result.commit.audit.id,
          outcome: result.commit.outcome,
          replayed: result.commit.replayed,
          resultVersion: null,
          routeId: null,
        },
        { headers: responseHeaders, status: 200 }
      )
    }
    return acknowledge(result)
  } catch (error) {
    if (isUrlRegistryError(error)) {
      return jsonError(error.code.toLowerCase(), mapErrorStatus(error.code))
    }
    return jsonError("service-unavailable", 503)
  }
}
