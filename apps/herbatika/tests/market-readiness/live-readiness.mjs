// biome-ignore-all lint/suspicious/noMisplacedAssertion: live-gate assertions are invoked by the CLI and node:test cases
import assert from "node:assert/strict"
import {
  canonicalJson,
  loadProofRefs,
  MARKET_CODES,
  MARKET_LOCALES,
  sha256,
} from "./gate-core.mjs"
import {
  assertReciprocalHreflangGraph,
  crawlMarket,
  probeHostRecognition,
} from "./live-http.mjs"
import { loadProducerEvidence } from "./live-producer-proofs.mjs"
import { assertProofBindings } from "./live-proof-bindings.mjs"

const proofMap = (proofs) =>
  Object.fromEntries(
    proofs.map((proof) => [
      proof.name,
      {
        kind: proof.kind,
        schemaVersion: proof.schemaVersion,
        sha256: proof.sha256,
      },
    ])
  )

export const generateLiveReadiness = async ({
  concurrency = 8,
  fetchImpl = fetch,
  fixture,
  loadProducerEvidenceImpl = loadProducerEvidence,
  now = () => new Date(),
  runtimeConfig,
}) => {
  assert.ok(
    Number.isSafeInteger(concurrency) && concurrency > 0 && concurrency <= 32,
    "crawl concurrency must be between 1 and 32"
  )
  const [proofs, producerEvidence] = await Promise.all([
    loadProofRefs(runtimeConfig, fixture),
    loadProducerEvidenceImpl(runtimeConfig.producerEvidence),
  ])
  assertProofBindings({ fixture, producerEvidence, proofs, runtimeConfig })
  const hostRecognition = {}
  const marketEvidence = {}
  const crawledByMarket = {}

  for (const market of MARKET_CODES) {
    hostRecognition[market] = await probeHostRecognition({
      fetchImpl,
      market,
      markets: runtimeConfig.markets,
      releaseId: runtimeConfig.releaseId,
      releaseIdentity: runtimeConfig.releaseIdentity,
    })
  }

  await Promise.all(
    MARKET_CODES.map(async (market) => {
      const crawled = await crawlMarket({
        concurrency,
        fetchImpl,
        fixture: fixture.markets[market],
        market,
        markets: runtimeConfig.markets,
        releaseIdentity: runtimeConfig.releaseIdentity,
        xDefaultMarket: fixture.xDefaultMarket,
      })
      crawledByMarket[market] = crawled
      marketEvidence[market] = {
        currencyCheckedPageCount: crawled.currencyCheckedPageCount,
        pageCount: crawled.pageCount,
        pageEvidenceSha256: sha256(canonicalJson(crawled.pages)),
        sitemapCount: crawled.sitemapCount,
        sitemapEvidenceSha256: sha256(canonicalJson(crawled.sitemaps)),
      }
    })
  )
  assertReciprocalHreflangGraph({
    crawledByMarket,
    markets: runtimeConfig.markets,
  })

  const generatedAt = now().toISOString()
  assert.ok(!Number.isNaN(Date.parse(generatedAt)), "generatedAt must be valid")
  const report = {
    acceptanceInputs: {
      fixtureSha256: sha256(canonicalJson(fixture)),
      runtimeAuthoritySha256: sha256(
        canonicalJson({
          markets: runtimeConfig.markets,
          proofRefs: Object.fromEntries(
            Object.entries(runtimeConfig.proofRefs).map(([name, reference]) => [
              name,
              { sha256: reference.sha256 },
            ])
          ),
          producerEvidence: {
            markets: Object.fromEntries(
              MARKET_CODES.map((market) => [
                market,
                {
                  collections: producerEvidence.markets[market].collections,
                  segmentRegistrySha256:
                    producerEvidence.markets[market].segmentRegistry.sha256,
                },
              ])
            ),
            planArtifactSha256: producerEvidence.planArtifactSha256,
            planSha256: producerEvidence.planSha256,
          },
          releaseId: runtimeConfig.releaseId,
          releaseIdentity: runtimeConfig.releaseIdentity,
        })
      ),
    },
    evidence: {
      hostRecognition,
      markets: marketEvidence,
    },
    generatedAt,
    kind: "herbatika-four-market-live-readiness",
    marketBindings: Object.fromEntries(
      MARKET_CODES.map((market) => [
        market,
        {
          acceptedHosts: runtimeConfig.markets[market].acceptedHosts,
          currencyCode: fixture.markets[market].currencyCode,
          locale: MARKET_LOCALES[market],
          origin: runtimeConfig.markets[market].origin,
        },
      ])
    ),
    markets: MARKET_CODES,
    proofs: proofMap(proofs),
    producerEvidence,
    ready: true,
    releaseId: runtimeConfig.releaseId,
    releaseIdentity: runtimeConfig.releaseIdentity,
    schemaVersion: 2,
    shared: {
      allMarketsObserved: true,
      storefrontBuildHash: runtimeConfig.releaseIdentity.storefront.buildHash,
      storefrontSlot: runtimeConfig.releaseIdentity.storefront.slot,
      unknownHostStatus: 421,
    },
  }
  return {
    ...report,
    evidenceSha256: sha256(canonicalJson(report)),
  }
}
