import { randomUUID } from 'crypto'
import type { Endpoint } from 'payload'
import { APIError, generatePayloadCookie, headersWithCors, jwtSign } from 'payload'
import { importSPKI, jwtVerify } from 'jose'

const DEFAULT_ISSUER = 'medusa'
const DEFAULT_AUDIENCE = 'payload'
const DEFAULT_ALG = 'RS256'
const MAX_SESSIONS = 100

/** JWT payload shape expected from Medusa SSO tokens. */
type MedusaSsoToken = {
  email?: string
  sub?: string
}

/** Session entry stored on Payload admin users. */
type Session = {
  id: string
  createdAt?: string | Date | null
  expiresAt: string | Date
}

/** Minimal admin user record used for session updates. */
type AdminUser = {
  id: string | number
  sessions?: Session[] | null
}

/** Normalize PEM keys loaded from environment variables. */
const normalizeKey = (value: string) => value.replace(/\\n/g, '\n').trim()

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
  if (!value) {
    return '/'
  }
  if (value.startsWith('/') && !value.startsWith('//')) {
    return value
  }
  return '/'
}

/** Read and normalize a list of allowed origins from environment. */
const getAllowedOrigins = () =>
  (process.env.PAYLOAD_SSO_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

/** Type guard for validating configured collection slugs. */
const hasCollectionSlug = <T extends Record<string, unknown>>(
  collections: T,
  slug: string
): slug is Extract<keyof T, string> =>
  Object.prototype.hasOwnProperty.call(collections, slug)

/** Create the Payload endpoint that exchanges Medusa SSO tokens for sessions. */
const createMedusaSsoPostEndpoint = (): Endpoint => ({
  path: '/medusa-sso',
  method: 'post',
  handler: async (req) => {
    const allowedOrigins = getAllowedOrigins()
    if (allowedOrigins.length > 0) {
      const origin = req.headers.get('origin')
      if (!origin || !allowedOrigins.includes(origin)) {
        throw new APIError('Origin is not allowed.', 403)
      }
    }

    const publicKey = process.env.PAYLOAD_SSO_PUBLIC_KEY
    if (!publicKey) {
      throw new APIError('Payload SSO is not configured.', 500)
    }

    if (!req.formData) {
      throw new APIError('Form data parsing is not available.', 400)
    }

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      throw new APIError('Invalid form data.', 400)
    }

    const getFormValue = (field: string) => {
      const value = formData.get(field)
      return typeof value === 'string' ? value : null
    }

    const token = getFormValue('token')
    if (!token) {
      throw new APIError('Missing SSO token.', 400)
    }

    const alg = process.env.PAYLOAD_SSO_ALG ?? DEFAULT_ALG
    const issuer = process.env.PAYLOAD_SSO_ISSUER ?? DEFAULT_ISSUER
    const audience = process.env.PAYLOAD_SSO_AUDIENCE ?? DEFAULT_AUDIENCE
    const key = await importSPKI(normalizeKey(publicKey), alg)

    let verifiedPayload: MedusaSsoToken | null = null
    try {
      const verified = await jwtVerify<MedusaSsoToken>(token, key, {
        issuer,
        audience,
        algorithms: [alg],
      })
      verifiedPayload = verified.payload
    } catch (error) {
      req?.payload?.logger?.warn?.({ err: error }, 'SSO token verification failed')
      throw new APIError('Invalid SSO token.', 401)
    }
    const email = verifiedPayload.email || verifiedPayload.sub
    if (!email) {
      throw new APIError('SSO token missing user email.', 400)
    }

    const adminCollectionSlug = req.payload.config.admin.user
    if (!hasCollectionSlug(req.payload.collections, adminCollectionSlug)) {
      throw new APIError('Payload admin collection is not configured.', 500)
    }
    const adminCollection = req.payload.collections[adminCollectionSlug]
    if (!adminCollection?.config?.auth) {
      throw new APIError('Payload admin collection is not configured.', 500)
    }

    const userResult = await req.payload.find({
      collection: adminCollectionSlug,
      where: {
        email: {
          equals: email,
        },
      },
      select: {
        id: true,
        email: true,
        sessions: true,
      },
      limit: 1,
      pagination: false,
      depth: 0,
      overrideAccess: true,
      req,
    })

    const user = userResult.docs[0] as AdminUser | undefined
    if (!user) {
      throw new APIError('SSO user not found.', 401)
    }

    let sid: string | undefined
    if (adminCollection.config.auth.useSessions) {
      sid = randomUUID()
      const now = new Date()
      const tokenExpiration = adminCollection.config.auth.tokenExpiration
      const expiresAt = new Date(now.getTime() + tokenExpiration * 1000)
      const existingSessions = Array.isArray(user.sessions)
        ? removeExpiredSessions(user.sessions as Session[]).slice(
            -Math.max(MAX_SESSIONS - 1, 0)
          )
        : []

      await req.payload.db.updateOne({
        id: user.id,
        collection: adminCollectionSlug,
        data: {
          ...user,
          sessions: [
            ...existingSessions,
            {
              id: sid,
              createdAt: now,
              expiresAt,
            },
          ],
          updatedAt: null,
        },
        req,
        returning: false,
      })
    }

    const { token: payloadToken } = await jwtSign({
      fieldsToSign: {
        collection: adminCollectionSlug,
        id: String(user.id),
        ...(sid ? { sid } : {}),
      },
      secret: req.payload.secret,
      tokenExpiration: adminCollection.config.auth.tokenExpiration,
    })

    const cookie = generatePayloadCookie({
      collectionAuthConfig: adminCollection.config.auth,
      cookiePrefix: req.payload.config.cookiePrefix,
      token: payloadToken,
    })

    const returnTo = getFormValue('returnTo')
    const redirectTo = sanitizeReturnTo(returnTo)
    const headers = headersWithCors({
      headers: new Headers({
        'Set-Cookie': cookie,
        Location: redirectTo,
      }),
      req,
    })

    return new Response(null, {
      status: 302,
      headers,
    })
  },
})

/** Shared instance of the Medusa SSO endpoint. */
export const medusaSsoPostEndpoint = createMedusaSsoPostEndpoint()
