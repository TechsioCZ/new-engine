import { createHash } from "node:crypto"
import type { RoDemoCommercePlan, RoDemoSnapshot } from "./types"

const SHA_256 = /^[a-f0-9]{64}$/
const RELEASE_SHA = /^[a-f0-9]{40}$/

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(",")}}`
  }
  const serialized = JSON.stringify(value)
  if (serialized === undefined) {
    throw new Error("RO demo artifact contains a non-JSON value")
  }
  return serialized
}

export const serializeRoDemoArtifact = (value: unknown) =>
  `${stableJson(value)}\n`
export const sha256RoDemoArtifactBytes = (bytes: string) =>
  createHash("sha256").update(bytes).digest("hex")

export type RoDemoRestoreArtifact = Readonly<{
  demo: true
  deploymentIdentity: RoDemoCommercePlan["deploymentIdentity"]
  kind: "ro-demo-commerce-restore"
  market: "ro"
  planHash: string
  priceAuthorityKind: RoDemoCommercePlan["priceAuthorityKind"]
  priceAuthoritySha256: string
  schemaVersion: 1
  snapshot: RoDemoSnapshot
}>

export type RoDemoApplyReceipt = Readonly<{
  demo: true
  deploymentIdentity: RoDemoCommercePlan["deploymentIdentity"]
  kind: "ro-demo-commerce-apply-receipt"
  market: "ro"
  planHash: string
  postState: Readonly<{
    paymentProviderIds: readonly string[]
    regionId: string
    salesChannelId: string
    serviceZoneId: string
    shippingOptions: readonly Readonly<{
      code: RoDemoCommercePlan["shipping"][number]["code"]
      id: string
    }>[]
    taxRateIds: readonly string[]
    taxRegionIds: readonly string[]
    variantPrices: readonly Readonly<{
      amount: number
      productId: string
      variantId: string
    }>[]
  }>
  postStateSha256: string
  priceAuthorityKind: RoDemoCommercePlan["priceAuthorityKind"]
  priceAuthoritySha256: string
  restoreArtifactSha256: string
  schemaVersion: 1
  skBaselineHashAfter: string
  skBaselineHashBefore: string
}>

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const exactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string
) => {
  const actual = Object.keys(value).sort()
  const sortedExpected = [...expected].sort()
  if (
    actual.length !== sortedExpected.length ||
    actual.some((key, index) => key !== sortedExpected[index])
  ) {
    throw new Error(
      `${label} fields must be exactly ${sortedExpected.join(",")}`
    )
  }
}

const text = (value: unknown, label: string) => {
  if (typeof value !== "string" || value.trim() !== value || !value) {
    throw new Error(`${label} must be a nonblank trimmed string`)
  }
  return value
}

const hash = (value: unknown, label: string) => {
  const parsed = text(value, label)
  if (!SHA_256.test(parsed)) {
    throw new Error(`${label} must be a lowercase SHA-256`)
  }
  return parsed
}

const textList = (value: unknown, label: string) => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }
  const parsed = value.map((item, index) => text(item, `${label}[${index}]`))
  if (new Set(parsed).size !== parsed.length) {
    throw new Error(`${label} must not contain duplicates`)
  }
  return parsed
}

const parseAuthorityKind = (value: unknown) => {
  if (
    value !== "catalog-manifest" &&
    value !== "ro-demo-precommerce-price-authority"
  ) {
    throw new Error("priceAuthorityKind is invalid")
  }
  return value
}

const parseDeploymentIdentity = (
  value: unknown
): RoDemoCommercePlan["deploymentIdentity"] => {
  const deployment = record(value, "deploymentIdentity")
  exactKeys(
    deployment,
    [
      "backendBuildHash",
      "backendDeploymentId",
      "backendReleaseSha",
      "backendSlot",
      "databaseFingerprint",
      "environmentId",
    ],
    "deploymentIdentity"
  )
  const backendReleaseSha = text(
    deployment.backendReleaseSha,
    "deploymentIdentity.backendReleaseSha"
  )
  const backendSlot = deployment.backendSlot
  if (!RELEASE_SHA.test(backendReleaseSha)) {
    throw new Error("deploymentIdentity.backendReleaseSha is invalid")
  }
  if (backendSlot !== "blue" && backendSlot !== "green") {
    throw new Error("deploymentIdentity.backendSlot is invalid")
  }
  return {
    backendBuildHash: text(
      deployment.backendBuildHash,
      "deploymentIdentity.backendBuildHash"
    ),
    backendDeploymentId: text(
      deployment.backendDeploymentId,
      "deploymentIdentity.backendDeploymentId"
    ),
    backendReleaseSha,
    backendSlot,
    databaseFingerprint: hash(
      deployment.databaseFingerprint,
      "deploymentIdentity.databaseFingerprint"
    ),
    environmentId: text(
      deployment.environmentId,
      "deploymentIdentity.environmentId"
    ),
  }
}

const parseJson = (contents: string, label: string) => {
  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${(error as Error).message}`)
  }
  return record(parsed, label)
}

const assertCanonical = (value: unknown, contents: string, label: string) => {
  if (serializeRoDemoArtifact(value) !== contents) {
    throw new Error(`${label} must be canonical JSON with LF`)
  }
}

const assertCommon = (
  raw: Record<string, unknown>,
  kind: "ro-demo-commerce-apply-receipt" | "ro-demo-commerce-restore"
) => {
  if (
    raw.schemaVersion !== 1 ||
    raw.kind !== kind ||
    raw.demo !== true ||
    raw.market !== "ro"
  ) {
    throw new Error(`${kind} identity is invalid`)
  }
}

export const parseRoDemoRestoreArtifact = (
  contents: string
): RoDemoRestoreArtifact => {
  const raw = parseJson(contents, "RO demo restore artifact")
  exactKeys(
    raw,
    [
      "demo",
      "deploymentIdentity",
      "kind",
      "market",
      "planHash",
      "priceAuthorityKind",
      "priceAuthoritySha256",
      "schemaVersion",
      "snapshot",
    ],
    "RO demo restore artifact"
  )
  assertCommon(raw, "ro-demo-commerce-restore")
  const artifact: RoDemoRestoreArtifact = {
    demo: true,
    deploymentIdentity: parseDeploymentIdentity(raw.deploymentIdentity),
    kind: "ro-demo-commerce-restore",
    market: "ro",
    planHash: hash(raw.planHash, "planHash"),
    priceAuthorityKind: parseAuthorityKind(raw.priceAuthorityKind),
    priceAuthoritySha256: hash(
      raw.priceAuthoritySha256,
      "priceAuthoritySha256"
    ),
    schemaVersion: 1,
    snapshot: record(raw.snapshot, "snapshot") as unknown as RoDemoSnapshot,
  }
  assertCanonical(artifact, contents, "RO demo restore artifact")
  return artifact
}

export const parseRoDemoApplyReceipt = (
  contents: string
): RoDemoApplyReceipt => {
  const raw = parseJson(contents, "RO demo apply receipt")
  exactKeys(
    raw,
    [
      "demo",
      "deploymentIdentity",
      "kind",
      "market",
      "planHash",
      "postState",
      "postStateSha256",
      "priceAuthorityKind",
      "priceAuthoritySha256",
      "restoreArtifactSha256",
      "schemaVersion",
      "skBaselineHashAfter",
      "skBaselineHashBefore",
    ],
    "RO demo apply receipt"
  )
  assertCommon(raw, "ro-demo-commerce-apply-receipt")
  const post = record(raw.postState, "postState")
  exactKeys(
    post,
    [
      "paymentProviderIds",
      "regionId",
      "salesChannelId",
      "serviceZoneId",
      "shippingOptions",
      "taxRateIds",
      "taxRegionIds",
      "variantPrices",
    ],
    "postState"
  )
  if (
    !(Array.isArray(post.shippingOptions) && Array.isArray(post.variantPrices))
  ) {
    throw new Error(
      "postState shippingOptions and variantPrices must be arrays"
    )
  }
  const shippingOptions = post.shippingOptions.map(
    (
      item,
      index
    ): RoDemoApplyReceipt["postState"]["shippingOptions"][number] => {
      const option = record(item, `postState.shippingOptions[${index}]`)
      exactKeys(option, ["code", "id"], `postState.shippingOptions[${index}]`)
      const code = option.code
      if (
        code !== "ro-demo-cargus" &&
        code !== "ro-demo-packeta-address" &&
        code !== "ro-demo-packeta-pickup"
      ) {
        throw new Error(`postState.shippingOptions[${index}].code is invalid`)
      }
      return {
        code,
        id: text(option.id, `shipping option ${index}.id`),
      }
    }
  )
  if (shippingOptions.length !== 3) {
    throw new Error("postState must prove exactly three RO shipping options")
  }
  const variantPrices = post.variantPrices.map((item, index) => {
    const price = record(item, `postState.variantPrices[${index}]`)
    exactKeys(
      price,
      ["amount", "productId", "variantId"],
      `variant price ${index}`
    )
    if (
      typeof price.amount !== "number" ||
      !Number.isFinite(price.amount) ||
      price.amount <= 0
    ) {
      throw new Error(`postState.variantPrices[${index}].amount is invalid`)
    }
    return {
      amount: price.amount,
      productId: text(price.productId, `variant price ${index}.productId`),
      variantId: text(price.variantId, `variant price ${index}.variantId`),
    }
  })
  const postState: RoDemoApplyReceipt["postState"] = {
    paymentProviderIds: textList(post.paymentProviderIds, "paymentProviderIds"),
    regionId: text(post.regionId, "regionId"),
    salesChannelId: text(post.salesChannelId, "salesChannelId"),
    serviceZoneId: text(post.serviceZoneId, "serviceZoneId"),
    shippingOptions,
    taxRateIds: textList(post.taxRateIds, "taxRateIds"),
    taxRegionIds: textList(post.taxRegionIds, "taxRegionIds"),
    variantPrices,
  }
  const postStateSha256 = hash(raw.postStateSha256, "postStateSha256")
  if (
    sha256RoDemoArtifactBytes(serializeRoDemoArtifact(postState)) !==
    postStateSha256
  ) {
    throw new Error("postStateSha256 does not match postState")
  }
  const skBaselineHashBefore = hash(
    raw.skBaselineHashBefore,
    "skBaselineHashBefore"
  )
  const skBaselineHashAfter = hash(
    raw.skBaselineHashAfter,
    "skBaselineHashAfter"
  )
  if (skBaselineHashBefore !== skBaselineHashAfter) {
    throw new Error("SK baseline differs across the commerce apply")
  }
  const receipt: RoDemoApplyReceipt = {
    demo: true,
    deploymentIdentity: parseDeploymentIdentity(raw.deploymentIdentity),
    kind: "ro-demo-commerce-apply-receipt",
    market: "ro",
    planHash: hash(raw.planHash, "planHash"),
    postState,
    postStateSha256,
    priceAuthorityKind: parseAuthorityKind(raw.priceAuthorityKind),
    priceAuthoritySha256: hash(
      raw.priceAuthoritySha256,
      "priceAuthoritySha256"
    ),
    restoreArtifactSha256: hash(
      raw.restoreArtifactSha256,
      "restoreArtifactSha256"
    ),
    schemaVersion: 1,
    skBaselineHashAfter,
    skBaselineHashBefore,
  }
  assertCanonical(receipt, contents, "RO demo apply receipt")
  return receipt
}
