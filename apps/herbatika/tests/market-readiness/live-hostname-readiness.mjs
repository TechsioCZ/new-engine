// biome-ignore-all lint/suspicious/noMisplacedAssertion: collector contract assertions validate runtime evidence outside a test callback
import assert from "node:assert/strict"
import { canonicalJson, normalizeHost, sha256 } from "./gate-core.mjs"

export const LIVE_HOSTNAME_READINESS_KIND =
  "herbatika-four-market-hostname-readiness"

export const FOUR_MARKET_HOSTS = Object.freeze({
  sk: Object.freeze({
    apex: "herbatica.sk",
    preview: "test-engine-herbatika-zane.web-revolution.cz",
    www: "www.herbatica.sk",
  }),
  cz: Object.freeze({
    apex: "herbatica.cz",
    preview: "test-engine-herbatika-cz-zane.web-revolution.cz",
    www: "www.herbatica.cz",
  }),
  hu: Object.freeze({
    apex: "herbatica.hu",
    preview: "test-engine-herbatika-hu-zane.web-revolution.cz",
    www: "www.herbatica.hu",
  }),
  ro: Object.freeze({
    apex: "herbatica.ro",
    preview: "test-engine-herbatika-ro-zane.web-revolution.cz",
    www: "www.herbatica.ro",
  }),
})

const MARKETS = Object.freeze(Object.keys(FOUR_MARKET_HOSTS))
const HOST_ROLES = Object.freeze(["apex", "www", "preview"])
const SHA_PATTERN = /^[a-f0-9]{40}$/
const FINGERPRINT_PATTERN = /^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/
const SLOT_PATTERN = /^(?:blue|green)$/

const exactKeys = (value, keys, label) => {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), label)
  assert.deepEqual(
    Object.keys(value).sort(),
    [...keys].sort(),
    `${label}: keys`
  )
  return value
}

const timestamp = (value, label) => {
  assert.equal(typeof value, "string", label)
  const parsed = new Date(value)
  assert.ok(!Number.isNaN(parsed.valueOf()), label)
  assert.equal(parsed.toISOString(), value, label)
  return value
}

const normalizedStrings = (values, label) => {
  assert.ok(Array.isArray(values), label)
  const normalized = values.map((value, index) => {
    assert.equal(typeof value, "string", `${label}[${index}]`)
    assert.equal(value, value.trim().toLowerCase(), `${label}[${index}]`)
    assert.ok(value.length > 0, `${label}[${index}]`)
    return value
  })
  assert.equal(
    new Set(normalized).size,
    normalized.length,
    `${label}: duplicate`
  )
  return normalized.sort()
}

const identity = (value, label) => {
  exactKeys(value, ["buildHash", "deploymentId", "releaseSha", "slot"], label)
  for (const field of ["buildHash", "deploymentId"]) {
    assert.ok(
      typeof value[field] === "string" && value[field].trim().length > 0,
      `${label}.${field}`
    )
  }
  assert.match(value.releaseSha, SHA_PATTERN, `${label}.releaseSha`)
  assert.match(value.slot, SLOT_PATTERN, `${label}.slot`)
  return value
}

const sameIdentity = (actual, expected) =>
  ["buildHash", "deploymentId", "releaseSha", "slot"].every(
    (field) => actual[field] === expected[field]
  )

const subjectAltNameCovers = (subjectAltName, hostname) => {
  if (subjectAltName === hostname) {
    return true
  }
  if (!subjectAltName.startsWith("*.")) {
    return false
  }
  const suffix = subjectAltName.slice(2)
  return (
    hostname.endsWith(`.${suffix}`) &&
    hostname.split(".").length === suffix.split(".").length + 1
  )
}

const issue = (issues, code, detail) => {
  issues.push({ code, detail })
}

const parseDns = (value, label) => {
  exactKeys(value, ["authority", "targets"], label)
  assert.ok(
    ["candidate-zane", "legacy"].includes(value.authority),
    `${label}.authority`
  )
  return {
    authority: value.authority,
    targets: normalizedStrings(value.targets, `${label}.targets`),
  }
}

const parseTls = (value, label) => {
  exactKeys(
    value,
    [
      "authorized",
      "connectedTo",
      "fingerprint256",
      "sniHostname",
      "subjectAltNames",
      "validFrom",
      "validTo",
    ],
    label
  )
  assert.equal(typeof value.authorized, "boolean", `${label}.authorized`)
  assert.equal(value.connectedTo, "candidate-zane", `${label}.connectedTo`)
  assert.match(
    value.fingerprint256,
    FINGERPRINT_PATTERN,
    `${label}.fingerprint256`
  )
  const sniHostname = normalizeHost(value.sniHostname, `${label}.sniHostname`)
  const subjectAltNames = normalizedStrings(
    value.subjectAltNames,
    `${label}.subjectAltNames`
  )
  return {
    ...value,
    sniHostname,
    subjectAltNames,
    validFrom: timestamp(value.validFrom, `${label}.validFrom`),
    validTo: timestamp(value.validTo, `${label}.validTo`),
  }
}

const parseHttp = (value, label) => {
  exactKeys(
    value,
    ["canonicalOrigin", "connectedTo", "identity", "location", "status"],
    label
  )
  assert.equal(value.connectedTo, "candidate-zane", `${label}.connectedTo`)
  assert.ok(Number.isSafeInteger(value.status), `${label}.status`)
  assert.ok(
    value.location === null || typeof value.location === "string",
    `${label}.location`
  )
  assert.ok(
    value.canonicalOrigin === null || typeof value.canonicalOrigin === "string",
    `${label}.canonicalOrigin`
  )
  return { ...value, identity: identity(value.identity, `${label}.identity`) }
}

const parseHostObservation = (value, label) => {
  exactKeys(value, ["dnsAfter", "dnsBefore", "http", "tls"], label)
  return {
    dnsAfter: parseDns(value.dnsAfter, `${label}.dnsAfter`),
    dnsBefore: parseDns(value.dnsBefore, `${label}.dnsBefore`),
    http: parseHttp(value.http, `${label}.http`),
    tls: parseTls(value.tls, `${label}.tls`),
  }
}

const expectedHosts = (market) => {
  const hosts = FOUR_MARKET_HOSTS[market]
  return [hosts.apex, hosts.www, hosts.preview]
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: the explicit evidence matrix keeps twelve host contracts auditable in one fail-closed boundary
export const buildLiveHostnameReadiness = (input) => {
  exactKeys(
    input,
    [
      "capturedAt",
      "markets",
      "releaseIdentity",
      "runtimeMarkets",
      "unknownHostProbes",
      "zane",
    ],
    "hostname readiness input"
  )
  const capturedAt = timestamp(input.capturedAt, "capturedAt")
  const releaseIdentity = identity(input.releaseIdentity, "releaseIdentity")
  const issues = []
  exactKeys(input.runtimeMarkets, MARKETS, "runtimeMarkets")
  exactKeys(input.markets, MARKETS, "markets")
  exactKeys(input.unknownHostProbes, MARKETS, "unknownHostProbes")
  exactKeys(
    input.zane,
    ["identity", "routes", "serviceId", "serviceSlug"],
    "zane"
  )
  assert.equal(input.zane.serviceSlug, "herbatika", "zane.serviceSlug")
  assert.ok(input.zane.serviceId, "zane.serviceId")
  const zaneIdentity = identity(input.zane.identity, "zane.identity")
  if (!sameIdentity(zaneIdentity, releaseIdentity)) {
    issue(
      issues,
      "zane_identity_mismatch",
      "Zane identity differs from candidate"
    )
  }
  assert.ok(Array.isArray(input.zane.routes), "zane.routes")
  const routes = input.zane.routes.map((route, index) => {
    exactKeys(
      route,
      ["basePath", "hostname", "port", "serviceId", "stripPrefix"],
      `zane.routes[${index}]`
    )
    return {
      ...route,
      hostname: normalizeHost(route.hostname, `zane.routes[${index}].hostname`),
    }
  })
  const allExpectedHosts = MARKETS.flatMap(expectedHosts)
  for (const hostname of allExpectedHosts) {
    const matches = routes.filter((route) => route.hostname === hostname)
    if (
      matches.length !== 1 ||
      matches[0]?.serviceId !== input.zane.serviceId ||
      matches[0]?.port !== 3000 ||
      matches[0]?.basePath !== "/" ||
      matches[0]?.stripPrefix !== true
    ) {
      issue(
        issues,
        "zane_route_mismatch",
        `${hostname} must have one Herbatika / → 3000 strip-prefix route`
      )
    }
  }
  for (const route of routes) {
    if (!allExpectedHosts.includes(route.hostname)) {
      issue(issues, "unexpected_zane_route", route.hostname)
    }
  }

  const markets = {}
  for (const market of MARKETS) {
    const hosts = FOUR_MARKET_HOSTS[market]
    const runtime = input.runtimeMarkets[market]
    exactKeys(runtime, ["acceptedHosts", "origin"], `runtimeMarkets.${market}`)
    const acceptedHosts = runtime.acceptedHosts.map((host, index) =>
      normalizeHost(host, `runtimeMarkets.${market}.acceptedHosts[${index}]`)
    )
    if (canonicalJson(acceptedHosts) !== canonicalJson(expectedHosts(market))) {
      issue(
        issues,
        "accepted_hosts_mismatch",
        `${market} accepted hosts must be canonical-first apex,www,preview`
      )
    }
    if (runtime.origin !== `https://${hosts.apex}`) {
      issue(issues, "canonical_origin_mismatch", market)
    }
    exactKeys(input.markets[market], HOST_ROLES, `markets.${market}`)
    const observations = {}
    for (const role of HOST_ROLES) {
      const hostname = hosts[role]
      const observation = parseHostObservation(
        input.markets[market][role],
        `markets.${market}.${role}`
      )
      observations[role] = { hostname, ...observation }
      if (
        observation.dnsBefore.targets.length === 0 ||
        observation.dnsAfter.targets.length === 0
      ) {
        issue(issues, "dns_unresolved", hostname)
      }
      if (
        canonicalJson(observation.dnsBefore) !==
        canonicalJson(observation.dnsAfter)
      ) {
        issue(issues, "dns_clobber_detected", hostname)
      }
      if (
        role === "preview" &&
        observation.dnsAfter.authority !== "candidate-zane"
      ) {
        issue(issues, "preview_dns_not_candidate", hostname)
      }
      if (
        !observation.tls.authorized ||
        observation.tls.sniHostname !== hostname ||
        !observation.tls.subjectAltNames.some((subjectAltName) =>
          subjectAltNameCovers(subjectAltName, hostname)
        ) ||
        new Date(observation.tls.validFrom) > new Date(capturedAt) ||
        new Date(observation.tls.validTo) <= new Date(capturedAt)
      ) {
        issue(issues, "tls_sni_mismatch", hostname)
      }
      if (!sameIdentity(observation.http.identity, releaseIdentity)) {
        issue(issues, "http_identity_mismatch", hostname)
      }
      if (role === "www") {
        if (
          ![301, 308].includes(observation.http.status) ||
          observation.http.location !== `https://${hosts.apex}/` ||
          observation.http.canonicalOrigin !== null
        ) {
          issue(issues, "www_redirect_mismatch", hostname)
        }
      } else if (
        observation.http.status !== 200 ||
        observation.http.location !== null ||
        observation.http.canonicalOrigin !== `https://${hosts.apex}`
      ) {
        issue(issues, "canonical_http_mismatch", hostname)
      }
    }
    const unknownProbe = input.unknownHostProbes[market]
    exactKeys(
      unknownProbe,
      ["connectedTo", "host", "status"],
      `unknownHostProbes.${market}`
    )
    normalizeHost(unknownProbe.host, `unknownHostProbes.${market}.host`)
    if (
      unknownProbe.connectedTo !== "candidate-zane" ||
      unknownProbe.status !== 421 ||
      allExpectedHosts.includes(unknownProbe.host)
    ) {
      issue(issues, "unknown_host_not_421", market)
    }
    markets[market] = {
      acceptedHosts,
      canonicalHost: hosts.apex,
      observations,
      origin: runtime.origin,
      unknownHostProbe: unknownProbe,
    }
  }

  const dnsBefore = Object.fromEntries(
    MARKETS.flatMap((market) =>
      HOST_ROLES.map((role) => {
        const item = markets[market].observations[role]
        return [item.hostname, item.dnsBefore]
      })
    )
  )
  const dnsAfter = Object.fromEntries(
    MARKETS.flatMap((market) =>
      HOST_ROLES.map((role) => {
        const item = markets[market].observations[role]
        return [item.hostname, item.dnsAfter]
      })
    )
  )
  return {
    capturedAt,
    issues,
    kind: LIVE_HOSTNAME_READINESS_KIND,
    markets,
    noClobber: {
      canonicalDnsMayRemainLegacy: true,
      dnsAfterSha256: sha256(canonicalJson(dnsAfter)),
      dnsBeforeSha256: sha256(canonicalJson(dnsBefore)),
      dnsUnchanged: canonicalJson(dnsBefore) === canonicalJson(dnsAfter),
    },
    ready: issues.length === 0,
    releaseIdentity,
    schemaVersion: 1,
    zane: {
      identity: zaneIdentity,
      routeCount: routes.length,
      routes: routes.sort((left, right) =>
        left.hostname.localeCompare(right.hostname, "en")
      ),
      serviceId: input.zane.serviceId,
      serviceSlug: input.zane.serviceSlug,
    },
  }
}

export const assertLiveHostnameReadiness = (value) => {
  exactKeys(
    value,
    [
      "capturedAt",
      "issues",
      "kind",
      "markets",
      "noClobber",
      "ready",
      "releaseIdentity",
      "schemaVersion",
      "zane",
    ],
    "hostname readiness"
  )
  assert.equal(value.kind, LIVE_HOSTNAME_READINESS_KIND)
  assert.equal(value.schemaVersion, 1)
  assert.equal(value.ready, true)
  assert.deepEqual(value.issues, [])
  assert.equal(value.noClobber.dnsUnchanged, true)
  exactKeys(value.markets, MARKETS, "hostname readiness markets")
  return value
}
