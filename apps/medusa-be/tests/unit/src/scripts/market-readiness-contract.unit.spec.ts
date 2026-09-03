import { describe, expect, it } from "vitest"
import {
  canonicalJsonWithLf,
  parseCanonicalJsonWithLf,
  sha256CanonicalJsonWithLf,
} from "../../../../src/scripts/market-readiness/canonical"
import {
  FOUR_MARKET_RELEASE_ACCEPTANCE_HMAC_DOMAIN,
  hashFourMarketReleaseAcceptance,
  MARKET_READINESS_MARKETS,
  parseFourMarketReleaseAcceptance,
  parseSignedFourMarketReleaseAcceptanceArtifact,
  serializeFourMarketReleaseAcceptance,
  signFourMarketReleaseAcceptance,
  verifySignedFourMarketReleaseAcceptance,
} from "../../../../src/scripts/market-readiness/contracts"

const SHA256_A = "a".repeat(64)
const SHA256_B = "b".repeat(64)
const RELEASE_SHA = "c".repeat(40)
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/
const INTEGRITY_REJECTION = /payload hash|signature/

const artifact = (path: string, sha256 = SHA256_A) => ({ path, sha256 })

const marketProof = (market: string) => ({
  apiIsolation: artifact(`markets/${market}/api-isolation.json`),
  authentication: artifact(`markets/${market}/authentication.json`),
  catalog: artifact(`markets/${market}/catalog.json`),
  checkout: artifact(`markets/${market}/checkout.json`),
  commerce: artifact(`markets/${market}/commerce.json`),
  editorialApproval: artifact(`markets/${market}/editorial-approval.json`),
  hostname: artifact(`markets/${market}/hostname.json`),
  legalApproval: artifact(`markets/${market}/legal-approval.json`),
  localization: artifact(`markets/${market}/localization.json`),
  meilisearch: artifact(`markets/${market}/meilisearch.json`),
  notifications: artifact(`markets/${market}/notifications.json`),
  observability: artifact(`markets/${market}/observability.json`),
  segmentRegistry: artifact(`markets/${market}/segment-registry.json`),
  seo: artifact(`markets/${market}/seo.json`),
  staticContent: artifact(`markets/${market}/static-content.json`),
  urlRegistry: artifact(`markets/${market}/url-registry.json`),
})

const validAcceptance = () => ({
  anchors: {
    legacyRo: {
      catalogReadiness: artifact("legacy/ro/catalog-readiness.json"),
      signedBackendProof: artifact("legacy/ro/signed-backend-proof.json"),
      twoPhaseReceipt: artifact("legacy/ro/two-phase-receipt.json"),
    },
    shared: {
      catalogIdentity: artifact("shared/catalog-identity.json"),
      commerceCollection: artifact(
        "operations/four-market-commerce-collection.json"
      ),
      inventory: artifact("shared/inventory.json"),
      liveGate: artifact("shared/live-gate.json"),
      staticTaxonomy: artifact("shared/static-taxonomy.json"),
    },
  },
  generatedAt: "2026-08-21T12:34:56.000Z",
  kind: "herbatika-four-market-release-acceptance",
  marketBindings: {
    cz: {
      acceptedHosts: ["herbatica.cz", "www.herbatica.cz"],
      authoritySha256: SHA256_B,
      countryCode: "cz",
      currencyCode: "czk",
      locale: "cs-CZ",
      market: "cz",
      origin: "https://herbatica.cz",
      publishableKeyId: "pk-cz",
      regionId: "reg-cz",
      salesChannelId: "sc-cz",
    },
    hu: {
      acceptedHosts: ["herbatica.hu", "www.herbatica.hu"],
      authoritySha256: SHA256_B,
      countryCode: "hu",
      currencyCode: "huf",
      locale: "hu-HU",
      market: "hu",
      origin: "https://herbatica.hu",
      publishableKeyId: "pk-hu",
      regionId: "reg-hu",
      salesChannelId: "sc-hu",
    },
    ro: {
      acceptedHosts: ["herbatica.ro", "www.herbatica.ro"],
      authoritySha256: SHA256_B,
      countryCode: "ro",
      currencyCode: "ron",
      locale: "ro-RO",
      market: "ro",
      origin: "https://herbatica.ro",
      publishableKeyId: "pk-ro",
      regionId: "reg-ro",
      salesChannelId: "sc-ro",
    },
    sk: {
      acceptedHosts: ["herbatica.sk", "www.herbatica.sk"],
      authoritySha256: SHA256_B,
      countryCode: "sk",
      currencyCode: "eur",
      locale: "sk-SK",
      market: "sk",
      origin: "https://herbatica.sk",
      publishableKeyId: "pk-sk",
      regionId: "reg-sk",
      salesChannelId: "sc-sk",
    },
  },
  markets: ["sk", "cz", "hu", "ro"],
  proofs: {
    markets: {
      cz: marketProof("cz"),
      hu: marketProof("hu"),
      ro: marketProof("ro"),
      sk: marketProof("sk"),
    },
  },
  releaseId: "four-market-2026-08-21",
  releaseIdentity: {
    backend: {
      buildHash: "backend-build",
      deploymentId: "backend-deployment",
      releaseSha: RELEASE_SHA,
      slot: "green",
    },
    databaseFingerprint: SHA256_A,
    databaseInstanceFingerprint: SHA256_B,
    environmentId: "production",
    storefront: {
      buildHash: "storefront-build",
      deploymentId: "storefront-deployment",
      releaseSha: RELEASE_SHA,
      slot: "green",
    },
  },
  schemaVersion: 2,
})

describe("four-market readiness canonical artifacts", () => {
  it("serializes one deterministic canonical JSON record with exactly one LF", () => {
    const value = {
      z: [{ b: 2, a: 1 }],
      a: "čtyři trhy",
    }
    const canonical = '{"a":"čtyři trhy","z":[{"a":1,"b":2}]}\n'

    expect(canonicalJsonWithLf(value)).toBe(canonical)
    expect(parseCanonicalJsonWithLf(canonical)).toEqual(value)
    expect(sha256CanonicalJsonWithLf(value)).toBe(
      "f59f5953bfd8fb9e1c994c0241540f61cfc58f2d33311331c8542ce4f3fdc9b2"
    )
  })

  it.each([
    '{"a":1}',
    '{"a":1}\r\n',
    '{"a":1}\n\n',
    '{ "a": 1 }\n',
  ])("rejects non-canonical or non-LF input: %j", (input) => {
    expect(() => parseCanonicalJsonWithLf(input)).toThrow(
      "Artifact must be canonical JSON with exactly one trailing LF"
    )
  })
})

describe("immutable four-market release acceptance v2", () => {
  it("parses the exact four-market schema and freezes every accepted section", () => {
    const parsed = parseFourMarketReleaseAcceptance(validAcceptance())

    expect(parsed.markets).toEqual(["sk", "cz", "hu", "ro"])
    expect(Object.isFrozen(MARKET_READINESS_MARKETS)).toBe(true)
    expect(parsed.marketBindings.cz.currencyCode).toBe("czk")
    expect(parsed.marketBindings.hu.locale).toBe("hu-HU")
    expect(Object.isFrozen(parsed)).toBe(true)
    expect(Object.isFrozen(parsed.marketBindings)).toBe(true)
    expect(Object.isFrozen(parsed.marketBindings.sk.acceptedHosts)).toBe(true)
  })

  it("serializes and hashes the parsed contract as exact canonical JSON plus LF", () => {
    const parsed = parseFourMarketReleaseAcceptance(validAcceptance())
    const serialized = serializeFourMarketReleaseAcceptance(parsed)

    expect(serialized.endsWith("\n")).toBe(true)
    expect(serialized.endsWith("\n\n")).toBe(false)
    expect(parseCanonicalJsonWithLf(serialized)).toEqual(parsed)
    expect(hashFourMarketReleaseAcceptance(parsed)).toMatch(LOWERCASE_SHA256)
  })

  it.each([
    ["wrong market order", (value: any) => value.markets.reverse()],
    [
      "extra top-level key",
      (value: any) => {
        value.unreviewed = true
      },
    ],
    [
      "wrong locale",
      (value: any) => {
        value.marketBindings.cz.locale = "sk-SK"
      },
    ],
    [
      "origin not first accepted host",
      (value: any) => value.marketBindings.hu.acceptedHosts.reverse(),
    ],
    [
      "unsafe artifact path",
      (value: any) => {
        value.proofs.markets.ro.catalog.path = "../receipt.json"
      },
    ],
  ])("rejects %s", (_label, mutate) => {
    const value = validAcceptance()
    mutate(value)
    expect(() => parseFourMarketReleaseAcceptance(value)).toThrow(
      "Four-market release acceptance"
    )
  })

  it("signs and verifies with explicit HMAC domain separation", () => {
    const secret = "release-acceptance-secret-material-32-bytes-minimum"
    const signed = signFourMarketReleaseAcceptance(
      validAcceptance(),
      "release-key-2026-08",
      secret
    )
    const serialized = canonicalJsonWithLf(signed)
    const parsed = parseSignedFourMarketReleaseAcceptanceArtifact(serialized)

    expect(parsed.authority.domain).toBe(
      FOUR_MARKET_RELEASE_ACCEPTANCE_HMAC_DOMAIN
    )
    expect(parsed.authority.payloadSha256).toBe(
      hashFourMarketReleaseAcceptance(parsed.acceptance)
    )
    expect(
      verifySignedFourMarketReleaseAcceptance(
        parsed,
        secret,
        "release-key-2026-08"
      ).acceptance.releaseId
    ).toBe("four-market-2026-08-21")
  })

  it("rejects payload, authority and key substitution", () => {
    const secret = "release-acceptance-secret-material-32-bytes-minimum"
    const signed = signFourMarketReleaseAcceptance(
      validAcceptance(),
      "release-key-2026-08",
      secret
    )
    const tampered = JSON.parse(JSON.stringify(signed))
    tampered.acceptance.releaseId = "four-market-substituted"
    const substitutedKey = JSON.parse(JSON.stringify(signed))
    substitutedKey.authority.keyId = "release-key-substituted"
    const substitutedDomain = JSON.parse(JSON.stringify(signed))
    substitutedDomain.authority.domain = "another-release-domain"

    expect(() =>
      verifySignedFourMarketReleaseAcceptance(tampered, secret)
    ).toThrow(INTEGRITY_REJECTION)
    expect(() =>
      verifySignedFourMarketReleaseAcceptance(substitutedKey, secret)
    ).toThrow("signature is invalid")
    expect(() =>
      verifySignedFourMarketReleaseAcceptance(substitutedDomain, secret)
    ).toThrow("signed authority")
    expect(() =>
      verifySignedFourMarketReleaseAcceptance(
        signed,
        secret,
        "another-release-key"
      )
    ).toThrow("key ID is invalid")
    expect(() =>
      verifySignedFourMarketReleaseAcceptance(
        signed,
        "another-release-acceptance-secret-material-32-bytes"
      )
    ).toThrow("signature is invalid")
  })
})
