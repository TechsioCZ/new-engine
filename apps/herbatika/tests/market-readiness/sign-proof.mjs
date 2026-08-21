// biome-ignore-all lint/suspicious/noMisplacedAssertion: proof assertions are invoked by the CLI and node:test cases
import assert from "node:assert/strict"
import { createHmac, timingSafeEqual } from "node:crypto"
import { readFile } from "node:fs/promises"
import { pathToFileURL } from "node:url"
import {
  canonicalJson,
  sha256,
  writePrivateJsonNoClobber,
} from "./gate-core.mjs"

export const SIGNATURE_DOMAIN = "herbatika:four-market:live-readiness:v2"
const SIGNATURE_PATTERN = /^hmac-sha256:([a-f0-9]{64})$/

const signingBytes = (unsigned) =>
  `${SIGNATURE_DOMAIN}\0${canonicalJson(unsigned)}`

const assertSecret = (secret) => {
  assert.ok(
    typeof secret === "string" && Buffer.byteLength(secret, "utf8") >= 32,
    "four-market live proof HMAC key must contain at least 32 bytes"
  )
}

const assertLiveReport = (report) => {
  assert.equal(
    report?.kind,
    "herbatika-four-market-live-readiness",
    "live report kind"
  )
  assert.equal(report?.schemaVersion, 2, "live report schemaVersion")
  assert.equal(report?.ready, true, "live report must be ready")
  const { evidenceSha256, ...evidence } = report
  assert.equal(
    evidenceSha256,
    sha256(canonicalJson(evidence)),
    "live report evidence hash"
  )
}

export const signLiveReadinessProof = ({ issuedAt, report, secret }) => {
  assertSecret(secret)
  assertLiveReport(report)
  assert.ok(!Number.isNaN(Date.parse(issuedAt)), "issuedAt must be valid")
  assert.ok(
    Date.parse(issuedAt) >= Date.parse(report.generatedAt),
    "issuedAt must not predate live report"
  )
  const unsigned = {
    domain: SIGNATURE_DOMAIN,
    issuedAt,
    kind: "herbatika-four-market-live-readiness-proof",
    report,
    reportSha256: sha256(canonicalJson(report)),
    schemaVersion: 2,
  }
  return {
    ...unsigned,
    signature: `hmac-sha256:${createHmac("sha256", secret)
      .update(signingBytes(unsigned))
      .digest("hex")}`,
  }
}

export const verifyLiveReadinessProof = ({ envelope, secret }) => {
  assertSecret(secret)
  const signature = envelope?.signature?.match(SIGNATURE_PATTERN)?.[1] ?? ""
  const { signature: _signature, ...unsigned } = envelope ?? {}
  assert.equal(unsigned.domain, SIGNATURE_DOMAIN, "live proof signature domain")
  assert.equal(
    unsigned.kind,
    "herbatika-four-market-live-readiness-proof",
    "live proof kind"
  )
  assert.equal(unsigned.schemaVersion, 2, "live proof schemaVersion")
  assert.equal(
    unsigned.reportSha256,
    sha256(canonicalJson(unsigned.report)),
    "live proof report hash"
  )
  assert.ok(!Number.isNaN(Date.parse(unsigned.issuedAt)), "live proof issuedAt")
  assert.ok(
    Date.parse(unsigned.issuedAt) >= Date.parse(unsigned.report.generatedAt),
    "live proof issuedAt must not predate report"
  )
  const expected = createHmac("sha256", secret)
    .update(signingBytes(unsigned))
    .digest("hex")
  const actualBytes = Buffer.from(signature, "hex")
  const expectedBytes = Buffer.from(expected, "hex")
  assert.ok(
    actualBytes.length === expectedBytes.length &&
      timingSafeEqual(actualBytes, expectedBytes),
    "live proof signature"
  )
  assertLiveReport(unsigned.report)
  return unsigned.report
}

const parseArguments = (values) => {
  const options = {}
  for (let index = 0; index < values.length; index += 2) {
    const name = values[index]
    const value = values[index + 1]
    if (!(name?.startsWith("--") && value && !value.startsWith("--"))) {
      throw new Error(`Unknown or incomplete option: ${name ?? "<missing>"}`)
    }
    if (name === "--input") {
      options.input = value
    } else if (name === "--output") {
      options.output = value
    } else if (name === "--issued-at") {
      options.issuedAt = value
    } else {
      throw new Error(`Unknown option: ${name}`)
    }
  }
  assert.ok(
    options.input && options.output,
    "--input and --output are required"
  )
  return options
}

const main = async () => {
  const options = parseArguments(process.argv.slice(2))
  const secret = process.env.HERBATIKA_FOUR_MARKET_GATE_HMAC_KEY
  const report = JSON.parse(await readFile(options.input, "utf8"))
  const envelope = signLiveReadinessProof({
    issuedAt: options.issuedAt ?? new Date().toISOString(),
    report,
    secret,
  })
  await writePrivateJsonNoClobber(options.output, envelope)
  console.log(`Wrote signed four-market live proof ${envelope.reportSha256}`)
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
