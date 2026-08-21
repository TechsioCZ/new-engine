import assert from "node:assert/strict"
import { mkdtemp, readFile, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { writePrivateJsonNoClobber } from "./gate-core.mjs"
import { classifyDnsAuthority } from "./live-hostname-probes.mjs"
import {
  assertLiveHostnameReadiness,
  buildLiveHostnameReadiness,
  FOUR_MARKET_HOSTS,
  LIVE_HOSTNAME_READINESS_KIND,
} from "./live-hostname-readiness.mjs"

const CAPTURED_AT = "2026-08-21T12:00:00.000Z"
const WWW_PREFIX_PATTERN = /^www\./u
const PREVIEW_HOST_PATTERN =
  /^test-engine-herbatika(?:-(?:cz|hu|ro))?-zane\.web-revolution\.cz$/u
const IDENTITY = Object.freeze({
  buildHash: "candidate-build-hash",
  deploymentId: "dpl_dkr_candidate",
  releaseSha: "a".repeat(40),
  slot: "green",
})
const FINGERPRINT = Array.from({ length: 32 }, () => "AA").join(":")

const clone = (value) => structuredClone(value)

const hostObservation = ({ hostname, role }) => {
  const apex = hostname
    .replace(WWW_PREFIX_PATTERN, "")
    .replace(PREVIEW_HOST_PATTERN, () => {
      const market = Object.entries(FOUR_MARKET_HOSTS).find(
        ([, hosts]) => hosts.preview === hostname
      )?.[0]
      return FOUR_MARKET_HOSTS[market].apex
    })
  const dns = {
    authority: role === "preview" ? "candidate-zane" : "legacy",
    targets:
      role === "preview"
        ? ["203.0.113.40", "zane-edge.example.net"]
        : ["192.0.2.20", "legacy-edge.example.net"],
  }
  return {
    dnsAfter: clone(dns),
    dnsBefore: clone(dns),
    http: {
      canonicalOrigin: role === "www" ? null : `https://${apex}`,
      connectedTo: "candidate-zane",
      identity: clone(IDENTITY),
      location: role === "www" ? `https://${apex}/` : null,
      status: role === "www" ? 308 : 200,
    },
    tls: {
      authorized: true,
      connectedTo: "candidate-zane",
      fingerprint256: FINGERPRINT,
      sniHostname: hostname,
      subjectAltNames: [hostname],
      validFrom: "2026-08-01T00:00:00.000Z",
      validTo: "2026-11-01T00:00:00.000Z",
    },
  }
}

const fixture = () => {
  const markets = {}
  const runtimeMarkets = {}
  const unknownHostProbes = {}
  const routes = []
  for (const [market, hosts] of Object.entries(FOUR_MARKET_HOSTS)) {
    runtimeMarkets[market] = {
      acceptedHosts: [hosts.apex, hosts.www, hosts.preview],
      origin: `https://${hosts.apex}`,
    }
    markets[market] = Object.fromEntries(
      ["apex", "www", "preview"].map((role) => [
        role,
        hostObservation({ hostname: hosts[role], role }),
      ])
    )
    unknownHostProbes[market] = {
      connectedTo: "candidate-zane",
      host: `unroutable-${market}.invalid`,
      status: 421,
    }
    routes.push(
      ...[hosts.apex, hosts.www, hosts.preview].map((hostname) => ({
        basePath: "/",
        hostname,
        port: 3000,
        serviceId: "srv_dkr_herbatika",
        stripPrefix: true,
      }))
    )
  }
  return {
    capturedAt: CAPTURED_AT,
    markets,
    releaseIdentity: clone(IDENTITY),
    runtimeMarkets,
    unknownHostProbes,
    zane: {
      identity: clone(IDENTITY),
      routes,
      serviceId: "srv_dkr_herbatika",
      serviceSlug: "herbatika",
    },
  }
}

const issueCodes = (report) => report.issues.map(({ code }) => code)

test("collects exact four-market hostname readiness without clobbering legacy canonical DNS", () => {
  const report = buildLiveHostnameReadiness(fixture())

  assert.equal(report.kind, LIVE_HOSTNAME_READINESS_KIND)
  assert.equal(report.ready, true)
  assert.deepEqual(report.issues, [])
  assert.equal(report.noClobber.dnsUnchanged, true)
  assert.equal(
    report.noClobber.dnsBeforeSha256,
    report.noClobber.dnsAfterSha256
  )
  assert.equal(report.zane.routeCount, 12)
  for (const market of Object.keys(FOUR_MARKET_HOSTS)) {
    assert.equal(
      report.markets[market].observations.apex.dnsAfter.authority,
      "legacy"
    )
    assert.equal(
      report.markets[market].observations.preview.dnsAfter.authority,
      "candidate-zane"
    )
    assert.equal(report.markets[market].unknownHostProbe.status, 421)
  }
  assert.equal(assertLiveHostnameReadiness(report), report)
})

test("rejects non-canonical accepted-host ordering and wrong www redirect policy", () => {
  const input = fixture()
  input.runtimeMarkets.cz.acceptedHosts.reverse()
  input.markets.hu.www.http.location = "https://herbatica.hu/wrong"

  const codes = issueCodes(buildLiveHostnameReadiness(input))
  assert.ok(codes.includes("accepted_hosts_mismatch"))
  assert.ok(codes.includes("www_redirect_mismatch"))
})

test("rejects TLS/SNI, Host 421, and candidate identity drift", () => {
  const input = fixture()
  input.markets.ro.apex.tls.sniHostname = "herbatica.sk"
  input.unknownHostProbes.sk.status = 200
  input.markets.cz.preview.http.identity.slot = "blue"
  input.zane.identity.releaseSha = "b".repeat(40)

  const codes = issueCodes(buildLiveHostnameReadiness(input))
  assert.ok(codes.includes("tls_sni_mismatch"))
  assert.ok(codes.includes("unknown_host_not_421"))
  assert.ok(codes.includes("http_identity_mismatch"))
  assert.ok(codes.includes("zane_identity_mismatch"))
})

test("rejects DNS clobber, preview legacy routing, and malformed Zane routes", () => {
  const input = fixture()
  input.markets.sk.apex.dnsAfter.targets = ["203.0.113.40"]
  input.markets.hu.preview.dnsAfter.authority = "legacy"
  input.markets.hu.preview.dnsBefore.authority = "legacy"
  input.zane.routes.find(
    ({ hostname }) => hostname === FOUR_MARKET_HOSTS.ro.preview
  ).port = 8080

  const report = buildLiveHostnameReadiness(input)
  const codes = issueCodes(report)
  assert.equal(report.noClobber.dnsUnchanged, false)
  assert.ok(codes.includes("dns_clobber_detected"))
  assert.ok(codes.includes("preview_dns_not_candidate"))
  assert.ok(codes.includes("zane_route_mismatch"))
})

test("writes canonical private evidence once and refuses clobber", async () => {
  const directory = await mkdtemp(join(tmpdir(), "hostname-readiness-"))
  const output = join(directory, "hostname-readiness.json")
  const report = buildLiveHostnameReadiness(fixture())

  await writePrivateJsonNoClobber(output, report)
  const bytes = await readFile(output, "utf8")
  assert.equal(bytes.endsWith("\n"), true)
  assert.deepEqual(JSON.parse(bytes), report)
  // biome-ignore lint/suspicious/noBitwiseOperators: POSIX permission masks are bit fields
  assert.equal((await stat(output)).mode & 0o777, 0o600)
  await assert.rejects(
    writePrivateJsonNoClobber(output, report),
    (error) => error?.code === "EEXIST"
  )
})

test("derives legacy and candidate DNS authority and rejects mixed targets", () => {
  const authorities = {
    candidateDnsTargets: ["203.0.113.40", "zane-edge.example.net"],
    legacyDnsTargets: ["192.0.2.20", "legacy-edge.example.net"],
  }
  assert.equal(
    classifyDnsAuthority(["203.0.113.40"], authorities),
    "candidate-zane"
  )
  assert.equal(
    classifyDnsAuthority(["legacy-edge.example.net"], authorities),
    "legacy"
  )
  assert.throws(() =>
    classifyDnsAuthority(
      ["203.0.113.40", "legacy-edge.example.net"],
      authorities
    )
  )
})
