import { randomUUID } from "node:crypto"

import { isRecord } from "@techsio/std/object"
import { importSPKI, jwtVerify } from "jose"
import type { Endpoint, PayloadRequest } from "payload"
import {
  APIError,
  generatePayloadCookie,
  headersWithCors,
  jwtSign,
} from "payload"

import { getEnv } from "../utils/env"

const DEFAULT_ISSUER = "medusa"
const DEFAULT_AUDIENCE = "payload"
const DEFAULT_ALG = "RS256"
const MAX_SESSIONS = 100

/** JWT payload shape expected from Medusa SSO tokens. */
interface MedusaSsoToken {
  email: string | undefined
  medusa_actor_id: string | undefined
  medusa_actor_type: string | undefined
  payload_sso_mode: string | undefined
  sub: string | undefined
}

type SessionTimestamp = string | Date | null

/** Session entry stored on Payload admin users. */
interface Session {
  createdAt: SessionTimestamp | undefined
  expiresAt: string | Date
  id: string
}

/** Minimal admin user record used for session updates. */
interface AdminUser {
  id: string | number
  sessions: Session[] | null | undefined
}

/** Normalize PEM keys loaded from environment variables. */
const normalizeKey = (value: string) => value.replaceAll("\\n", "\n").trim()

/** Filter out expired session entries. */
const removeExpiredSessions = (sessions: Session[]) => {
  const now = new Date()
  return sessions.filter((session) => {
    const expiresAt =
      session.expiresAt instanceof Date
        ? session.expiresAt
        : new Date(session.expiresAt)
    return expiresAt > now
  })
}

/** Ensure return paths remain relative to prevent open redirects. */
const sanitizeReturnTo = (value: string | null) => {
  if (value === null || value === "") {
    return "/"
  }
  if (value.startsWith("/") && !value.startsWith("//")) {
    return value
  }
  return "/"
}

/** Normalize a URL-like value to a strict origin string. */
const normalizeOrigin = (value: string | null) => {
  if (value === null || value === "") {
    return null
  }

  const trimmed = value.trim()
  if (trimmed === "" || trimmed === "null") {
    return null
  }

  try {
    return new URL(trimmed).origin
  } catch {
    return null
  }
}

/** Read and normalize a list of allowed origins from environment. */
const getAllowedOrigins = () =>
  new Set(
    (getEnv("PAYLOAD_SSO_ALLOWED_ORIGINS") ?? "")
      .split(",")
      .map((origin) => normalizeOrigin(origin))
      .filter((origin): origin is string => origin !== null),
  )

/** Resolve request origin from Origin header, with Referer fallback. */
const getRequestOrigin = (headers: Headers) => {
  const originHeader = normalizeOrigin(headers.get("origin"))
  if (originHeader !== null) {
    return originHeader
  }
  return normalizeOrigin(headers.get("referer"))
}

/** Add CORS headers for a request origin that has already passed validation. */
const setAllowedOriginCorsHeaders = (
  headers: Headers,
  origin: string | null,
) => {
  if (origin === null) {
    return
  }

  headers.set("Access-Control-Allow-Origin", origin)
  headers.set("Access-Control-Allow-Credentials", "true")
  headers.set("Access-Control-Expose-Headers", "Location")
  headers.append("Vary", "Origin")
}

const readStringField = (
  value: Record<string, unknown>,
  field: string,
): string | undefined =>
  typeof value[field] === "string" ? value[field] : undefined

const parseMedusaSsoToken = (value: unknown): MedusaSsoToken => {
  if (!isRecord(value)) {
    throw new APIError("Invalid SSO token payload.", 401)
  }

  return {
    email: readStringField(value, "email"),
    medusa_actor_id: readStringField(value, "medusa_actor_id"),
    medusa_actor_type: readStringField(value, "medusa_actor_type"),
    payload_sso_mode: readStringField(value, "payload_sso_mode"),
    sub: readStringField(value, "sub"),
  }
}

const parseSession = (value: unknown): Session | null => {
  if (!isRecord(value)) {
    return null
  }

  const { createdAt, expiresAt, id } = value
  if (typeof id !== "string") {
    return null
  }
  if (
    createdAt !== undefined &&
    createdAt !== null &&
    typeof createdAt !== "string" &&
    !(createdAt instanceof Date)
  ) {
    return null
  }
  if (typeof expiresAt !== "string" && !(expiresAt instanceof Date)) {
    return null
  }

  return { createdAt, expiresAt, id }
}

const parseAdminUser = (value: unknown): AdminUser | null => {
  if (!isRecord(value)) {
    return null
  }

  const { id, sessions: rawSessions } = value
  if (typeof id !== "string" && typeof id !== "number") {
    return null
  }

  if (rawSessions === undefined || rawSessions === null) {
    return { id, sessions: rawSessions }
  }
  if (!Array.isArray(rawSessions)) {
    return null
  }

  const sessions = rawSessions.map(parseSession)
  return sessions.every((session) => session !== null)
    ? {
        id,
        sessions: sessions.filter(
          (session): session is Session => session !== null,
        ),
      }
    : null
}

const getFormValue = (formData: FormData, field: string): string | null => {
  const value = formData.get(field)
  return typeof value === "string" ? value : null
}

const readFormData = async (req: PayloadRequest): Promise<FormData> => {
  if (typeof req.formData !== "function") {
    throw new APIError("Form data parsing is not available.", 400)
  }

  try {
    return await req.formData()
  } catch {
    throw new APIError("Invalid form data.", 400)
  }
}

interface SsoConfiguration {
  expectedEmail: string
  publicKey: string
}

const requireAllowedOrigin = (headers: Headers): string => {
  const allowedOrigins = getAllowedOrigins()
  if (allowedOrigins.size === 0) {
    throw new APIError("Payload SSO allowed origins are not configured.", 500)
  }

  const requestOrigin = getRequestOrigin(headers)
  if (requestOrigin === null || !allowedOrigins.has(requestOrigin)) {
    throw new APIError("Origin is not allowed.", 403)
  }

  return requestOrigin
}

const requireSsoConfiguration = (): SsoConfiguration => {
  const publicKey = getEnv("PAYLOAD_SSO_PUBLIC_KEY")
  const expectedEmail = getEnv("PAYLOAD_SSO_USER_EMAIL")
  if (
    publicKey === undefined ||
    publicKey === "" ||
    expectedEmail === undefined ||
    expectedEmail === ""
  ) {
    throw new APIError("Payload SSO is not configured.", 500)
  }

  return { expectedEmail, publicKey }
}

const verifySsoEmail = async (
  req: PayloadRequest,
  formData: FormData,
  configuration: SsoConfiguration,
): Promise<string> => {
  const token = getFormValue(formData, "token")
  if (token === null || token === "") {
    throw new APIError("Missing SSO token.", 400)
  }

  const alg = getEnv("PAYLOAD_SSO_ALG") ?? DEFAULT_ALG
  const issuer = getEnv("PAYLOAD_SSO_ISSUER") ?? DEFAULT_ISSUER
  const audience = getEnv("PAYLOAD_SSO_AUDIENCE") ?? DEFAULT_AUDIENCE
  const key = await importSPKI(normalizeKey(configuration.publicKey), alg)

  let verifiedPayload: MedusaSsoToken
  try {
    const verified = await jwtVerify(token, key, {
      algorithms: [alg],
      audience,
      issuer,
    })
    verifiedPayload = parseMedusaSsoToken(verified.payload)
  } catch (error) {
    req.payload.logger.warn({ err: error }, "SSO token verification failed")
    throw new APIError("Invalid SSO token.", 401)
  }

  const email =
    verifiedPayload.email === undefined || verifiedPayload.email === ""
      ? verifiedPayload.sub
      : verifiedPayload.email
  if (email === undefined || email === "") {
    throw new APIError("SSO token missing user email.", 400)
  }
  if (email !== configuration.expectedEmail) {
    throw new APIError("SSO token user is not configured for Payload.", 401)
  }

  return email
}

/** Type guard for validating configured collection slugs. */
const hasCollectionSlug = <T extends Record<string, unknown>>(
  collections: T,
  slug: string,
): slug is Extract<keyof T, string> => Object.hasOwn(collections, slug)

/** Create the Payload endpoint that exchanges Medusa SSO tokens for sessions. */
const createMedusaSsoPostEndpoint = (): Endpoint => ({
  // Endpoint flow is intentionally linear to keep auth failure branches explicit.
  handler: async (req) => {
    const requestOrigin = requireAllowedOrigin(req.headers)
    const configuration = requireSsoConfiguration()
    const formData = await readFormData(req)
    const email = await verifySsoEmail(req, formData, configuration)

    const adminCollectionSlug = req.payload.config.admin.user
    if (!hasCollectionSlug(req.payload.collections, adminCollectionSlug)) {
      throw new APIError("Payload admin collection is not configured.", 500)
    }
    const adminCollection = req.payload.collections[adminCollectionSlug]
    if (adminCollection === undefined) {
      throw new APIError("Payload admin collection is not configured.", 500)
    }

    const userResult = await req.payload.find({
      collection: adminCollectionSlug,
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      req,
      select: {
        email: true,
        id: true,
        sessions: true,
      },
      where: {
        email: {
          equals: email,
        },
      },
    })

    const user = parseAdminUser(userResult.docs[0])
    if (user === null) {
      throw new APIError("SSO user not found.", 401)
    }

    let sid: string | undefined
    if (adminCollection.config.auth.useSessions) {
      sid = randomUUID()
      const now = new Date()
      const { tokenExpiration } = adminCollection.config.auth
      const expiresAt = new Date(now.getTime() + tokenExpiration * 1000)
      const existingSessions = Array.isArray(user.sessions)
        ? removeExpiredSessions(user.sessions).slice(
            -Math.max(MAX_SESSIONS - 1, 0),
          )
        : []

      await req.payload.db.updateOne({
        collection: adminCollectionSlug,
        data: {
          sessions: [
            ...existingSessions,
            {
              createdAt: now,
              expiresAt,
              id: sid,
            },
          ],
          updatedAt: null,
        },
        id: user.id,
        req,
        returning: false,
      })
    }

    const { token: payloadToken } = await jwtSign({
      fieldsToSign: {
        collection: adminCollectionSlug,
        id: String(user.id),
        ...(sid === undefined ? {} : { sid }),
      },
      secret: req.payload.secret,
      tokenExpiration: adminCollection.config.auth.tokenExpiration,
    })

    const cookie = generatePayloadCookie({
      collectionAuthConfig: adminCollection.config.auth,
      cookiePrefix: req.payload.config.cookiePrefix,
      token: payloadToken,
    })

    const returnTo = getFormValue(formData, "returnTo")
    const redirectTo = sanitizeReturnTo(returnTo)
    const headers = headersWithCors({
      headers: new Headers({
        Location: redirectTo,
        "Set-Cookie": cookie,
      }),
      req,
    })
    setAllowedOriginCorsHeaders(headers, requestOrigin)

    return new Response(null, {
      headers,
      status: 302,
    })
  },
  method: "post",
  path: "/medusa-sso",
})

/** Shared instance of the Medusa SSO endpoint. */
export const medusaSsoPostEndpoint = createMedusaSsoPostEndpoint()
