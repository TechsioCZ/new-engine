import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import escapeHtml from "escape-html"
import { SignJWT, importPKCS8 } from "jose"
import { z } from "zod"
import { optionalStringParam } from "../../../../utils/query-params"

const DEFAULT_ISSUER = "medusa"
const DEFAULT_AUDIENCE = "payload"
const DEFAULT_ALG = "RS256"
const DEFAULT_TOKEN_TTL_SECONDS = 60

/** Query schema for the admin payload SSO endpoint. */
export const AdminPayloadSsoSchema = z.object({
  returnTo: optionalStringParam,
})

/** Parsed query type for the admin payload SSO endpoint. */
export type AdminPayloadSsoSchemaType = z.infer<typeof AdminPayloadSsoSchema>

/** Normalize multiline private keys loaded from environment variables. */
const normalizeKey = (value: string) => value.replace(/\\n/g, "\n").trim()

/** Allow only same-origin relative return paths to avoid open redirects. */
const sanitizeReturnTo = (value: string | undefined) => {
  if (!value) {
    return undefined
  }
  if (value.startsWith("/") && !value.startsWith("//")) {
    return value
  }
  return undefined
}

/** Admin API handler that issues an SSO token and auto-posts to Payload. */
export async function GET(
  req: MedusaRequest<unknown, AdminPayloadSsoSchemaType>,
  res: MedusaResponse
) {
  const privateKey = process.env.PAYLOAD_SSO_PRIVATE_KEY
  const payloadIframeUrl = process.env.PAYLOAD_IFRAME_URL
  const ssoEmail = process.env.PAYLOAD_SSO_USER_EMAIL
  const issuer = process.env.PAYLOAD_SSO_ISSUER ?? DEFAULT_ISSUER
  const audience = process.env.PAYLOAD_SSO_AUDIENCE ?? DEFAULT_AUDIENCE
  const alg = process.env.PAYLOAD_SSO_ALG ?? DEFAULT_ALG
  const ttl = (() => {
    const parsedTtl = parseInt(process.env.PAYLOAD_SSO_TOKEN_TTL ?? "", 10)
    return parsedTtl > 0 ? parsedTtl : DEFAULT_TOKEN_TTL_SECONDS
  })()

  if (!privateKey || !payloadIframeUrl || !ssoEmail) {
    return res.status(500).json({
      message:
        "Payload SSO is not configured. Check PAYLOAD_SSO_PRIVATE_KEY, PAYLOAD_IFRAME_URL, and PAYLOAD_SSO_USER_EMAIL.",
    })
  }

  const { returnTo } = req.validatedQuery
  const safeReturnTo = sanitizeReturnTo(returnTo)
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

  const token = await new SignJWT({ email: ssoEmail })
    .setProtectedHeader({ alg, typ: "JWT" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(ssoEmail)
    .sign(key)

  let redirectUrl: URL
  try {
    redirectUrl = new URL("/api/medusa-sso", payloadIframeUrl)
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
    <meta name="referrer" content="no-referrer" />
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
  res.setHeader("Referrer-Policy", "no-referrer")
  return res.status(200).send(html)
}
