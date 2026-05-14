import type {
  AuthContext,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import escapeHtml from "escape-html"
import { importPKCS8, SignJWT } from "jose"
import { optionalStringParam } from "../../../../utils/query-params"

const DEFAULT_ISSUER = "medusa"
const DEFAULT_AUDIENCE = "payload"
const DEFAULT_ALG = "RS256"
const DEFAULT_TOKEN_TTL_SECONDS = 60
const LOCAL_PAYLOAD_PORT = "8083"
const LOCAL_PAYLOAD_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "admin.payload.medusa.localhost",
])

/** Query schema for the admin payload SSO endpoint. */
export const AdminPayloadSsoSchema = z.object({
  returnTo: optionalStringParam,
})

/** Parsed query type for the admin payload SSO endpoint. */
export type AdminPayloadSsoSchemaType = z.infer<typeof AdminPayloadSsoSchema>

type AdminUserAuthContext = Pick<AuthContext, "actor_id" | "actor_type">

/** Normalize multiline private keys loaded from environment variables. */
const normalizeKey = (value: string) => value.replace(/\\n/g, "\n").trim()

/** Allow only same-origin relative return paths to avoid open redirects. */
const sanitizeReturnTo = (value: string | undefined) => {
  if (!value) {
    return
  }
  if (value.startsWith("/") && !value.startsWith("//")) {
    return value
  }
  throw new Error("returnTo must be a same-origin relative path.")
}

const resolveSafeReturnTo = (value: string | undefined) => {
  try {
    return {
      value: sanitizeReturnTo(value),
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid returnTo.",
    }
  }
}

/** Read a request header from Medusa's underlying Express request. */
const getRequestHeader = (
  req: MedusaRequest<unknown, AdminPayloadSsoSchemaType>,
  name: string
) => {
  const header = req.headers?.[name.toLowerCase()]
  if (Array.isArray(header)) {
    return header[0]
  }
  return typeof header === "string" ? header : undefined
}

/** Extract the hostname from an HTTP Host-style header. */
const getHostname = (host: string | undefined) => {
  if (!host) {
    return
  }

  try {
    return new URL(`http://${host}`).hostname.toLowerCase()
  } catch {
    return
  }
}

/**
 * Keep local iframe SSO same-site with the Medusa admin host.
 *
 * Browsers may reject the Payload session cookie in an iframe when Medusa is
 * opened through one local host but the SSO form posts to another. Only known
 * local development hosts are rewritten.
 */
const resolvePayloadSsoUrl = (
  payloadIframeUrl: string,
  req: MedusaRequest<unknown, AdminPayloadSsoSchemaType>
) => {
  const url = new URL(payloadIframeUrl)
  if (!(url.protocol === "http:" || url.protocol === "https:")) {
    throw new Error("PAYLOAD_IFRAME_URL must use http or https.")
  }

  const forwardedHost = getRequestHeader(req, "x-forwarded-host")
  const host = getRequestHeader(req, "host")
  const requestHostname = getHostname(forwardedHost ?? host)

  if (LOCAL_PAYLOAD_HOSTS.has(url.hostname) && requestHostname) {
    if (requestHostname === "localhost" || requestHostname === "127.0.0.1") {
      url.protocol = "http:"
      url.hostname = requestHostname
      url.port = url.port || LOCAL_PAYLOAD_PORT
    }

    if (requestHostname === "admin.medusa.localhost") {
      url.protocol = "https:"
      url.hostname = "admin.payload.medusa.localhost"
      url.port = ""
    }
  }

  return new URL("/api/medusa-sso", url)
}

const getAdminUserAuthContext = (
  req: MedusaRequest<unknown, AdminPayloadSsoSchemaType>
) => {
  const authContext: unknown =
    "auth_context" in req ? req.auth_context : undefined

  if (!isAdminUserAuthContext(authContext)) {
    return null
  }

  return authContext
}

function isAdminUserAuthContext(value: unknown): value is AdminUserAuthContext {
  if (!value || typeof value !== "object") {
    return false
  }

  const actorId: unknown = "actor_id" in value ? value.actor_id : undefined
  const actorType: unknown =
    "actor_type" in value ? value.actor_type : undefined

  if (typeof actorId !== "string" || actorId.length === 0) {
    return false
  }

  return actorType === "user"
}

/** Admin API handler that issues an SSO token and auto-posts to Payload. */
export async function GET(
  req: MedusaRequest<unknown, AdminPayloadSsoSchemaType>,
  res: MedusaResponse
) {
  const adminAuthContext = getAdminUserAuthContext(req)
  if (!adminAuthContext) {
    return res.status(401).json({
      message: "Payload SSO requires an authenticated Medusa admin user.",
    })
  }

  const privateKey = process.env.PAYLOAD_SSO_PRIVATE_KEY
  const payloadIframeUrl = process.env.PAYLOAD_IFRAME_URL
  const ssoEmail = process.env.PAYLOAD_SSO_USER_EMAIL
  const issuer = process.env.PAYLOAD_SSO_ISSUER ?? DEFAULT_ISSUER
  const audience = process.env.PAYLOAD_SSO_AUDIENCE ?? DEFAULT_AUDIENCE
  const alg = process.env.PAYLOAD_SSO_ALG ?? DEFAULT_ALG
  const ttl = (() => {
    const parsedTtl = Number.parseInt(
      process.env.PAYLOAD_SSO_TOKEN_TTL ?? "",
      10
    )
    return parsedTtl > 0 ? parsedTtl : DEFAULT_TOKEN_TTL_SECONDS
  })()

  if (!(privateKey && payloadIframeUrl && ssoEmail)) {
    return res.status(500).json({
      message:
        "Payload SSO is not configured. Check PAYLOAD_SSO_PRIVATE_KEY, PAYLOAD_IFRAME_URL, and PAYLOAD_SSO_USER_EMAIL.",
    })
  }

  const { returnTo } = req.validatedQuery
  const safeReturnToResult = resolveSafeReturnTo(returnTo)
  if (safeReturnToResult.error) {
    return res.status(400).json({ message: safeReturnToResult.error })
  }
  const safeReturnTo = safeReturnToResult.value

  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + ttl
  let key: CryptoKey
  try {
    key = await importPKCS8(normalizeKey(privateKey), alg)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return res.status(500).json({
      message: `Invalid PAYLOAD_SSO_PRIVATE_KEY: ${message}`,
    })
  }

  const token = await new SignJWT({
    email: ssoEmail,
    medusa_actor_id: adminAuthContext.actor_id,
    medusa_actor_type: adminAuthContext.actor_type,
    payload_sso_mode: "shared-configured-user",
  })
    .setProtectedHeader({ alg, typ: "JWT" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(ssoEmail)
    .sign(key)

  let redirectUrl: URL
  try {
    redirectUrl = resolvePayloadSsoUrl(payloadIframeUrl, req)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Invalid PAYLOAD_IFRAME_URL:", payloadIframeUrl, message)
    return res.status(503).json({
      message: "PAYLOAD_IFRAME_URL is invalid. Please provide an absolute URL.",
    })
  }
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="cache-control" content="no-store" />
    <meta name="referrer" content="origin" />
    <meta name="color-scheme" content="dark" />
    <style>
      :root {
        color-scheme: dark;
        background: rgb(20, 20, 20);
      }

      html,
      body {
        min-height: 100%;
        margin: 0;
        background: rgb(20, 20, 20);
      }

      form {
        display: none;
      }
    </style>
    <title>Signing in…</title>
  </head>
  <body onload="document.forms[0].submit()">
    <form method="POST" action="${escapeHtml(redirectUrl.toString())}">
      <input type="hidden" name="token" value="${escapeHtml(token)}" />
      ${
        safeReturnTo
          ? `<input type="hidden" name="returnTo" value="${escapeHtml(safeReturnTo)}" />`
          : ""
      }
    </form>
  </body>
</html>`

  res.setHeader("Content-Type", "text/html; charset=utf-8")
  res.setHeader("Cache-Control", "no-store")
  res.setHeader("Referrer-Policy", "origin")
  return res.status(200).send(html)
}
