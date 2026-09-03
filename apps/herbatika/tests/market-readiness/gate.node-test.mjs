// biome-ignore-all lint/suspicious/noMisplacedAssertion: mock transport assertions make fixture failures explicit
import assert from "node:assert/strict"
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import {
  canonicalJson,
  MARKET_CODES,
  MARKET_LOCALES,
  parseFixture,
  parseRuntimeConfig,
  sha256,
  writePrivateJsonNoClobber,
} from "./gate-core.mjs"
import { generateLiveReadiness as generateLiveReadinessRaw } from "./live-readiness.mjs"
import {
  SIGNATURE_DOMAIN,
  signLiveReadinessProof,
  verifyLiveReadinessProof,
} from "./sign-proof.mjs"

const CURRENCIES = { sk: "EUR", cz: "CZK", hu: "HUF", ro: "RON" }
const PATHS = Object.fromEntries(
  MARKET_CODES.map((market) => [
    market,
    {
      catalog: `/${market}-products/item`,
      legal: `/${market}-terms`,
      static: `/${market}-about`,
    },
  ])
)
const BUILD_HASH = "storefront-build-1"
const RELEASE_ID = "release-1"
const ENVIRONMENT_ID = "test"
const DATABASE_FINGERPRINT = "d".repeat(64)
const DATABASE_INSTANCE_FINGERPRINT = "e".repeat(64)
const BACKEND_RELEASE_SHA = "b".repeat(40)
const STOREFRONT_RELEASE_SHA = "a".repeat(40)
const SECRET = "four-market-test-secret-that-is-at-least-32-bytes"
const SHA256_PATTERN = /^[a-f0-9]{64}$/
const UNKNOWN_HOST_ERROR_PATTERN = /unknown Host must return 421/
const DEPLOYMENT_ERROR_PATTERN = /storefront deployment identity mismatch/
const HREFLANG_ERROR_PATTERN = /missing ro-ro hreflang/
const LEGAL_PAGE_ERROR_PATTERN = /required legal page missing from sitemap/
const PROOF_HASH_ERROR_PATTERN = /exact artifact hash mismatch/
const EXISTS_ERROR_PATTERN = /EEXIST/
const REPORT_HASH_ERROR_PATTERN = /live proof report hash/
const CURRENCY_ERROR_PATTERN = /missing CZK currency evidence/
const CANONICAL_PROOF_ERROR_PATTERN =
  /artifact must be canonical JSON with one LF/
const BUILT_IN_PROOF_ERROR_PATTERN = /must match the built-in release contract/
const PREFIX_COVERAGE_ERROR_PATTERN = /currency prefix has no sitemap page/
const HREFLANG_TARGET_ERROR_PATTERN = /hreflang target missing/
const HREFLANG_RECIPROCAL_ERROR_PATTERN = /hreflang is not reciprocal/
const STALE_PROOF_ERROR_PATTERN = /meilisearch: releaseId/
const WRONG_CURRENCY_ERROR_PATTERN = /cz.currencyCode/
const WEAK_FORBIDDEN_ERROR_PATTERN = /ro.forbiddenCurrencyCodes/
const HOSTNAME_MARKETS_ERROR_PATTERN = /hostname: markets/
const HOSTNAME_BINDING_ERROR_PATTERN = /hostname: cz (?:accepted hosts|origin)/
const STATIC_PATH_BINDING_ERROR_PATTERN = /static approval: cz:.*taxonomy path/
const STATIC_HASH_BINDING_ERROR_PATTERN = /approval artifact hash/

const createFixture = () =>
  parseFixture({
    markets: Object.fromEntries(
      MARKET_CODES.map((market) => [
        market,
        {
          currencyCode: CURRENCIES[market],
          currencyPathPrefixes: [`/${market}-products/`],
          forbiddenCurrencyCodes: Object.values(CURRENCIES).filter(
            (currency) => currency !== CURRENCIES[market]
          ),
          htmlLang: MARKET_LOCALES[market],
          locale: MARKET_LOCALES[market],
          requiredPages: [
            {
              approvalBinding: null,
              kind: "catalog",
              path: PATHS[market].catalog,
              requiredText: [`${market} catalog`],
            },
            {
              approvalBinding: {
                contentKind: "about",
                entryId: "about",
                routeKey: "root:about",
              },
              kind: "static",
              path: PATHS[market].static,
              requiredText: [`${market} static`],
            },
            {
              approvalBinding: {
                contentKind: "cms-legal",
                entryId: "terms",
                routeKey: "root:terms",
              },
              kind: "legal",
              path: PATHS[market].legal,
              requiredText: [`${market} legal`],
            },
          ],
        },
      ])
    ),
    proofRequirements: [
      {
        assertions: [
          { equals: "four-market-catalog-readiness", path: ["scope"] },
        ],
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
    ],
    schemaVersion: 1,
    xDefaultMarket: "sk",
  })

const createRuntimeConfig = async (directory, fixture) => {
  const backendIdentity = {
    backendBuildHash: "backend-build-1",
    backendDeploymentId: "backend-deployment-1",
    backendReleaseSha: BACKEND_RELEASE_SHA,
    backendSlot: "green",
    databaseInstanceFingerprint: DATABASE_INSTANCE_FINGERPRINT,
    environmentId: ENVIRONMENT_ID,
    releaseId: RELEASE_ID,
  }
  const audit = {
    issues: [],
    kind: "herbatika-four-market-catalog-readiness",
    markets: MARKET_CODES.map((market) => ({ market, ready: true })),
    ready: true,
    schemaVersion: 1,
    scope: "four-market-catalog-readiness",
    sharedIdentity: { matched: true },
    summary: { errors: 0 },
  }
  const registrySha = Object.fromEntries(
    MARKET_CODES.map((market) => [
      market,
      `${market.charCodeAt(0)}`.repeat(64).slice(0, 64),
    ])
  )
  const runtimeMarkets = Object.fromEntries(
    MARKET_CODES.map((market) => [
      market,
      {
        acceptedHosts: [`${market}.shop.invalid`],
        origin: `https://${market}.shop.invalid`,
      },
    ])
  )
  const proofValues = {
    catalog: {
      audit,
      auditSha256: sha256(`${canonicalJson(audit)}\n`),
      authorities: {
        scope: { path: "scope.json", sha256: "1".repeat(64) },
        translations: { path: "translations.json", sha256: "2".repeat(64) },
      },
      capturedAt: "2026-08-21T09:00:00.000Z",
      kind: "herbatika-four-market-catalog-live-readiness",
      releaseIdentity: backendIdentity,
      schemaVersion: 1,
      scope: "four-market-catalog-readiness",
    },
    commerce: {
      authority: { path: "commerce-authority.json", sha256: "3".repeat(64) },
      capturedAt: "2026-08-21T09:00:00.000Z",
      kind: "four-market-commerce-collection",
      proofs: Object.fromEntries(
        MARKET_CODES.map((market) => [
          market,
          { path: `${market}.json`, sha256: "4".repeat(64) },
        ])
      ),
      ready: true,
      releaseIdentity: backendIdentity,
      schemaVersion: 1,
    },
    hostname: {
      capturedAt: "2026-08-21T09:00:00.000Z",
      issues: [],
      kind: "herbatika-four-market-hostname-readiness",
      markets: Object.fromEntries(
        MARKET_CODES.map((market) => [
          market,
          {
            acceptedHosts: runtimeMarkets[market].acceptedHosts,
            origin: runtimeMarkets[market].origin,
          },
        ])
      ),
      noClobber: { dnsUnchanged: true },
      ready: true,
      releaseIdentity: {
        buildHash: BUILD_HASH,
        deploymentId: "storefront-deployment-1",
        releaseSha: STOREFRONT_RELEASE_SHA,
        slot: "blue",
      },
      schemaVersion: 1,
      zane: {},
    },
    meilisearch: {
      aggregate: { state: "converged" },
      environmentId: ENVIRONMENT_ID,
      kind: "herbatika-four-market-meilisearch-convergence-proof",
      releaseId: RELEASE_ID,
      schemaVersion: 1,
    },
    staticTaxonomy: {
      environmentId: ENVIRONMENT_ID,
      kind: "herbatika-four-market-static-taxonomy-convergence",
      markets: Object.fromEntries(
        MARKET_CODES.map((market) => [
          market,
          {
            projections: [
              {
                indexPolicy: "indexable",
                matchMode: "exact",
                path: PATHS[market].static,
                routeKey: "root:about",
              },
              {
                indexPolicy: "indexable",
                matchMode: "exact",
                path: PATHS[market].legal,
                routeKey: "root:terms",
              },
            ],
            segmentRegistry: {
              ref: `segment-registry-g1/${market}.json`,
              sha256: registrySha[market],
            },
          },
        ])
      ),
      migrationLedgerSha256: "5".repeat(64),
      populationManifestSha256: `sha256:${"6".repeat(64)}`,
      releaseId: RELEASE_ID,
      schemaVersion: 1,
      state: "converged",
      taxonomySha256: "7".repeat(64),
    },
    urlRegistry: {
      environmentId: ENVIRONMENT_ID,
      kind: "herbatika-four-market-urlr-convergence",
      markets: Object.fromEntries(
        MARKET_CODES.map((market) => [market, { binding: { market } }])
      ),
      migrationLedgerSha256: "5".repeat(64),
      populationManifestSha256: `sha256:${"6".repeat(64)}`,
      releaseId: RELEASE_ID,
      schemaVersion: 1,
      state: "converged",
    },
  }
  const proofRefs = {}
  for (const [name, proof] of Object.entries(proofValues)) {
    const path = join(directory, `${name}.json`)
    const contents = `${canonicalJson(proof)}\n`
    await writeFile(path, contents)
    proofRefs[name] = { path, sha256: sha256(contents) }
  }
  return parseRuntimeConfig(
    {
      markets: runtimeMarkets,
      producerEvidence: {
        segmentRegistry: Object.fromEntries(
          MARKET_CODES.map((market) => [
            market,
            {
              path: join(directory, `${market}-g1.json`),
              sha256: registrySha[market],
            },
          ])
        ),
        staticContentPlan: {
          path: join(directory, "static-plan.json"),
          sha256: "8".repeat(64),
        },
        staticContentRoot: directory,
      },
      proofRefs,
      releaseId: RELEASE_ID,
      releaseIdentity: {
        backend: {
          buildHash: backendIdentity.backendBuildHash,
          deploymentId: backendIdentity.backendDeploymentId,
          releaseSha: backendIdentity.backendReleaseSha,
          slot: backendIdentity.backendSlot,
        },
        databaseFingerprint: DATABASE_FINGERPRINT,
        databaseInstanceFingerprint: DATABASE_INSTANCE_FINGERPRINT,
        environmentId: ENVIRONMENT_ID,
        storefront: proofValues.hostname.releaseIdentity,
      },
      schemaVersion: 1,
    },
    fixture
  )
}

const producerEvidenceFor = (runtimeConfig) => ({
  markets: Object.fromEntries(
    MARKET_CODES.map((market) => {
      const identities = [
        { contentKind: "about", entryId: "about", routeKey: "root:about" },
        {
          contentKind: "cms-legal",
          entryId: "terms",
          routeKey: "root:terms",
        },
      ]
      const staticEntries = identities.map((identity, index) => ({
        contentKind: identity.contentKind,
        entryId: identity.entryId,
        payloadRef: `market-static-content/${market}/payload/${identity.entryId}.json`,
        payloadSha256: `${index + 3}`.repeat(64),
        ref: `market-static-content/${market}/${identity.entryId}.json`,
        sha256: `${index + 5}`.repeat(64),
      }))
      const approvalEntries = (role) =>
        identities.map((identity, index) => ({
          contentKind: identity.contentKind,
          entryId: identity.entryId,
          ref: `market-static-content/${market}/approvals/${role}/${identity.entryId}.json`,
          sha256: `${role === "editorial" ? index + 7 : index + 9}`.repeat(64),
          sourceSnapshotSha256: "1".repeat(64),
          staticContentArtifactRef: staticEntries[index].ref,
          staticContentArtifactSha256: staticEntries[index].sha256,
        }))
      const editorialEntries = approvalEntries("editorial")
      const legalEntries = approvalEntries("legal")
      const routes = identities.map((identity, index) => ({
        editorialApproval: {
          artifact: { sha256: editorialEntries[index].sha256 },
        },
        legalApproval: { artifact: { sha256: legalEntries[index].sha256 } },
        routeKey: identity.routeKey,
        staticContentArtifact: {
          ref: staticEntries[index].ref,
          sha256: staticEntries[index].sha256,
        },
      }))
      return [
        market,
        {
          collections: {
            editorialApproval: {
              count: editorialEntries.length,
              entries: editorialEntries,
              sha256: "9".repeat(64),
            },
            legalApproval: {
              count: legalEntries.length,
              entries: legalEntries,
              sha256: "a".repeat(64),
            },
            staticContent: {
              count: staticEntries.length,
              entries: staticEntries,
              sha256: "b".repeat(64),
            },
          },
          locale: MARKET_LOCALES[market],
          segmentRegistry: {
            reviewedRegistrySha256: "c".repeat(64),
            routes,
            sha256:
              runtimeConfig.producerEvidence.segmentRegistry[market].sha256,
            taxonomySha256: "7".repeat(64),
          },
        },
      ]
    })
  ),
  planArtifactSha256: runtimeConfig.producerEvidence.staticContentPlan.sha256,
  planSha256: "f".repeat(64),
})

const generateLiveReadiness = (options) => {
  const { producerEvidenceTransform, ...gateOptions } = options
  return generateLiveReadinessRaw({
    ...gateOptions,
    loadProducerEvidenceImpl: () => {
      const evidence = producerEvidenceFor(options.runtimeConfig)
      producerEvidenceTransform?.(evidence)
      return evidence
    },
  })
}

const marketForOrigin = (url) =>
  MARKET_CODES.find(
    (market) => new URL(url).hostname === `${market}.shop.invalid`
  )

const pageKind = (market, pathname) =>
  Object.entries(PATHS[market]).find(([, path]) => path === pathname)?.[0]

/** @param {Record<string, any>} options */
const htmlFor = (options) => {
  const {
    decoyCurrency,
    hreflangTargetPath,
    market,
    pathKind,
    omitCurrency,
    omitHreflang,
  } = options
  const canonical = `https://${market}.shop.invalid${PATHS[market][pathKind] ?? "/"}`
  const alternatePathKind = pathKind ?? "static"
  const alternates = MARKET_CODES.map((alternateMarket) => {
    if (omitHreflang === alternateMarket) {
      return ""
    }
    const href =
      hreflangTargetPath?.market === alternateMarket
        ? `https://${alternateMarket}.shop.invalid${hreflangTargetPath.path}`
        : `https://${alternateMarket}.shop.invalid${
            pathKind ? PATHS[alternateMarket][alternatePathKind] : "/"
          }`
    return `<link rel="alternate" hreflang="${MARKET_LOCALES[alternateMarket]}" href="${href}">`
  }).join("")
  const xDefault = `https://sk.shop.invalid${
    pathKind ? PATHS.sk[alternatePathKind] : "/"
  }`
  let currencyMarkup = `<script type="application/ld+json">{"priceCurrency":"${CURRENCIES[market]}"}</script>`
  if (omitCurrency) {
    currencyMarkup = decoyCurrency
      ? `<meta name="currencyCode" content="${CURRENCIES[market]}">`
      : ""
  }
  const body = pathKind
    ? `${market} ${pathKind}${currencyMarkup}`
    : `${market} root`
  return `<!doctype html><html lang="${MARKET_LOCALES[market]}"><head><link rel="canonical" href="${canonical}">${alternates}<link rel="alternate" hreflang="x-default" href="${xDefault}"></head><body>${body}</body></html>`
}

/** @param {Record<string, any>} [options] */
const createFetch = (options = {}) => {
  const {
    mixedBuildMarket,
    decoyCurrencyMarket,
    hreflangTargetPath,
    omitCurrencyMarket,
    omitHreflang,
    omitLegalMarket,
    unknownStatus = 421,
    wildcardUnknownStatus = 421,
  } = options
  return (
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: mock transport deliberately covers every live response lane
    (input, init = {}) => {
      const url = new URL(input)
      const host = new Headers(init.headers).get("host")
      const acceptedMarket = MARKET_CODES.find(
        (candidateMarket) => host === `${candidateMarket}.shop.invalid`
      )
      if (host?.startsWith("unroutable-")) {
        return new Response("misdirected", {
          status: host.endsWith(".shop.invalid")
            ? wildcardUnknownStatus
            : unknownStatus,
        })
      }
      const market = acceptedMarket ?? marketForOrigin(url)
      assert.ok(market, `unexpected URL ${url}`)
      const headers = {
        "content-type": "text/html; charset=utf-8",
        "x-zane-dpl-hash":
          mixedBuildMarket === market ? "other-build" : BUILD_HASH,
        "x-zane-dpl-slot": "blue",
      }
      if (host) {
        return new Response(htmlFor({ market }), { headers, status: 200 })
      }
      if (url.pathname === "/sitemap.xml") {
        return new Response(
          `<sitemapindex><sitemap><loc>${url.origin}/sitemap-pages.xml</loc></sitemap></sitemapindex>`,
          { headers, status: 200 }
        )
      }
      if (url.pathname === "/sitemap-pages.xml") {
        const pagePaths = Object.entries(PATHS[market])
          .filter(
            ([candidateKind]) =>
              !(candidateKind === "legal" && omitLegalMarket === market)
          )
          .map(([, path]) => `<url><loc>${url.origin}${path}</loc></url>`)
          .join("")
        return new Response(`<urlset>${pagePaths}</urlset>`, {
          headers,
          status: 200,
        })
      }
      const kind = pageKind(market, url.pathname)
      assert.ok(kind, `unexpected page ${url}`)
      return new Response(
        htmlFor({
          market,
          decoyCurrency: decoyCurrencyMarket === market && kind === "catalog",
          hreflangTargetPath:
            hreflangTargetPath?.market === market
              ? hreflangTargetPath.target
              : undefined,
          omitCurrency: omitCurrencyMarket === market && kind === "catalog",
          omitHreflang:
            omitHreflang?.market === market ? omitHreflang.target : undefined,
          pathKind: kind,
        }),
        { headers, status: 200 }
      )
    }
  )
}

const setup = async () => {
  const directory = await mkdtemp(join(tmpdir(), "herbatika-market-gate-"))
  const fixture = createFixture()
  const runtimeConfig = await createRuntimeConfig(directory, fixture)
  return { directory, fixture, runtimeConfig }
}

const rewriteProof = async (runtimeConfig, name, mutate) => {
  const reference = runtimeConfig.proofRefs[name]
  const proof = JSON.parse(await readFile(reference.path, "utf8"))
  mutate(proof)
  const contents = `${canonicalJson(proof)}\n`
  await writeFile(reference.path, contents)
  reference.sha256 = sha256(contents)
}

test("accepts exhaustive four-market host, sitemap, page, SEO, currency, static and legal evidence", async () => {
  const { fixture, runtimeConfig } = await setup()
  const report = await generateLiveReadiness({
    fetchImpl: createFetch(),
    fixture,
    now: () => new Date("2026-08-21T10:00:00.000Z"),
    runtimeConfig,
  })

  assert.equal(report.ready, true)
  assert.deepEqual(report.markets, MARKET_CODES)
  assert.equal(report.shared.storefrontBuildHash, BUILD_HASH)
  assert.equal(report.evidence.markets.cz.pageCount, 3)
  assert.equal(report.evidence.hostRecognition.hu.unknown[0].status, 421)
  assert.match(report.evidenceSha256, SHA256_PATTERN)

  const envelope = signLiveReadinessProof({
    issuedAt: "2026-08-21T10:00:01.000Z",
    report,
    secret: SECRET,
  })
  assert.equal(envelope.domain, SIGNATURE_DOMAIN)
  assert.deepEqual(
    verifyLiveReadinessProof({ envelope, secret: SECRET }),
    report
  )
})

test("fails closed for an unknown Host response other than 421", async () => {
  const { fixture, runtimeConfig } = await setup()
  await assert.rejects(
    generateLiveReadiness({
      fetchImpl: createFetch({ unknownStatus: 404 }),
      fixture,
      runtimeConfig,
    }),
    UNKNOWN_HOST_ERROR_PATTERN
  )
})

test("rejects mixed storefront deployment identity", async () => {
  const { fixture, runtimeConfig } = await setup()
  await assert.rejects(
    generateLiveReadiness({
      fetchImpl: createFetch({ mixedBuildMarket: "hu" }),
      fixture,
      runtimeConfig,
    }),
    DEPLOYMENT_ERROR_PATTERN
  )
})

test("rejects incomplete hreflang", async () => {
  const { fixture, runtimeConfig } = await setup()
  await assert.rejects(
    generateLiveReadiness({
      fetchImpl: createFetch({
        omitHreflang: { market: "cz", target: "ro" },
      }),
      fixture,
      runtimeConfig,
    }),
    HREFLANG_ERROR_PATTERN
  )
})

test("rejects missing legal sitemap coverage", async () => {
  const { fixture, runtimeConfig } = await setup()
  await assert.rejects(
    generateLiveReadiness({
      fetchImpl: createFetch({ omitLegalMarket: "ro" }),
      fixture,
      runtimeConfig,
    }),
    LEGAL_PAGE_ERROR_PATTERN
  )
})

test("rejects missing exact-market currency evidence", async () => {
  const { fixture, runtimeConfig } = await setup()
  await assert.rejects(
    generateLiveReadiness({
      fetchImpl: createFetch({ omitCurrencyMarket: "cz" }),
      fixture,
      runtimeConfig,
    }),
    CURRENCY_ERROR_PATTERN
  )
})

test("rejects generic currency decoys outside explicit commerce data", async () => {
  const { fixture, runtimeConfig } = await setup()
  await assert.rejects(
    generateLiveReadiness({
      fetchImpl: createFetch({
        decoyCurrencyMarket: "cz",
        omitCurrencyMarket: "cz",
      }),
      fixture,
      runtimeConfig,
    }),
    CURRENCY_ERROR_PATTERN
  )
})

test("rejects a currency prefix with no sitemap-backed catalog page", async () => {
  const { fixture, runtimeConfig } = await setup()
  fixture.markets.hu.currencyPathPrefixes.push("/never-indexed/")
  await assert.rejects(
    generateLiveReadiness({ fetchImpl: createFetch(), fixture, runtimeConfig }),
    PREFIX_COVERAGE_ERROR_PATTERN
  )
})

test("rejects hreflang targets absent from the target sitemap", async () => {
  const { fixture, runtimeConfig } = await setup()
  await assert.rejects(
    generateLiveReadiness({
      fetchImpl: createFetch({
        hreflangTargetPath: {
          market: "cz",
          target: { market: "ro", path: "/not-in-sitemap" },
        },
      }),
      fixture,
      runtimeConfig,
    }),
    HREFLANG_TARGET_ERROR_PATTERN
  )
})

test("rejects non-reciprocal hreflang pairs", async () => {
  const { fixture, runtimeConfig } = await setup()
  await assert.rejects(
    generateLiveReadiness({
      fetchImpl: createFetch({
        hreflangTargetPath: {
          market: "cz",
          target: { market: "ro", path: PATHS.ro.static },
        },
      }),
      fixture,
      runtimeConfig,
    }),
    HREFLANG_RECIPROCAL_ERROR_PATTERN
  )
})

test("rejects wildcard routing for same-zone unknown hosts", async () => {
  const { fixture, runtimeConfig } = await setup()
  await assert.rejects(
    generateLiveReadiness({
      fetchImpl: createFetch({ wildcardUnknownStatus: 200 }),
      fixture,
      runtimeConfig,
    }),
    UNKNOWN_HOST_ERROR_PATTERN
  )
})

test("rejects a hash-valid proof from a stale release", async () => {
  const { fixture, runtimeConfig } = await setup()
  await rewriteProof(runtimeConfig, "meilisearch", (proof) => {
    proof.releaseId = "stale-release"
  })
  await assert.rejects(
    generateLiveReadiness({ fetchImpl: createFetch(), fixture, runtimeConfig }),
    STALE_PROOF_ERROR_PATTERN
  )
})

test("rejects empty or substituted hostname proof market bindings", async () => {
  {
    const { fixture, runtimeConfig } = await setup()
    await rewriteProof(runtimeConfig, "hostname", (proof) => {
      proof.markets = {}
    })
    await assert.rejects(
      generateLiveReadiness({
        fetchImpl: createFetch(),
        fixture,
        runtimeConfig,
      }),
      HOSTNAME_MARKETS_ERROR_PATTERN
    )
  }
  for (const mutate of [
    (proof) => {
      proof.markets.cz.origin = "https://substituted.invalid"
    },
    (proof) => {
      proof.markets.cz.acceptedHosts.pop()
    },
    (proof) => {
      proof.markets.cz.acceptedHosts.push("extra.cz.shop.invalid")
    },
  ]) {
    const { fixture, runtimeConfig } = await setup()
    await rewriteProof(runtimeConfig, "hostname", mutate)
    await assert.rejects(
      generateLiveReadiness({
        fetchImpl: createFetch(),
        fixture,
        runtimeConfig,
      }),
      HOSTNAME_BINDING_ERROR_PATTERN
    )
  }
})

test("rejects rendered static/legal pages not mapped to their approved entry", async () => {
  const { fixture, runtimeConfig } = await setup()
  const staticPage = fixture.markets.cz.requiredPages.find(
    ({ kind }) => kind === "static"
  )
  staticPage.path = PATHS.cz.legal
  await assert.rejects(
    generateLiveReadiness({ fetchImpl: createFetch(), fixture, runtimeConfig }),
    STATIC_PATH_BINDING_ERROR_PATTERN
  )
})

test("rejects approved collection entry hash substitution", async () => {
  const { fixture, runtimeConfig } = await setup()
  await assert.rejects(
    generateLiveReadiness({
      fetchImpl: createFetch(),
      fixture,
      producerEvidenceTransform: (evidence) => {
        evidence.markets.hu.collections.staticContent.entries[0].sha256 =
          "0".repeat(64)
      },
      runtimeConfig,
    }),
    STATIC_HASH_BINDING_ERROR_PATTERN
  )
})

test("rejects fixture currency tuple and forbidden-set weakening", () => {
  const wrongCurrency = structuredClone(createFixture())
  wrongCurrency.markets.cz.currencyCode = "EUR"
  assert.throws(() => parseFixture(wrongCurrency), WRONG_CURRENCY_ERROR_PATTERN)

  const weakenedForbidden = structuredClone(createFixture())
  weakenedForbidden.markets.ro.forbiddenCurrencyCodes.pop()
  assert.throws(
    () => parseFixture(weakenedForbidden),
    WEAK_FORBIDDEN_ERROR_PATTERN
  )
})

test("rejects a fixture that weakens the built-in proof contract", () => {
  const fixture = structuredClone(createFixture())
  fixture.proofRequirements.pop()
  assert.throws(() => parseFixture(fixture), BUILT_IN_PROOF_ERROR_PATTERN)
})

test("hash-binds proof refs and never clobbers private output", async () => {
  const { directory, fixture, runtimeConfig } = await setup()
  runtimeConfig.proofRefs.catalog.sha256 = "0".repeat(64)
  await assert.rejects(
    generateLiveReadiness({ fetchImpl: createFetch(), fixture, runtimeConfig }),
    PROOF_HASH_ERROR_PATTERN
  )

  const catalogReference = runtimeConfig.proofRefs.catalog
  const catalog = JSON.parse(await readFile(catalogReference.path, "utf8"))
  const noncanonical = `${JSON.stringify(catalog, null, 2)}\n`
  await writeFile(catalogReference.path, noncanonical)
  catalogReference.sha256 = sha256(noncanonical)
  await assert.rejects(
    generateLiveReadiness({ fetchImpl: createFetch(), fixture, runtimeConfig }),
    CANONICAL_PROOF_ERROR_PATTERN
  )

  const output = join(directory, "private.json")
  await writePrivateJsonNoClobber(output, { secret: false })
  assert.equal((await stat(output)).mode.toString(8).slice(-3), "600")
  assert.equal(await readFile(output, "utf8"), '{"secret":false}\n')
  await assert.rejects(
    writePrivateJsonNoClobber(output, { clobbered: true }),
    EXISTS_ERROR_PATTERN
  )
})

test("domain-separated signature rejects tampering", async () => {
  const { fixture, runtimeConfig } = await setup()
  const report = await generateLiveReadiness({
    fetchImpl: createFetch(),
    fixture,
    runtimeConfig,
  })
  const envelope = signLiveReadinessProof({
    issuedAt: "2026-08-21T10:00:01.000Z",
    report,
    secret: SECRET,
  })
  envelope.report.shared.storefrontSlot = "green"
  assert.throws(
    () => verifyLiveReadinessProof({ envelope, secret: SECRET }),
    REPORT_HASH_ERROR_PATTERN
  )
})
