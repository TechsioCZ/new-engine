// biome-ignore-all lint/suspicious/noMisplacedAssertion: release-gate assertion helpers are invoked by the CLI and node:test cases
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { isAbsolute } from "node:path"

export const MARKET_CODES = Object.freeze(["sk", "cz", "hu", "ro"])

export const MARKET_LOCALES = Object.freeze({
  sk: "sk-SK",
  cz: "cs-CZ",
  hu: "hu-HU",
  ro: "ro-RO",
})

export const MARKET_CURRENCIES = Object.freeze({
  sk: "EUR",
  cz: "CZK",
  hu: "HUF",
  ro: "RON",
})

const HOST_PATTERN =
  /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
const SHA256_PATTERN = /^[a-f0-9]{64}$/
const SHA_PATTERN = /^[a-f0-9]{40}$/
const DEPLOYMENT_VALUE_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/
const SLOT_PATTERN = /^(?:blue|green)$/
const PLACEHOLDER_PATTERN = /(?:example\.(?:com|test)|replace[-_])/iu
const PROOF_NAME_PATTERN = /^[a-z][a-zA-Z0-9]*$/
const OBJECT_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/
const TRAILING_SLASH_PATTERN = /\/$/u

const EXPECTED_PROOF_REQUIREMENTS = Object.freeze([
  {
    assertions: [{ equals: "four-market-catalog-readiness", path: ["scope"] }],
    kind: "herbatika-four-market-catalog-live-readiness",
    name: "catalog",
    schemaVersion: 1,
  },
  {
    assertions: [{ equals: true, path: ["ready"] }],
    kind: "four-market-commerce-collection",
    name: "commerce",
    schemaVersion: 1,
  },
  {
    assertions: [{ equals: "converged", path: ["state"] }],
    kind: "herbatika-four-market-urlr-convergence",
    name: "urlRegistry",
    schemaVersion: 1,
  },
  {
    assertions: [{ equals: "converged", path: ["state"] }],
    kind: "herbatika-four-market-static-taxonomy-convergence",
    name: "staticTaxonomy",
    schemaVersion: 1,
  },
  {
    assertions: [{ equals: "converged", path: ["aggregate", "state"] }],
    kind: "herbatika-four-market-meilisearch-convergence-proof",
    name: "meilisearch",
    schemaVersion: 1,
  },
  {
    assertions: [
      { equals: true, path: ["ready"] },
      { equals: [], path: ["issues"] },
    ],
    kind: "herbatika-four-market-hostname-readiness",
    name: "hostname",
    schemaVersion: 1,
  },
])

export const canonicalJson = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

export const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex")

export const exactKeys = (value, expected, label) => {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), label)
  assert.deepEqual(
    Object.keys(value).sort(),
    [...expected].sort(),
    `${label}: keys`
  )
}

export const normalizeOrigin = (value, label) => {
  assert.equal(typeof value, "string", `${label} must be a string`)
  const url = new URL(value)
  assert.equal(url.protocol, "https:", `${label} must use https`)
  assert.equal(url.username, "", `${label} must not contain credentials`)
  assert.equal(url.password, "", `${label} must not contain credentials`)
  assert.equal(url.port, "", `${label} must not contain a port`)
  assert.equal(url.search, "", `${label} must not contain a query`)
  assert.equal(url.hash, "", `${label} must not contain a fragment`)
  assert.equal(url.pathname, "/", `${label} must not contain a path`)
  assert.ok(!PLACEHOLDER_PATTERN.test(value), `${label} contains a placeholder`)
  assert.equal(value, url.origin, `${label} must be an exact origin`)
  return url.origin
}

export const normalizeHost = (value, label) => {
  assert.equal(typeof value, "string", `${label} must be a string`)
  assert.equal(value, value.trim().toLowerCase(), `${label} must be normalized`)
  assert.match(value, HOST_PATTERN, `${label} must be an exact DNS hostname`)
  assert.ok(!PLACEHOLDER_PATTERN.test(value), `${label} contains a placeholder`)
  return value
}

const assertPath = (value, label) => {
  assert.equal(typeof value, "string", `${label} must be a string`)
  assert.ok(
    value.startsWith("/") && !value.startsWith("//"),
    `${label} must be absolute`
  )
  assert.equal(
    new URL(value, "https://path.invalid").search,
    "",
    `${label} query`
  )
  assert.equal(
    new URL(value, "https://path.invalid").hash,
    "",
    `${label} fragment`
  )
  assert.ok(!PLACEHOLDER_PATTERN.test(value), `${label} contains a placeholder`)
  return value
}

const assertExactMarkets = (markets, label) => {
  exactKeys(markets, MARKET_CODES, label)
  return markets
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: the acceptance fixture is intentionally validated field by field
export const parseFixture = (value) => {
  exactKeys(
    value,
    ["markets", "proofRequirements", "schemaVersion", "xDefaultMarket"],
    "fixture"
  )
  assert.equal(value.schemaVersion, 1, "fixture schemaVersion")
  assert.ok(
    MARKET_CODES.includes(value.xDefaultMarket),
    "fixture xDefaultMarket"
  )
  assert.ok(
    Array.isArray(value.proofRequirements) &&
      value.proofRequirements.length > 0,
    "fixture proofRequirements"
  )
  assert.deepEqual(
    value.proofRequirements,
    EXPECTED_PROOF_REQUIREMENTS,
    "fixture proofRequirements must match the built-in release contract"
  )

  const proofNames = new Set()
  for (const [index, proof] of value.proofRequirements.entries()) {
    exactKeys(
      proof,
      ["assertions", "kind", "name", "schemaVersion"],
      `proofRequirements[${index}]`
    )
    assert.match(
      proof.name,
      PROOF_NAME_PATTERN,
      `proofRequirements[${index}].name`
    )
    assert.ok(
      !proofNames.has(proof.name),
      `duplicate proof requirement ${proof.name}`
    )
    proofNames.add(proof.name)
    assert.equal(typeof proof.kind, "string", `${proof.name}.kind`)
    assert.ok(
      Number.isSafeInteger(proof.schemaVersion) && proof.schemaVersion > 0,
      `${proof.name}.schemaVersion`
    )
    assert.ok(
      Array.isArray(proof.assertions) && proof.assertions.length > 0,
      `${proof.name}.assertions`
    )
    for (const assertion of proof.assertions) {
      exactKeys(assertion, ["equals", "path"], `${proof.name}.assertion`)
      assert.ok(
        Array.isArray(assertion.path) && assertion.path.length > 0,
        `${proof.name}.assertion.path`
      )
      for (const part of assertion.path) {
        assert.match(part, OBJECT_KEY_PATTERN, `${proof.name}.assertion.path`)
      }
    }
  }

  const markets = assertExactMarkets(value.markets, "fixture.markets")
  for (const market of MARKET_CODES) {
    const fixture = markets[market]
    exactKeys(
      fixture,
      [
        "currencyCode",
        "currencyPathPrefixes",
        "forbiddenCurrencyCodes",
        "htmlLang",
        "locale",
        "requiredPages",
      ],
      `fixture.markets.${market}`
    )
    assert.equal(fixture.locale, MARKET_LOCALES[market], `${market}.locale`)
    assert.equal(fixture.htmlLang, MARKET_LOCALES[market], `${market}.htmlLang`)
    assert.equal(
      fixture.currencyCode,
      MARKET_CURRENCIES[market],
      `${market}.currencyCode`
    )
    assert.ok(
      Array.isArray(fixture.currencyPathPrefixes) &&
        fixture.currencyPathPrefixes.length > 0,
      `${market}.currencyPathPrefixes`
    )
    for (const [index, path] of fixture.currencyPathPrefixes.entries()) {
      assertPath(path, `${market}.currencyPathPrefixes[${index}]`)
    }
    assert.equal(
      new Set(fixture.currencyPathPrefixes).size,
      fixture.currencyPathPrefixes.length,
      `${market}.currencyPathPrefixes must be unique`
    )
    assert.ok(
      Array.isArray(fixture.forbiddenCurrencyCodes),
      `${market}.forbiddenCurrencyCodes`
    )
    for (const code of fixture.forbiddenCurrencyCodes) {
      assert.match(
        code,
        CURRENCY_CODE_PATTERN,
        `${market}.forbiddenCurrencyCodes`
      )
    }
    assert.deepEqual(
      [...fixture.forbiddenCurrencyCodes].sort(),
      Object.values(MARKET_CURRENCIES)
        .filter((currency) => currency !== MARKET_CURRENCIES[market])
        .sort(),
      `${market}.forbiddenCurrencyCodes`
    )
    assert.ok(Array.isArray(fixture.requiredPages), `${market}.requiredPages`)
    const kinds = new Set()
    const paths = new Set()
    for (const [index, page] of fixture.requiredPages.entries()) {
      exactKeys(
        page,
        ["approvalBinding", "kind", "path", "requiredText"],
        `${market}.requiredPages[${index}]`
      )
      assert.ok(
        ["catalog", "legal", "static"].includes(page.kind),
        `${market}.requiredPages[${index}].kind`
      )
      assertPath(page.path, `${market}.requiredPages[${index}].path`)
      assert.ok(
        !paths.has(page.path),
        `${market}: duplicate required page ${page.path}`
      )
      paths.add(page.path)
      kinds.add(page.kind)
      if (page.kind === "catalog") {
        assert.equal(
          page.approvalBinding,
          null,
          `${market}:${page.path}.approvalBinding`
        )
      } else {
        exactKeys(
          page.approvalBinding,
          ["contentKind", "entryId", "routeKey"],
          `${market}:${page.path}.approvalBinding`
        )
        for (const field of ["contentKind", "entryId", "routeKey"]) {
          assert.ok(
            typeof page.approvalBinding[field] === "string" &&
              page.approvalBinding[field].trim().length > 0,
            `${market}:${page.path}.approvalBinding.${field}`
          )
        }
        assert.ok(
          page.approvalBinding.routeKey.startsWith("root:"),
          `${market}:${page.path}.approvalBinding.routeKey`
        )
      }
      assert.ok(
        Array.isArray(page.requiredText) && page.requiredText.length > 0,
        `${market}:${page.path}.requiredText`
      )
      for (const text of page.requiredText) {
        assert.ok(
          typeof text === "string" && text.trim().length > 0,
          `${market}:${page.path}.requiredText`
        )
      }
      if (page.kind === "catalog") {
        assert.ok(
          fixture.currencyPathPrefixes.some(
            (prefix) =>
              page.path === prefix.replace(TRAILING_SLASH_PATTERN, "") ||
              page.path.startsWith(prefix)
          ),
          `${market}:${page.path} must be covered by a currency prefix`
        )
      }
    }
    for (const kind of ["catalog", "legal", "static"]) {
      assert.ok(kinds.has(kind), `${market}: missing required ${kind} evidence`)
    }
  }
  return value
}

export const parseRuntimeConfig = (value, fixture) => {
  exactKeys(
    value,
    [
      "markets",
      "producerEvidence",
      "proofRefs",
      "releaseId",
      "releaseIdentity",
      "schemaVersion",
    ],
    "runtime config"
  )
  assert.equal(value.schemaVersion, 1, "runtime config schemaVersion")
  assert.match(value.releaseId, DEPLOYMENT_VALUE_PATTERN, "releaseId")
  const identity = value.releaseIdentity
  exactKeys(
    identity,
    [
      "backend",
      "databaseFingerprint",
      "databaseInstanceFingerprint",
      "environmentId",
      "storefront",
    ],
    "runtime config releaseIdentity"
  )
  assert.match(
    identity.environmentId,
    DEPLOYMENT_VALUE_PATTERN,
    "releaseIdentity.environmentId"
  )
  for (const fingerprint of [
    "databaseFingerprint",
    "databaseInstanceFingerprint",
  ]) {
    assert.match(
      identity[fingerprint],
      SHA256_PATTERN,
      `releaseIdentity.${fingerprint}`
    )
  }
  for (const deploymentName of ["backend", "storefront"]) {
    const deployment = identity[deploymentName]
    exactKeys(
      deployment,
      ["buildHash", "deploymentId", "releaseSha", "slot"],
      `releaseIdentity.${deploymentName}`
    )
    assert.match(
      deployment.buildHash,
      DEPLOYMENT_VALUE_PATTERN,
      `${deploymentName}.buildHash`
    )
    assert.match(
      deployment.deploymentId,
      DEPLOYMENT_VALUE_PATTERN,
      `${deploymentName}.deploymentId`
    )
    assert.match(
      deployment.releaseSha,
      SHA_PATTERN,
      `${deploymentName}.releaseSha`
    )
    assert.match(deployment.slot, SLOT_PATTERN, `${deploymentName}.slot`)
  }

  exactKeys(
    value.producerEvidence,
    ["segmentRegistry", "staticContentPlan", "staticContentRoot"],
    "runtime config producerEvidence"
  )
  assert.ok(
    typeof value.producerEvidence.staticContentRoot === "string" &&
      isAbsolute(value.producerEvidence.staticContentRoot),
    "producerEvidence.staticContentRoot must be absolute"
  )
  exactKeys(
    value.producerEvidence.staticContentPlan,
    ["path", "sha256"],
    "producerEvidence.staticContentPlan"
  )
  assert.ok(
    isAbsolute(value.producerEvidence.staticContentPlan.path),
    "producerEvidence.staticContentPlan.path must be absolute"
  )
  assert.match(
    value.producerEvidence.staticContentPlan.sha256,
    SHA256_PATTERN,
    "producerEvidence.staticContentPlan.sha256"
  )
  assertExactMarkets(
    value.producerEvidence.segmentRegistry,
    "producerEvidence.segmentRegistry"
  )
  for (const market of MARKET_CODES) {
    const reference = value.producerEvidence.segmentRegistry[market]
    exactKeys(reference, ["path", "sha256"], `segmentRegistry.${market}`)
    assert.ok(isAbsolute(reference.path), `segmentRegistry.${market}.path`)
    assert.match(
      reference.sha256,
      SHA256_PATTERN,
      `segmentRegistry.${market}.sha256`
    )
  }

  const seenOrigins = new Set()
  const seenHosts = new Set()
  assertExactMarkets(value.markets, "runtime config markets")
  for (const market of MARKET_CODES) {
    const binding = value.markets[market]
    exactKeys(
      binding,
      ["acceptedHosts", "origin"],
      `runtime config markets.${market}`
    )
    binding.origin = normalizeOrigin(binding.origin, `${market}.origin`)
    assert.ok(
      !seenOrigins.has(binding.origin),
      `origin assigned to multiple markets: ${binding.origin}`
    )
    seenOrigins.add(binding.origin)
    assert.ok(
      Array.isArray(binding.acceptedHosts) && binding.acceptedHosts.length > 0,
      `${market}.acceptedHosts`
    )
    binding.acceptedHosts = binding.acceptedHosts.map((host, index) =>
      normalizeHost(host, `${market}.acceptedHosts[${index}]`)
    )
    assert.equal(
      binding.acceptedHosts[0],
      new URL(binding.origin).hostname,
      `${market}.acceptedHosts must be canonical-first`
    )
    for (const host of binding.acceptedHosts) {
      assert.ok(
        !seenHosts.has(host),
        `host assigned to multiple markets: ${host}`
      )
      seenHosts.add(host)
    }
  }

  const requiredProofNames = fixture.proofRequirements.map(({ name }) => name)
  exactKeys(value.proofRefs, requiredProofNames, "runtime config proofRefs")
  for (const name of requiredProofNames) {
    exactKeys(value.proofRefs[name], ["path", "sha256"], `proofRefs.${name}`)
    assert.ok(
      typeof value.proofRefs[name].path === "string" &&
        isAbsolute(value.proofRefs[name].path),
      `proofRefs.${name}.path`
    )
    assert.match(
      value.proofRefs[name].sha256,
      SHA256_PATTERN,
      `proofRefs.${name}.sha256`
    )
  }
  return value
}

const valueAtPath = (value, path) =>
  path.reduce((current, key) => current?.[key], value)

export const loadProofRefs = async (runtimeConfig, fixture) =>
  Promise.all(
    fixture.proofRequirements.map(async (requirement) => {
      const reference = runtimeConfig.proofRefs[requirement.name]
      const contents = await readFile(reference.path)
      assert.equal(
        sha256(contents),
        reference.sha256,
        `${requirement.name}: exact artifact hash mismatch`
      )
      const artifact = JSON.parse(contents.toString("utf8"))
      assert.equal(
        contents.toString("utf8"),
        `${canonicalJson(artifact)}\n`,
        `${requirement.name}: artifact must be canonical JSON with one LF`
      )
      assert.equal(artifact.kind, requirement.kind, `${requirement.name}: kind`)
      assert.equal(
        artifact.schemaVersion,
        requirement.schemaVersion,
        `${requirement.name}: schemaVersion`
      )
      for (const assertion of requirement.assertions) {
        assert.deepEqual(
          valueAtPath(artifact, assertion.path),
          assertion.equals,
          `${requirement.name}: ${assertion.path.join(".")}`
        )
      }
      return Object.freeze({
        artifact,
        kind: artifact.kind,
        name: requirement.name,
        schemaVersion: artifact.schemaVersion,
        sha256: reference.sha256,
      })
    })
  )

export const writePrivateJsonNoClobber = async (path, value) =>
  writeFile(path, `${canonicalJson(value)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  })
