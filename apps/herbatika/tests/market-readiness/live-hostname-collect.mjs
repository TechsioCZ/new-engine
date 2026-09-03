// Read-only collector: DNS resolution, TLS handshakes, and HTTP GET probes only.
// biome-ignore-all lint/suspicious/noMisplacedAssertion: CLI assertions validate read-only collector inputs and output
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import {
  canonicalJson,
  sha256,
  writePrivateJsonNoClobber,
} from "./gate-core.mjs"
import {
  classifyDnsAuthority,
  collectDnsTargets,
  probeCandidateHttp,
  probeCandidateTls,
} from "./live-hostname-probes.mjs"
import {
  assertLiveHostnameReadiness,
  buildLiveHostnameReadiness,
  FOUR_MARKET_HOSTS,
} from "./live-hostname-readiness.mjs"

const parseArguments = (values) => {
  const options = { timeoutMs: 30_000 }
  for (let index = 0; index < values.length; index += 2) {
    const name = values[index]
    const value = values[index + 1]
    if (!(name?.startsWith("--") && value && !value.startsWith("--"))) {
      throw new Error(`Unknown or incomplete option: ${name ?? "<missing>"}`)
    }
    if (name === "--config") {
      options.config = value
    } else if (name === "--output") {
      options.output = value
    } else if (name === "--timeout-ms") {
      options.timeoutMs = Number(value)
    } else {
      throw new Error(`Unknown option: ${name}`)
    }
  }
  assert.ok(
    options.config && options.output,
    "--config and --output are required"
  )
  assert.ok(
    Number.isSafeInteger(options.timeoutMs) && options.timeoutMs > 0,
    "--timeout-ms"
  )
  return options
}

const exactKeys = (value, keys, label) => {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), label)
  assert.deepEqual(
    Object.keys(value).sort(),
    [...keys].sort(),
    `${label}: keys`
  )
  return value
}

const parseCollectorConfig = (value) => {
  exactKeys(
    value,
    [
      "candidateConnectHost",
      "candidateDnsTargets",
      "legacyDnsTargets",
      "releaseIdentity",
      "runtimeMarkets",
      "schemaVersion",
      "zane",
    ],
    "collector config"
  )
  assert.equal(value.schemaVersion, 1, "collector config schemaVersion")
  assert.ok(
    typeof value.candidateConnectHost === "string" &&
      value.candidateConnectHost.trim() === value.candidateConnectHost &&
      value.candidateConnectHost.length > 0,
    "candidateConnectHost"
  )
  for (const field of ["candidateDnsTargets", "legacyDnsTargets"]) {
    assert.ok(Array.isArray(value[field]) && value[field].length > 0, field)
    value[field] = value[field].map((target, index) => {
      assert.equal(typeof target, "string", `${field}[${index}]`)
      assert.equal(target, target.trim().toLowerCase(), `${field}[${index}]`)
      return target
    })
    assert.equal(
      new Set(value[field]).size,
      value[field].length,
      `${field}: duplicate`
    )
  }
  assert.equal(
    value.candidateDnsTargets.some((target) =>
      value.legacyDnsTargets.includes(target)
    ),
    false,
    "candidate and legacy DNS targets must be disjoint"
  )
  return value
}

const dnsSnapshot = async (hostnames, knownAuthorityTargets) =>
  Object.fromEntries(
    await Promise.all(
      hostnames.map(async (hostname) => {
        const targets = await collectDnsTargets(hostname)
        return [
          hostname,
          {
            authority: classifyDnsAuthority(targets, knownAuthorityTargets),
            targets,
          },
        ]
      })
    )
  )

const options = parseArguments(process.argv.slice(2))
const config = parseCollectorConfig(
  JSON.parse(await readFile(options.config, "utf8"))
)
const hosts = Object.values(FOUR_MARKET_HOSTS).flatMap(
  ({ apex, preview, www }) => [apex, www, preview]
)
const authorityTargets = {
  candidateDnsTargets: config.candidateDnsTargets,
  legacyDnsTargets: config.legacyDnsTargets,
}
const dnsBefore = await dnsSnapshot(hosts, authorityTargets)
const hostProbes = Object.fromEntries(
  await Promise.all(
    hosts.map(async (hostname) => {
      const [tls, http] = await Promise.all([
        probeCandidateTls({
          connectHost: config.candidateConnectHost,
          hostname,
          timeoutMs: options.timeoutMs,
        }),
        probeCandidateHttp({
          connectHost: config.candidateConnectHost,
          hostHeader: hostname,
          servername: hostname,
          timeoutMs: options.timeoutMs,
        }),
      ])
      return [
        hostname,
        {
          http: {
            canonicalOrigin: http.canonicalOrigin,
            connectedTo: "candidate-zane",
            identity: {
              ...config.releaseIdentity,
              buildHash: http.buildHash,
              slot: http.slot,
            },
            location: http.location,
            status: http.status,
          },
          tls,
        },
      ]
    })
  )
)
const unknownHostProbes = Object.fromEntries(
  await Promise.all(
    Object.entries(FOUR_MARKET_HOSTS).map(async ([market, { apex }]) => {
      const host = `unroutable-${market}.invalid`
      const result = await probeCandidateHttp({
        connectHost: config.candidateConnectHost,
        hostHeader: host,
        servername: apex,
        timeoutMs: options.timeoutMs,
      })
      return [
        market,
        { connectedTo: "candidate-zane", host, status: result.status },
      ]
    })
  )
)
const dnsAfter = await dnsSnapshot(hosts, authorityTargets)
const markets = Object.fromEntries(
  Object.entries(FOUR_MARKET_HOSTS).map(([market, marketHosts]) => [
    market,
    Object.fromEntries(
      ["apex", "www", "preview"].map((role) => {
        const hostname = marketHosts[role]
        return [
          role,
          {
            dnsAfter: dnsAfter[hostname],
            dnsBefore: dnsBefore[hostname],
            ...hostProbes[hostname],
          },
        ]
      })
    ),
  ])
)
const report = buildLiveHostnameReadiness({
  capturedAt: new Date().toISOString(),
  markets,
  releaseIdentity: config.releaseIdentity,
  runtimeMarkets: config.runtimeMarkets,
  unknownHostProbes,
  zane: config.zane,
})
assertLiveHostnameReadiness(report)
await writePrivateJsonNoClobber(options.output, report)
console.log(
  `Four-market hostname readiness passed: ${sha256(`${canonicalJson(report)}\n`)}`
)
