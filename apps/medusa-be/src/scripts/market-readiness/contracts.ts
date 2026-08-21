import {
  canonicalJsonWithLf,
  equalLowercaseSha256,
  hmacSha256DomainSeparated,
  parseCanonicalJsonWithLf,
  sha256CanonicalJsonWithLf,
} from "./canonical"

const SHA256 = /^[a-f0-9]{64}$/
const RELEASE_SHA = /^[a-f0-9]{40}$/
const SAFE_ID = /^[A-Za-z0-9._:-]{1,160}$/
const ARTIFACT_PATH =
  /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)[A-Za-z0-9._/-]{1,320}\.json$/
const HOSTNAME =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/
const HMAC_SHA256_SIGNATURE = /^hmac-sha256:[a-f0-9]{64}$/

export const MARKET_READINESS_MARKETS = Object.freeze([
  "sk",
  "cz",
  "hu",
  "ro",
] as const)
export type MarketReadinessMarket = (typeof MARKET_READINESS_MARKETS)[number]

export const FOUR_MARKET_RELEASE_ACCEPTANCE_HMAC_DOMAIN =
  "herbatika:four-market-release-acceptance:v2" as const

const MARKET_CONTRACT = {
  cz: { countryCode: "cz", currencyCode: "czk", locale: "cs-CZ" },
  hu: { countryCode: "hu", currencyCode: "huf", locale: "hu-HU" },
  ro: { countryCode: "ro", currencyCode: "ron", locale: "ro-RO" },
  sk: { countryCode: "sk", currencyCode: "eur", locale: "sk-SK" },
} as const satisfies Record<
  MarketReadinessMarket,
  Readonly<{ countryCode: string; currencyCode: string; locale: string }>
>

export type MarketReadinessArtifactRef = Readonly<{
  path: string
  sha256: string
}>

export type MarketReleaseBinding = Readonly<{
  acceptedHosts: readonly string[]
  authoritySha256: string
  countryCode: "sk" | "cz" | "hu" | "ro"
  currencyCode: "eur" | "czk" | "huf" | "ron"
  locale: "sk-SK" | "cs-CZ" | "hu-HU" | "ro-RO"
  market: MarketReadinessMarket
  origin: string
  publishableKeyId: string
  regionId: string
  salesChannelId: string
}>

export type MarketReleaseProofRefs = Readonly<{
  apiIsolation: MarketReadinessArtifactRef
  authentication: MarketReadinessArtifactRef
  catalog: MarketReadinessArtifactRef
  checkout: MarketReadinessArtifactRef
  commerce: MarketReadinessArtifactRef
  editorialApproval: MarketReadinessArtifactRef
  hostname: MarketReadinessArtifactRef
  legalApproval: MarketReadinessArtifactRef
  localization: MarketReadinessArtifactRef
  meilisearch: MarketReadinessArtifactRef
  notifications: MarketReadinessArtifactRef
  observability: MarketReadinessArtifactRef
  segmentRegistry: MarketReadinessArtifactRef
  seo: MarketReadinessArtifactRef
  staticContent: MarketReadinessArtifactRef
  urlRegistry: MarketReadinessArtifactRef
}>

export type MarketReleaseDeploymentIdentity = Readonly<{
  buildHash: string
  deploymentId: string
  releaseSha: string
  slot: "blue" | "green"
}>

export type FourMarketReleaseAcceptance = Readonly<{
  anchors: Readonly<{
    legacyRo: Readonly<{
      catalogReadiness: MarketReadinessArtifactRef
      signedBackendProof: MarketReadinessArtifactRef
      twoPhaseReceipt: MarketReadinessArtifactRef
    }>
    shared: Readonly<{
      catalogIdentity: MarketReadinessArtifactRef
      commerceCollection: MarketReadinessArtifactRef
      inventory: MarketReadinessArtifactRef
      liveGate: MarketReadinessArtifactRef
      staticTaxonomy: MarketReadinessArtifactRef
    }>
  }>
  generatedAt: string
  kind: "herbatika-four-market-release-acceptance"
  marketBindings: Readonly<Record<MarketReadinessMarket, MarketReleaseBinding>>
  markets: typeof MARKET_READINESS_MARKETS
  proofs: Readonly<{
    markets: Readonly<Record<MarketReadinessMarket, MarketReleaseProofRefs>>
  }>
  releaseId: string
  releaseIdentity: Readonly<{
    backend: MarketReleaseDeploymentIdentity
    databaseFingerprint: string
    databaseInstanceFingerprint: string
    environmentId: string
    storefront: MarketReleaseDeploymentIdentity
  }>
  schemaVersion: 2
}>

export type FourMarketReleaseAcceptanceAuthority = Readonly<{
  algorithm: "hmac-sha256"
  domain: typeof FOUR_MARKET_RELEASE_ACCEPTANCE_HMAC_DOMAIN
  keyId: string
  payloadSha256: string
  signature: `hmac-sha256:${string}`
}>

export type SignedFourMarketReleaseAcceptance = Readonly<{
  acceptance: FourMarketReleaseAcceptance
  authority: FourMarketReleaseAcceptanceAuthority
}>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const exactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[]
): boolean =>
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort())

const invalid = (path: string): never => {
  throw new Error(`Four-market release acceptance ${path} is invalid`)
}

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) {
      deepFreeze(child)
    }
  }
  return value
}

const parseArtifactRef = (
  value: unknown,
  path: string
): MarketReadinessArtifactRef => {
  if (
    !(isRecord(value) && exactKeys(value, ["path", "sha256"])) ||
    typeof value.path !== "string" ||
    !ARTIFACT_PATH.test(value.path) ||
    value.path.includes("//") ||
    value.path
      .split("/")
      .some((segment) => segment === "." || segment === "..") ||
    typeof value.sha256 !== "string" ||
    !SHA256.test(value.sha256)
  ) {
    return invalid(path)
  }
  return { path: value.path, sha256: value.sha256 }
}

const parseDeploymentIdentity = (
  value: unknown,
  path: string
): MarketReleaseDeploymentIdentity => {
  if (
    !(
      isRecord(value) &&
      exactKeys(value, ["buildHash", "deploymentId", "releaseSha", "slot"])
    ) ||
    typeof value.buildHash !== "string" ||
    !SAFE_ID.test(value.buildHash) ||
    typeof value.deploymentId !== "string" ||
    !SAFE_ID.test(value.deploymentId) ||
    typeof value.releaseSha !== "string" ||
    !RELEASE_SHA.test(value.releaseSha) ||
    (value.slot !== "blue" && value.slot !== "green")
  ) {
    return invalid(path)
  }
  return {
    buildHash: value.buildHash,
    deploymentId: value.deploymentId,
    releaseSha: value.releaseSha,
    slot: value.slot,
  }
}

const parseOrigin = (value: unknown, firstAcceptedHost: string): string => {
  if (typeof value !== "string") {
    return invalid("marketBindings origin")
  }
  let origin: URL
  try {
    origin = new URL(value)
  } catch {
    return invalid("marketBindings origin")
  }
  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.port ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    origin.hostname !== firstAcceptedHost ||
    value !== origin.origin
  ) {
    return invalid("marketBindings origin")
  }
  return value
}

const parseBinding = (
  value: unknown,
  market: MarketReadinessMarket
): MarketReleaseBinding => {
  if (
    !(
      isRecord(value) &&
      exactKeys(value, [
        "acceptedHosts",
        "authoritySha256",
        "countryCode",
        "currencyCode",
        "locale",
        "market",
        "origin",
        "publishableKeyId",
        "regionId",
        "salesChannelId",
      ])
    ) ||
    value.market !== market ||
    value.countryCode !== MARKET_CONTRACT[market].countryCode ||
    value.currencyCode !== MARKET_CONTRACT[market].currencyCode ||
    value.locale !== MARKET_CONTRACT[market].locale ||
    typeof value.authoritySha256 !== "string" ||
    !SHA256.test(value.authoritySha256) ||
    !Array.isArray(value.acceptedHosts) ||
    value.acceptedHosts.length < 1 ||
    value.acceptedHosts.length > 16 ||
    !value.acceptedHosts.every(
      (host): host is string => typeof host === "string" && HOSTNAME.test(host)
    ) ||
    new Set(value.acceptedHosts).size !== value.acceptedHosts.length ||
    typeof value.regionId !== "string" ||
    !SAFE_ID.test(value.regionId) ||
    typeof value.salesChannelId !== "string" ||
    !SAFE_ID.test(value.salesChannelId) ||
    typeof value.publishableKeyId !== "string" ||
    !SAFE_ID.test(value.publishableKeyId)
  ) {
    return invalid(`marketBindings.${market}`)
  }
  const acceptedHosts = [...value.acceptedHosts] as [string, ...string[]]
  return {
    acceptedHosts,
    authoritySha256: value.authoritySha256,
    countryCode: MARKET_CONTRACT[market].countryCode,
    currencyCode: MARKET_CONTRACT[market].currencyCode,
    locale: MARKET_CONTRACT[market].locale,
    market,
    origin: parseOrigin(value.origin, acceptedHosts[0]),
    publishableKeyId: value.publishableKeyId,
    regionId: value.regionId,
    salesChannelId: value.salesChannelId,
  }
}

const parseMarketProof = (
  value: unknown,
  market: MarketReadinessMarket
): MarketReleaseProofRefs => {
  const keys = [
    "apiIsolation",
    "authentication",
    "catalog",
    "checkout",
    "commerce",
    "editorialApproval",
    "hostname",
    "legalApproval",
    "localization",
    "meilisearch",
    "notifications",
    "observability",
    "segmentRegistry",
    "seo",
    "staticContent",
    "urlRegistry",
  ] as const
  if (!(isRecord(value) && exactKeys(value, keys))) {
    return invalid(`proofs.markets.${market}`)
  }
  return Object.fromEntries(
    keys.map((key) => [
      key,
      parseArtifactRef(value[key], `proofs.markets.${market}.${key}`),
    ])
  ) as MarketReleaseProofRefs
}

const parseMarketRecord = <T>(
  value: unknown,
  path: string,
  parse: (entry: unknown, market: MarketReadinessMarket) => T
): Readonly<Record<MarketReadinessMarket, T>> => {
  if (!(isRecord(value) && exactKeys(value, MARKET_READINESS_MARKETS))) {
    return invalid(path)
  }
  return {
    cz: parse(value.cz, "cz"),
    hu: parse(value.hu, "hu"),
    ro: parse(value.ro, "ro"),
    sk: parse(value.sk, "sk"),
  }
}

const parseAcceptanceHeader = (
  value: unknown
): Record<string, unknown> &
  Readonly<{
    generatedAt: string
    releaseId: string
  }> => {
  if (
    !(
      isRecord(value) &&
      exactKeys(value, [
        "anchors",
        "generatedAt",
        "kind",
        "marketBindings",
        "markets",
        "proofs",
        "releaseId",
        "releaseIdentity",
        "schemaVersion",
      ])
    ) ||
    value.schemaVersion !== 2 ||
    value.kind !== "herbatika-four-market-release-acceptance" ||
    typeof value.releaseId !== "string" ||
    !SAFE_ID.test(value.releaseId) ||
    typeof value.generatedAt !== "string" ||
    Number.isNaN(Date.parse(value.generatedAt)) ||
    new Date(value.generatedAt).toISOString() !== value.generatedAt ||
    !Array.isArray(value.markets) ||
    JSON.stringify(value.markets) !== JSON.stringify(MARKET_READINESS_MARKETS)
  ) {
    return invalid("header")
  }
  return value as Record<string, unknown> &
    Readonly<{ generatedAt: string; releaseId: string }>
}

const parseReleaseIdentity = (
  value: unknown
): FourMarketReleaseAcceptance["releaseIdentity"] => {
  if (
    !(
      isRecord(value) &&
      exactKeys(value, [
        "backend",
        "databaseFingerprint",
        "databaseInstanceFingerprint",
        "environmentId",
        "storefront",
      ])
    ) ||
    typeof value.environmentId !== "string" ||
    !SAFE_ID.test(value.environmentId) ||
    typeof value.databaseFingerprint !== "string" ||
    !SHA256.test(value.databaseFingerprint) ||
    typeof value.databaseInstanceFingerprint !== "string" ||
    !SHA256.test(value.databaseInstanceFingerprint)
  ) {
    return invalid("releaseIdentity")
  }
  return {
    backend: parseDeploymentIdentity(value.backend, "releaseIdentity.backend"),
    databaseFingerprint: value.databaseFingerprint,
    databaseInstanceFingerprint: value.databaseInstanceFingerprint,
    environmentId: value.environmentId,
    storefront: parseDeploymentIdentity(
      value.storefront,
      "releaseIdentity.storefront"
    ),
  }
}

const parseAnchors = (
  value: unknown
): FourMarketReleaseAcceptance["anchors"] => {
  if (
    !(
      isRecord(value) &&
      exactKeys(value, ["legacyRo", "shared"]) &&
      isRecord(value.shared) &&
      exactKeys(value.shared, [
        "catalogIdentity",
        "commerceCollection",
        "inventory",
        "liveGate",
        "staticTaxonomy",
      ]) &&
      isRecord(value.legacyRo) &&
      exactKeys(value.legacyRo, [
        "catalogReadiness",
        "signedBackendProof",
        "twoPhaseReceipt",
      ])
    )
  ) {
    return invalid("anchors")
  }
  return {
    legacyRo: {
      catalogReadiness: parseArtifactRef(
        value.legacyRo.catalogReadiness,
        "anchors.legacyRo.catalogReadiness"
      ),
      signedBackendProof: parseArtifactRef(
        value.legacyRo.signedBackendProof,
        "anchors.legacyRo.signedBackendProof"
      ),
      twoPhaseReceipt: parseArtifactRef(
        value.legacyRo.twoPhaseReceipt,
        "anchors.legacyRo.twoPhaseReceipt"
      ),
    },
    shared: {
      catalogIdentity: parseArtifactRef(
        value.shared.catalogIdentity,
        "anchors.shared.catalogIdentity"
      ),
      commerceCollection: parseArtifactRef(
        value.shared.commerceCollection,
        "anchors.shared.commerceCollection"
      ),
      inventory: parseArtifactRef(
        value.shared.inventory,
        "anchors.shared.inventory"
      ),
      liveGate: parseArtifactRef(
        value.shared.liveGate,
        "anchors.shared.liveGate"
      ),
      staticTaxonomy: parseArtifactRef(
        value.shared.staticTaxonomy,
        "anchors.shared.staticTaxonomy"
      ),
    },
  }
}

export const parseFourMarketReleaseAcceptance = (
  value: unknown
): FourMarketReleaseAcceptance => {
  const record = parseAcceptanceHeader(value)
  const releaseIdentity = parseReleaseIdentity(record.releaseIdentity)

  const marketBindings = parseMarketRecord(
    record.marketBindings,
    "marketBindings",
    parseBinding
  )
  for (const key of [
    "regionId",
    "salesChannelId",
    "publishableKeyId",
  ] as const) {
    const bindings = MARKET_READINESS_MARKETS.map(
      (market) => marketBindings[market][key]
    )
    if (new Set(bindings).size !== bindings.length) {
      return invalid(`marketBindings duplicate ${key}`)
    }
  }
  const allHosts = MARKET_READINESS_MARKETS.flatMap(
    (market) => marketBindings[market].acceptedHosts
  )
  if (new Set(allHosts).size !== allHosts.length) {
    return invalid("marketBindings duplicate accepted host")
  }

  if (!(isRecord(record.proofs) && exactKeys(record.proofs, ["markets"]))) {
    return invalid("proofs")
  }
  const proofs = {
    markets: parseMarketRecord(
      record.proofs.markets,
      "proofs.markets",
      parseMarketProof
    ),
  }

  const anchors = parseAnchors(record.anchors)

  return deepFreeze({
    anchors,
    generatedAt: record.generatedAt,
    kind: "herbatika-four-market-release-acceptance",
    marketBindings,
    markets: [...MARKET_READINESS_MARKETS],
    proofs,
    releaseId: record.releaseId,
    releaseIdentity,
    schemaVersion: 2,
  })
}

export const serializeFourMarketReleaseAcceptance = (value: unknown): string =>
  canonicalJsonWithLf(parseFourMarketReleaseAcceptance(value))

export const parseFourMarketReleaseAcceptanceArtifact = (
  serialized: string
): FourMarketReleaseAcceptance =>
  parseFourMarketReleaseAcceptance(parseCanonicalJsonWithLf(serialized))

export const hashFourMarketReleaseAcceptance = (value: unknown): string =>
  sha256CanonicalJsonWithLf(parseFourMarketReleaseAcceptance(value))

const validSecret = (secret: unknown): secret is string =>
  typeof secret === "string" && Buffer.byteLength(secret, "utf8") >= 32

const unsignedAuthority = (
  acceptance: FourMarketReleaseAcceptance,
  keyId: string,
  payloadSha256: string
) => ({
  acceptance,
  authority: {
    algorithm: "hmac-sha256" as const,
    domain: FOUR_MARKET_RELEASE_ACCEPTANCE_HMAC_DOMAIN,
    keyId,
    payloadSha256,
  },
})

const signatureFor = (
  acceptance: FourMarketReleaseAcceptance,
  keyId: string,
  payloadSha256: string,
  secret: string
) =>
  hmacSha256DomainSeparated(
    FOUR_MARKET_RELEASE_ACCEPTANCE_HMAC_DOMAIN,
    unsignedAuthority(acceptance, keyId, payloadSha256),
    secret
  )

export const signFourMarketReleaseAcceptance = (
  value: unknown,
  keyId: string,
  secret: string
): SignedFourMarketReleaseAcceptance => {
  const acceptance = parseFourMarketReleaseAcceptance(value)
  if (!(SAFE_ID.test(keyId) && validSecret(secret))) {
    return invalid("signing key or secret")
  }
  const payloadSha256 = hashFourMarketReleaseAcceptance(acceptance)
  return deepFreeze({
    acceptance,
    authority: {
      algorithm: "hmac-sha256",
      domain: FOUR_MARKET_RELEASE_ACCEPTANCE_HMAC_DOMAIN,
      keyId,
      payloadSha256,
      signature: `hmac-sha256:${signatureFor(
        acceptance,
        keyId,
        payloadSha256,
        secret
      )}`,
    },
  })
}

const parseSignedFourMarketReleaseAcceptance = (
  value: unknown
): SignedFourMarketReleaseAcceptance => {
  if (
    !(
      isRecord(value) &&
      exactKeys(value, ["acceptance", "authority"]) &&
      isRecord(value.authority) &&
      exactKeys(value.authority, [
        "algorithm",
        "domain",
        "keyId",
        "payloadSha256",
        "signature",
      ])
    ) ||
    value.authority.algorithm !== "hmac-sha256" ||
    value.authority.domain !== FOUR_MARKET_RELEASE_ACCEPTANCE_HMAC_DOMAIN ||
    typeof value.authority.keyId !== "string" ||
    !SAFE_ID.test(value.authority.keyId) ||
    typeof value.authority.payloadSha256 !== "string" ||
    !SHA256.test(value.authority.payloadSha256) ||
    typeof value.authority.signature !== "string" ||
    !HMAC_SHA256_SIGNATURE.test(value.authority.signature)
  ) {
    return invalid("signed authority")
  }
  const acceptance = parseFourMarketReleaseAcceptance(value.acceptance)
  if (
    !equalLowercaseSha256(
      value.authority.payloadSha256,
      hashFourMarketReleaseAcceptance(acceptance)
    )
  ) {
    return invalid("signed authority payload hash")
  }
  return deepFreeze({
    acceptance,
    authority: {
      algorithm: "hmac-sha256",
      domain: FOUR_MARKET_RELEASE_ACCEPTANCE_HMAC_DOMAIN,
      keyId: value.authority.keyId,
      payloadSha256: value.authority.payloadSha256,
      signature: value.authority
        .signature as FourMarketReleaseAcceptanceAuthority["signature"],
    },
  })
}

export const serializeSignedFourMarketReleaseAcceptance = (
  value: unknown
): string => canonicalJsonWithLf(parseSignedFourMarketReleaseAcceptance(value))

export const parseSignedFourMarketReleaseAcceptanceArtifact = (
  serialized: string
): SignedFourMarketReleaseAcceptance =>
  parseSignedFourMarketReleaseAcceptance(parseCanonicalJsonWithLf(serialized))

export const verifySignedFourMarketReleaseAcceptance = (
  value: unknown,
  secret: string,
  expectedKeyId?: string
): SignedFourMarketReleaseAcceptance => {
  const signed = parseSignedFourMarketReleaseAcceptance(value)
  if (
    expectedKeyId !== undefined &&
    (!SAFE_ID.test(expectedKeyId) || signed.authority.keyId !== expectedKeyId)
  ) {
    throw new Error("Four-market release acceptance key ID is invalid")
  }
  if (!validSecret(secret)) {
    throw new Error("Four-market release acceptance secret is invalid")
  }
  const expected = signatureFor(
    signed.acceptance,
    signed.authority.keyId,
    signed.authority.payloadSha256,
    secret
  )
  const actual = signed.authority.signature.slice("hmac-sha256:".length)
  if (!equalLowercaseSha256(actual, expected)) {
    throw new Error("Four-market release acceptance signature is invalid")
  }
  return signed
}
