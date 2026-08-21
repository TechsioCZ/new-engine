// biome-ignore-all lint/suspicious/noMisplacedAssertion: CLI validation intentionally uses node assertions
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import {
  parseFixture,
  parseRuntimeConfig,
  writePrivateJsonNoClobber,
} from "./gate-core.mjs"
import { generateLiveReadiness } from "./live-readiness.mjs"
import { signLiveReadinessProof } from "./sign-proof.mjs"

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: explicit CLI parsing rejects unknown and incomplete options
const parseArguments = (values) => {
  const options = { concurrency: 8, timeoutMs: 45_000 }
  for (let index = 0; index < values.length; index += 2) {
    const name = values[index]
    const value = values[index + 1]
    if (!(name?.startsWith("--") && value && !value.startsWith("--"))) {
      throw new Error(`Unknown or incomplete option: ${name ?? "<missing>"}`)
    }
    if (name === "--runtime-config") {
      options.runtimeConfig = value
    } else if (name === "--fixture") {
      options.fixture = value
    } else if (name === "--output") {
      options.output = value
    } else if (name === "--crawl-concurrency") {
      options.concurrency = Number(value)
    } else if (name === "--timeout-ms") {
      options.timeoutMs = Number(value)
    } else {
      throw new Error(`Unknown option: ${name}`)
    }
  }
  assert.ok(
    options.runtimeConfig && options.fixture && options.output,
    "--runtime-config, --fixture, and --output are required"
  )
  assert.ok(
    Number.isSafeInteger(options.timeoutMs) && options.timeoutMs > 0,
    "--timeout-ms"
  )
  return options
}

const options = parseArguments(process.argv.slice(2))
const [unparsedFixture, unparsedRuntimeConfig] = await Promise.all([
  readFile(options.fixture, "utf8").then(JSON.parse),
  readFile(options.runtimeConfig, "utf8").then(JSON.parse),
])
const fixture = parseFixture(unparsedFixture)
const runtimeConfig = parseRuntimeConfig(unparsedRuntimeConfig, fixture)
const fetchImpl = (url, init = {}) =>
  fetch(url, {
    ...init,
    signal: AbortSignal.timeout(options.timeoutMs),
  })
const report = await generateLiveReadiness({
  concurrency: options.concurrency,
  fetchImpl,
  fixture,
  runtimeConfig,
})
const envelope = signLiveReadinessProof({
  issuedAt: new Date().toISOString(),
  report,
  secret: process.env.HERBATIKA_FOUR_MARKET_GATE_HMAC_KEY,
})
await writePrivateJsonNoClobber(options.output, envelope)
console.log(`Four-market live gate passed: ${envelope.reportSha256}`)
