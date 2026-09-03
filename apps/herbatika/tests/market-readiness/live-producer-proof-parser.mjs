// biome-ignore-all lint/suspicious/noMisplacedAssertion: standalone parser fails closed through CLI assertions
// This process is launched with the tsx loader so it can reuse the strict producer parsers.
import assert from "node:assert/strict"
import { lstat, readFile, realpath } from "node:fs/promises"
import { isAbsolute, resolve, sep } from "node:path"
import {
  parseMarketStaticContentApprovalCollectionArtifact,
  parseMarketStaticContentCollectionArtifact,
} from "../../scripts/market-static-content/artifact-contract.ts"
import { parseMarketStaticContentPlan } from "../../scripts/market-static-content/plan-parser.ts"
import { parseSegmentRegistryPublicationArtifact } from "../../src/lib/url/segment-registry-publication/parser.ts"
import { canonicalJson, MARKET_CODES, sha256 } from "./gate-core.mjs"

const MAX_INPUT_BYTES = 256 * 1024
const MAX_ARTIFACT_BYTES = 16 * 1024 * 1024

const stdin = async () => {
  const chunks = []
  let bytes = 0
  for await (const chunk of process.stdin) {
    bytes += chunk.length
    assert.ok(bytes <= MAX_INPUT_BYTES, "producer evidence input is too large")
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"))
}

const readBounded = async (path, expectedSha256, label) => {
  assert.ok(isAbsolute(path), `${label}: path must be absolute`)
  assert.equal(
    (await lstat(path)).isSymbolicLink(),
    false,
    `${label}: symlink rejected`
  )
  const contents = await readFile(path)
  assert.ok(
    contents.length <= MAX_ARTIFACT_BYTES,
    `${label}: artifact is too large`
  )
  assert.equal(
    sha256(contents),
    expectedSha256,
    `${label}: exact artifact hash mismatch`
  )
  return contents.toString("utf8")
}

const safeArtifactPath = async (root, reference, label) => {
  assert.ok(
    reference.startsWith("market-static-content/") &&
      !reference.includes("\\") &&
      !reference.split("/").includes(".."),
    `${label}: unsafe artifact ref`
  )
  const rootPath = await realpath(root)
  const candidate = resolve(rootPath, reference)
  const actual = await realpath(candidate)
  assert.ok(
    actual.startsWith(`${rootPath}${sep}`),
    `${label}: artifact escapes root`
  )
  return actual
}

const entryKey = (entry) => `${entry.contentKind}:${entry.entryId}`

const expectedEntries = (plan, market, role) =>
  plan.operations
    .filter((operation) => operation.market === market)
    .map((operation) => {
      const entryId = operation.entityKey.split(":").slice(2).join(":")
      if (role === "staticContent") {
        return {
          contentKind: operation.contentKind,
          entryId,
          ref: operation.artifact.ref,
          sha256: operation.artifact.sha256,
        }
      }
      const approval = operation.approvals[role]
      return {
        contentKind: operation.contentKind,
        entryId,
        ref: approval.approvalArtifact.ref,
        sha256: approval.approvalArtifact.sha256,
        sourceSnapshotSha256: approval.sourceSnapshotSha256,
        staticContentArtifactRef: operation.artifact.ref,
        staticContentArtifactSha256: operation.artifact.sha256,
      }
    })
    .sort((left, right) => entryKey(left).localeCompare(entryKey(right), "en"))

const assertCollectionEntries = (collection, expected, role, label) => {
  assert.equal(
    collection.entries.length,
    expected.length,
    `${label}: entry count`
  )
  for (const [index, item] of expected.entries()) {
    const observed = collection.entries[index]
    for (const [key, value] of Object.entries(item)) {
      assert.deepEqual(observed[key], value, `${label}[${index}].${key}`)
    }
    if (role === "staticContent") {
      assert.ok(
        observed.payloadRef && observed.payloadSha256,
        `${label}[${index}]: payload ref/hash`
      )
    }
  }
}

const parseCollections = async ({ plan, root, sourceManifest }) => {
  const market = sourceManifest.market
  const descriptors = sourceManifest.marketArtifacts
  const parsed = {}
  for (const role of ["staticContent", "editorialApproval", "legalApproval"]) {
    const descriptor = descriptors[role]
    const path = await safeArtifactPath(
      root,
      descriptor.ref,
      `${market}.${role}`
    )
    const raw = await readBounded(path, descriptor.sha256, `${market}.${role}`)
    const collection =
      role === "staticContent"
        ? parseMarketStaticContentCollectionArtifact(raw, `${market}.${role}`)
        : parseMarketStaticContentApprovalCollectionArtifact(
            raw,
            role === "editorialApproval" ? "editorial" : "legal",
            `${market}.${role}`
          )
    assert.equal(collection.market, market, `${market}.${role}: market`)
    assert.equal(
      collection.locale,
      sourceManifest.locale,
      `${market}.${role}: locale`
    )
    assert.equal(collection.ready, true, `${market}.${role}: ready`)
    assert.equal(
      collection.segmentRegistrySha256,
      sourceManifest.segmentRegistry.sha256,
      `${market}.${role}: segment registry`
    )
    let planRole = "legal"
    if (role === "staticContent") {
      planRole = "staticContent"
    } else if (role === "editorialApproval") {
      planRole = "editorial"
    }
    assertCollectionEntries(
      collection,
      expectedEntries(plan, market, planRole),
      role,
      `${market}.${role}.entries`
    )
    parsed[role] = {
      count: collection.entries.length,
      entries: collection.entries,
      sha256: descriptor.sha256,
    }
  }
  return parsed
}

const input = await stdin()
const planRaw = await readBounded(
  input.staticContentPlan.path,
  input.staticContentPlan.sha256,
  "static content plan"
)
const parsedPlan = parseMarketStaticContentPlan(planRaw, "static content plan")
assert.equal(
  parsedPlan.sha256,
  input.staticContentPlan.sha256,
  "static content plan hash"
)
const sourceManifestByMarket = Object.fromEntries(
  parsedPlan.plan.sourceManifests.map((manifest) => [manifest.market, manifest])
)
assert.deepEqual(
  Object.keys(sourceManifestByMarket).sort(),
  [...MARKET_CODES].sort()
)

const markets = {}
for (const market of MARKET_CODES) {
  const sourceManifest = sourceManifestByMarket[market]
  const collections = await parseCollections({
    plan: parsedPlan.plan,
    root: input.staticContentRoot,
    sourceManifest,
  })
  const registryRef = input.segmentRegistry[market]
  const registryRaw = await readBounded(
    registryRef.path,
    registryRef.sha256,
    `${market}.segmentRegistry`
  )
  const registry = parseSegmentRegistryPublicationArtifact(
    registryRaw,
    `${market}.segmentRegistry`
  )
  assert.equal(
    registry.sha256,
    registryRef.sha256,
    `${market}.segmentRegistry hash`
  )
  assert.equal(
    registry.artifact.market,
    market,
    `${market}.segmentRegistry market`
  )
  assert.equal(
    registry.artifact.locale,
    sourceManifest.locale,
    `${market}.segmentRegistry locale`
  )
  assert.equal(
    registry.artifact.readiness.ready,
    true,
    `${market}.segmentRegistry ready`
  )
  assert.equal(
    registry.artifact.status,
    "approved",
    `${market}.segmentRegistry status`
  )
  assert.equal(
    registry.artifact.frozenRegistry.sha256,
    sourceManifest.segmentRegistry.sha256,
    `${market}.segmentRegistry reviewed registry hash`
  )
  assert.equal(
    registry.artifact.sourcePlan.planSha256,
    parsedPlan.plan.planSha256,
    `${market}.segmentRegistry plan hash`
  )
  assert.equal(
    registry.artifact.sourcePlan.sha256,
    parsedPlan.sha256,
    `${market}.segmentRegistry plan artifact hash`
  )
  markets[market] = {
    collections,
    locale: sourceManifest.locale,
    segmentRegistry: {
      reviewedRegistrySha256: registry.artifact.frozenRegistry.sha256,
      routes: registry.artifact.routes,
      sha256: registry.sha256,
      taxonomySha256: registry.artifact.taxonomySha256,
    },
  }
}

process.stdout.write(
  `${canonicalJson({
    markets,
    planSha256: parsedPlan.plan.planSha256,
    planArtifactSha256: parsedPlan.sha256,
  })}\n`
)
