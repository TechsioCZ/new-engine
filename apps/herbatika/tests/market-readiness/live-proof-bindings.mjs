// biome-ignore-all lint/suspicious/noMisplacedAssertion: release-gate assertions are invoked by the CLI and tests
import assert from "node:assert/strict"
import { canonicalJson, MARKET_CODES, sha256 } from "./gate-core.mjs"

const backendIdentity = (runtimeConfig) => ({
  backendBuildHash: runtimeConfig.releaseIdentity.backend.buildHash,
  backendDeploymentId: runtimeConfig.releaseIdentity.backend.deploymentId,
  backendReleaseSha: runtimeConfig.releaseIdentity.backend.releaseSha,
  backendSlot: runtimeConfig.releaseIdentity.backend.slot,
  databaseInstanceFingerprint:
    runtimeConfig.releaseIdentity.databaseInstanceFingerprint,
  environmentId: runtimeConfig.releaseIdentity.environmentId,
  releaseId: runtimeConfig.releaseId,
})

const proofArtifacts = (proofs) =>
  Object.fromEntries(proofs.map(({ artifact, name }) => [name, artifact]))

const assertCatalog = (catalog, runtimeConfig) => {
  assert.deepEqual(
    catalog.releaseIdentity,
    backendIdentity(runtimeConfig),
    "catalog: release identity"
  )
  assert.equal(
    catalog.auditSha256,
    sha256(`${canonicalJson(catalog.audit)}\n`),
    "catalog: embedded audit hash"
  )
  assert.equal(catalog.audit.kind, "herbatika-four-market-catalog-readiness")
  assert.equal(catalog.audit.scope, "four-market-catalog-readiness")
  assert.equal(catalog.audit.schemaVersion, 1)
  assert.equal(catalog.audit.ready, true, "catalog: audit ready")
  assert.deepEqual(catalog.audit.issues, [], "catalog: audit issues")
  assert.equal(catalog.audit.summary.errors, 0, "catalog: audit errors")
  assert.equal(
    catalog.audit.sharedIdentity.matched,
    true,
    "catalog: shared identity"
  )
  assert.deepEqual(
    catalog.audit.markets.map(({ market }) => market),
    MARKET_CODES,
    "catalog: markets"
  )
  for (const market of catalog.audit.markets) {
    assert.equal(market.ready, true, `catalog: ${market.market} ready`)
  }
}

const assertCommerce = (commerce, runtimeConfig) => {
  assert.deepEqual(
    commerce.releaseIdentity,
    backendIdentity(runtimeConfig),
    "commerce: release identity"
  )
  assert.deepEqual(
    Object.keys(commerce.proofs).sort(),
    [...MARKET_CODES].sort(),
    "commerce: markets"
  )
}

const assertUrlRegistry = (urlRegistry, runtimeConfig) => {
  assert.equal(
    urlRegistry.releaseId,
    runtimeConfig.releaseId,
    "urlRegistry: releaseId"
  )
  assert.equal(
    urlRegistry.environmentId,
    runtimeConfig.releaseIdentity.environmentId,
    "urlRegistry: environmentId"
  )
  for (const market of MARKET_CODES) {
    assert.equal(
      urlRegistry.markets[market].binding.market,
      market,
      `urlRegistry: ${market} binding`
    )
  }
}

const assertStaticTaxonomy = (
  staticTaxonomy,
  urlRegistry,
  producerEvidence,
  runtimeConfig
) => {
  assert.equal(staticTaxonomy.releaseId, runtimeConfig.releaseId)
  assert.equal(
    staticTaxonomy.environmentId,
    runtimeConfig.releaseIdentity.environmentId
  )
  for (const key of ["populationManifestSha256", "migrationLedgerSha256"]) {
    assert.equal(
      staticTaxonomy[key],
      urlRegistry[key],
      `staticTaxonomy/urlRegistry: ${key}`
    )
  }
  for (const market of MARKET_CODES) {
    const registry = producerEvidence.markets[market].segmentRegistry
    assert.equal(
      registry.taxonomySha256,
      staticTaxonomy.taxonomySha256,
      `staticTaxonomy: ${market} taxonomy hash`
    )
    assert.deepEqual(
      staticTaxonomy.markets[market].segmentRegistry,
      {
        ref: `segment-registry-g1/${market}.json`,
        sha256: registry.sha256,
      },
      `staticTaxonomy: ${market} segment registry ref`
    )
  }
}

const findEntry = (entries, binding, label) => {
  const matches = entries.filter(
    ({ contentKind, entryId }) =>
      contentKind === binding.contentKind && entryId === binding.entryId
  )
  assert.equal(matches.length, 1, `${label}: approved entry identity`)
  return matches[0]
}

const assertRenderedPageApprovals = ({
  fixture,
  producerEvidence,
  staticTaxonomy,
}) => {
  for (const market of MARKET_CODES) {
    const marketEvidence = producerEvidence.markets[market]
    for (const page of fixture.markets[market].requiredPages) {
      if (page.approvalBinding === null) {
        continue
      }
      const label = `static approval: ${market}:${page.path}`
      const projections = staticTaxonomy.markets[market].projections
      const projectionMatches = projections.filter(
        ({ routeKey }) => routeKey === page.approvalBinding.routeKey
      )
      assert.equal(projectionMatches.length, 1, `${label}: taxonomy route`)
      const projection = projectionMatches[0]
      assert.equal(projection.path, page.path, `${label}: taxonomy path`)
      assert.equal(projection.matchMode, "exact", `${label}: match mode`)

      const staticEntry = findEntry(
        marketEvidence.collections.staticContent.entries,
        page.approvalBinding,
        label
      )
      const editorialEntry = findEntry(
        marketEvidence.collections.editorialApproval.entries,
        page.approvalBinding,
        `${label}: editorial`
      )
      const legalEntry = findEntry(
        marketEvidence.collections.legalApproval.entries,
        page.approvalBinding,
        `${label}: legal`
      )
      for (const approval of [editorialEntry, legalEntry]) {
        assert.equal(
          approval.staticContentArtifactRef,
          staticEntry.ref,
          `${label}: approval artifact ref`
        )
        assert.equal(
          approval.staticContentArtifactSha256,
          staticEntry.sha256,
          `${label}: approval artifact hash`
        )
      }

      if (projection.indexPolicy === "indexable") {
        const routes = marketEvidence.segmentRegistry.routes.filter(
          ({ routeKey }) => routeKey === page.approvalBinding.routeKey
        )
        assert.equal(routes.length, 1, `${label}: G1 route`)
        const route = routes[0]
        assert.equal(
          route.staticContentArtifact.ref,
          staticEntry.ref,
          `${label}: G1 static ref`
        )
        assert.equal(
          route.staticContentArtifact.sha256,
          staticEntry.sha256,
          `${label}: G1 static hash`
        )
        assert.equal(
          route.editorialApproval.artifact.sha256,
          editorialEntry.sha256,
          `${label}: G1 editorial hash`
        )
        assert.equal(
          route.legalApproval.artifact.sha256,
          legalEntry.sha256,
          `${label}: G1 legal hash`
        )
      }
    }
  }
}

const assertHostnameMarkets = (hostname, runtimeConfig) => {
  assert.deepEqual(
    Object.keys(hostname.markets).sort(),
    [...MARKET_CODES].sort(),
    "hostname: markets"
  )
  for (const market of MARKET_CODES) {
    assert.deepEqual(
      hostname.markets[market].acceptedHosts,
      runtimeConfig.markets[market].acceptedHosts,
      `hostname: ${market} accepted hosts`
    )
    assert.equal(
      hostname.markets[market].origin,
      runtimeConfig.markets[market].origin,
      `hostname: ${market} origin`
    )
  }
}

export const assertProofBindings = ({
  fixture,
  producerEvidence,
  proofs,
  runtimeConfig,
}) => {
  const artifacts = proofArtifacts(proofs)
  assertCatalog(artifacts.catalog, runtimeConfig)
  assertCommerce(artifacts.commerce, runtimeConfig)
  assertUrlRegistry(artifacts.urlRegistry, runtimeConfig)
  assertStaticTaxonomy(
    artifacts.staticTaxonomy,
    artifacts.urlRegistry,
    producerEvidence,
    runtimeConfig
  )
  assertRenderedPageApprovals({
    fixture,
    producerEvidence,
    staticTaxonomy: artifacts.staticTaxonomy,
  })
  assert.equal(
    artifacts.meilisearch.releaseId,
    runtimeConfig.releaseId,
    "meilisearch: releaseId"
  )
  assertHostnameMarkets(artifacts.hostname, runtimeConfig)
  assert.equal(
    artifacts.meilisearch.environmentId,
    runtimeConfig.releaseIdentity.environmentId
  )
  assert.deepEqual(
    artifacts.hostname.releaseIdentity,
    runtimeConfig.releaseIdentity.storefront,
    "hostname: storefront release identity"
  )
  assert.equal(
    artifacts.hostname.noClobber.dnsUnchanged,
    true,
    "hostname: DNS must be unchanged"
  )
}
