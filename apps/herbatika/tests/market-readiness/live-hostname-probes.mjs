import { resolve4, resolve6, resolveCname } from "node:dns/promises"
import { request } from "node:https"
import { connect } from "node:tls"

const MAX_RESPONSE_BYTES = 512 * 1024
const CANONICAL_LINK_PATTERNS = Object.freeze([
  /<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/iu,
  /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["'][^>]*>/iu,
])

const ignoreMissingDns = async (operation) => {
  try {
    return await operation()
  } catch (error) {
    if (
      ["ENODATA", "ENOTFOUND", "ENOTIMP", "ESERVFAIL"].includes(error?.code)
    ) {
      return []
    }
    throw error
  }
}

export const collectDnsTargets = async (hostname) => {
  const [ipv4, ipv6, cnames] = await Promise.all([
    ignoreMissingDns(() => resolve4(hostname)),
    ignoreMissingDns(() => resolve6(hostname)),
    ignoreMissingDns(() => resolveCname(hostname)),
  ])
  return [
    ...new Set(
      [...ipv4, ...ipv6, ...cnames].map((value) => value.toLowerCase())
    ),
  ].sort()
}

export const classifyDnsAuthority = (
  targets,
  { candidateDnsTargets, legacyDnsTargets }
) => {
  const normalizedTargets = new Set(targets.map((value) => value.toLowerCase()))
  const candidate = candidateDnsTargets.some((value) =>
    normalizedTargets.has(value)
  )
  const legacy = legacyDnsTargets.some((value) => normalizedTargets.has(value))
  if (candidate === legacy) {
    throw new Error(
      `DNS targets do not resolve to exactly one authority: ${[...normalizedTargets].sort().join(",")}`
    )
  }
  return candidate ? "candidate-zane" : "legacy"
}

const certificateSubjectAltNames = (certificate) =>
  (certificate.subjectaltname ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.startsWith("DNS:"))
    .map((value) => value.slice(4).toLowerCase())
    .sort()

const certificateTimestamp = (value, label) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.valueOf())) {
    throw new Error(`Invalid TLS certificate ${label}`)
  }
  return parsed.toISOString()
}

export const probeCandidateTls = ({
  connectHost,
  hostname,
  port = 443,
  timeoutMs,
}) =>
  new Promise((resolve, reject) => {
    const socket = connect({
      host: connectHost,
      port,
      rejectUnauthorized: true,
      servername: hostname,
    })
    socket.setTimeout(timeoutMs)
    socket.once("timeout", () =>
      socket.destroy(new Error(`TLS timeout for ${hostname}`))
    )
    socket.once("error", reject)
    socket.once("secureConnect", () => {
      try {
        const certificate = socket.getPeerCertificate()
        resolve({
          authorized: socket.authorized,
          connectedTo: "candidate-zane",
          fingerprint256: certificate.fingerprint256,
          sniHostname: hostname,
          subjectAltNames: certificateSubjectAltNames(certificate),
          validFrom: certificateTimestamp(certificate.valid_from, "valid_from"),
          validTo: certificateTimestamp(certificate.valid_to, "valid_to"),
        })
      } catch (error) {
        reject(error)
      } finally {
        socket.destroy()
      }
    })
  })

const canonicalOriginFromHtml = (html) => {
  for (const pattern of CANONICAL_LINK_PATTERNS) {
    const match = pattern.exec(html)
    if (match?.[1]) {
      return new URL(match[1]).origin
    }
  }
  return null
}

export const probeCandidateHttp = ({
  connectHost,
  hostHeader,
  servername,
  timeoutMs,
}) =>
  new Promise((resolve, reject) => {
    const operation = request(
      {
        headers: { host: hostHeader },
        host: connectHost,
        method: "GET",
        path: "/",
        port: 443,
        rejectUnauthorized: true,
        servername,
      },
      (response) => {
        const chunks = []
        let size = 0
        response.on("data", (chunk) => {
          size += chunk.length
          if (size > MAX_RESPONSE_BYTES) {
            operation.destroy(
              new Error(`HTTP response too large for ${hostHeader}`)
            )
            return
          }
          chunks.push(chunk)
        })
        response.once("error", reject)
        response.once("end", () => {
          const body = Buffer.concat(chunks).toString("utf8")
          resolve({
            buildHash: response.headers["x-zane-dpl-hash"] ?? "",
            canonicalOrigin: canonicalOriginFromHtml(body),
            location: response.headers.location ?? null,
            slot: response.headers["x-zane-dpl-slot"] ?? "",
            status: response.statusCode ?? 0,
          })
        })
      }
    )
    operation.setTimeout(timeoutMs, () =>
      operation.destroy(new Error(`HTTP timeout for ${hostHeader}`))
    )
    operation.once("error", reject)
    operation.end()
  })
