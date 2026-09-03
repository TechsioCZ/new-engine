import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { dirname, isAbsolute, resolve } from "node:path"
import { loadRoCatalogManifest } from "../ro-catalog-import/manifest"
import {
  type PrecommerceExpectedCounts,
  type PrecommerceExpectedSourceRoots,
  parsePrecommercePriceAuthority,
} from "./precommerce-price-authority"
import {
  RO_DEMO_LOCALE,
  RO_DEMO_MARKET,
  type RoDemoCliOptions,
  type RoDemoLoadedInput,
  type RoDemoManifest,
  type RoDemoPriceAuthority,
  type RoDemoPriceDirective,
} from "./types"

const IDENTIFIER = /^[\x21-\x7e]{1,255}$/
const SHA_256 = /^[a-f0-9]{64}$/
const RELEASE_SHA = /^[a-f0-9]{40}$/

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const exactKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
  required: readonly string[],
  label: string
) => {
  const unexpected = Object.keys(value).find((key) => !allowed.includes(key))
  const missing = required.find((key) => !Object.hasOwn(value, key))
  if (unexpected || missing) {
    throw new Error(
      unexpected
        ? `${label} contains unexpected field ${unexpected}`
        : `${label} is missing field ${missing}`
    )
  }
}

const identifier = (value: unknown, label: string) => {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    !IDENTIFIER.test(value)
  ) {
    throw new Error(`${label} is invalid`)
  }
  return value
}

const identifierList = (value: unknown, label: string) => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }
  const parsed = value.map((item, index) =>
    identifier(item, `${label}[${index}]`)
  )
  if (new Set(parsed).size !== parsed.length) {
    throw new Error(`${label} must not contain duplicates`)
  }
  return parsed
}

const directiveKey = (variant: {
  ean: null | string
  liveSku: null | string
  variantId: string
}): RoDemoPriceDirective["key"] => {
  if (variant.ean) {
    return { kind: "ean", value: variant.ean }
  }
  if (variant.liveSku) {
    return { kind: "sku", value: variant.liveSku }
  }
  return { kind: "variant_id", value: variant.variantId }
}

const normalizePrecommerceAuthority = (
  text: string,
  expectedCounts?: PrecommerceExpectedCounts,
  expectedSourceRoots?: PrecommerceExpectedSourceRoots
): RoDemoPriceAuthority => {
  const artifact = parsePrecommercePriceAuthority(
    text,
    expectedCounts,
    expectedSourceRoots
  )
  const inventoryIdentity = [
    ...artifact.products.map(({ productId, variants: productVariants }) => ({
      productId,
      variants: productVariants.map(({ ean, liveSku, variantId }) => ({
        ean,
        liveSku,
        variantId,
      })),
    })),
    ...artifact.exclusions.map(({ productId, variants: excludedVariants }) => ({
      productId,
      variants: excludedVariants,
    })),
  ].sort((left, right) => left.productId.localeCompare(right.productId))
  const variants: RoDemoPriceDirective[] = artifact.products.flatMap(
    (product) =>
      product.variants.map((variant) => ({
        amount:
          variant.roAvailability === "sellable" ? variant.price.amount : null,
        expectedLiveIdentity: {
          ean: variant.ean,
          productId: product.productId,
          sku: variant.liveSku,
          variantId: variant.variantId,
        },
        key: directiveKey(variant),
        roAvailability: variant.roAvailability,
      }))
  )
  return {
    inventoryIdentity,
    inventoryIdentitySha256: artifact.inventoryIdentitySha256,
    kind: artifact.kind,
    variants,
  }
}

const normalizeCatalogAuthority = (
  products: Awaited<
    ReturnType<typeof loadRoCatalogManifest>
  >["manifest"]["products"]
): RoDemoPriceAuthority => ({
  inventoryIdentity: null,
  inventoryIdentitySha256: null,
  kind: "catalog-manifest",
  variants: products.flatMap((product) =>
    product.variants.map((variant) => ({
      amount: variant.ronPrice?.amount ?? null,
      expectedLiveIdentity: null,
      key: variant.key,
      roAvailability: variant.roAvailability,
    }))
  ),
})

export const parseRoDemoPriceAuthority = normalizePrecommerceAuthority

export const parseRoDemoManifest = (text: string): RoDemoManifest => {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (error) {
    throw new Error(
      `demo manifest is not valid JSON: ${(error as Error).message}`
    )
  }
  const value = record(raw, "manifest")
  const commonFields = [
    "binding",
    "demo",
    "locale",
    "market",
    "schemaVersion",
  ] as const
  const hasCatalog = Object.hasOwn(value, "catalogManifestPath")
  const hasAuthority = Object.hasOwn(value, "priceAuthorityPath")
  if (hasCatalog === hasAuthority) {
    throw new Error(
      "manifest must contain exactly one of catalogManifestPath or priceAuthorityPath"
    )
  }
  const pathField = hasCatalog ? "catalogManifestPath" : "priceAuthorityPath"
  exactKeys(
    value,
    [...commonFields, pathField],
    [...commonFields, pathField],
    "manifest"
  )
  if (
    value.schemaVersion !== 1 ||
    value.demo !== true ||
    value.market !== RO_DEMO_MARKET ||
    value.locale !== RO_DEMO_LOCALE
  ) {
    throw new Error(
      "manifest must be schemaVersion=1, demo=true, market=ro, locale=ro-RO"
    )
  }
  const binding = record(value.binding, "manifest.binding")
  const bindingFields = [
    "codProviderId",
    "fulfillmentProviderId",
    "fulfillmentSetId",
    "gopayProviderIds",
    "regionName",
    "salesChannelId",
    "shippingProfileId",
    "systemPaymentProviderId",
  ] as const
  exactKeys(binding, bindingFields, bindingFields, "manifest.binding")
  const base = {
    binding: {
      codProviderId: identifier(
        binding.codProviderId,
        "manifest.binding.codProviderId"
      ),
      fulfillmentProviderId: identifier(
        binding.fulfillmentProviderId,
        "manifest.binding.fulfillmentProviderId"
      ),
      fulfillmentSetId: identifier(
        binding.fulfillmentSetId,
        "manifest.binding.fulfillmentSetId"
      ),
      gopayProviderIds: identifierList(
        binding.gopayProviderIds,
        "manifest.binding.gopayProviderIds"
      ),
      regionName: identifier(binding.regionName, "manifest.binding.regionName"),
      salesChannelId: identifier(
        binding.salesChannelId,
        "manifest.binding.salesChannelId"
      ),
      shippingProfileId: identifier(
        binding.shippingProfileId,
        "manifest.binding.shippingProfileId"
      ),
      systemPaymentProviderId: identifier(
        binding.systemPaymentProviderId,
        "manifest.binding.systemPaymentProviderId"
      ),
    },
    demo: true as const,
    locale: RO_DEMO_LOCALE,
    market: RO_DEMO_MARKET,
    schemaVersion: 1 as const,
  }
  return hasCatalog
    ? {
        ...base,
        catalogManifestPath: identifier(
          value.catalogManifestPath,
          "manifest.catalogManifestPath"
        ),
      }
    : {
        ...base,
        priceAuthorityPath: identifier(
          value.priceAuthorityPath,
          "manifest.priceAuthorityPath"
        ),
      }
}

export const loadRoDemoInput = async (
  manifestPath: string
): Promise<RoDemoLoadedInput> => {
  const absoluteManifestPath = resolve(manifestPath)
  const commerceManifestBytes = await readFile(absoluteManifestPath)
  const commerceManifestSha256 = createHash("sha256")
    .update(commerceManifestBytes)
    .digest("hex")
  const manifest = parseRoDemoManifest(commerceManifestBytes.toString("utf8"))
  const relativePath =
    "priceAuthorityPath" in manifest &&
    typeof manifest.priceAuthorityPath === "string"
      ? manifest.priceAuthorityPath
      : manifest.catalogManifestPath
  if (typeof relativePath !== "string") {
    throw new Error("manifest authority path is missing")
  }
  const priceAuthorityPath = resolve(
    dirname(absoluteManifestPath),
    relativePath
  )
  const bytes = await readFile(priceAuthorityPath)
  const priceAuthoritySha256 = createHash("sha256").update(bytes).digest("hex")
  const priceAuthority =
    "priceAuthorityPath" in manifest
      ? normalizePrecommerceAuthority(bytes.toString("utf8"))
      : normalizeCatalogAuthority(
          (await loadRoCatalogManifest(priceAuthorityPath)).manifest.products
        )
  return {
    absoluteManifestPath,
    commerceManifestSha256,
    manifest,
    priceAuthority,
    priceAuthorityPath,
    priceAuthoritySha256,
  }
}

export const parseRoDemoCliOptions = (
  args: readonly string[]
): RoDemoCliOptions => {
  let apply = false
  let confirmPlanHash: string | undefined
  let demo = false
  let manifestPath: string | undefined
  let planOutputPath: string | undefined
  let receiptOutputPath: string | undefined
  let restoreOutputPath: string | undefined
  const expectedDeployment: Record<string, string> = {}
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--apply" || argument === "--demo") {
      if (argument === "--apply") {
        if (apply) {
          throw new Error("--apply may only be supplied once")
        }
        apply = true
      } else {
        if (demo) {
          throw new Error("--demo may only be supplied once")
        }
        demo = true
      }
      continue
    }
    if (
      argument !== "--manifest" &&
      argument !== "--confirm-plan-hash" &&
      argument !== "--plan-output" &&
      argument !== "--receipt-output" &&
      argument !== "--restore-output" &&
      argument !== "--expected-backend-build-hash" &&
      argument !== "--expected-backend-deployment-id" &&
      argument !== "--expected-backend-release-sha" &&
      argument !== "--expected-backend-slot" &&
      argument !== "--expected-commerce-manifest-sha256" &&
      argument !== "--expected-database-fingerprint" &&
      argument !== "--expected-database-instance-fingerprint" &&
      argument !== "--expected-price-authority-sha256" &&
      argument !== "--expected-sk-commerce-baseline-sha256" &&
      argument !== "--expected-environment-id"
    ) {
      throw new Error(`unknown argument ${argument}`)
    }
    const next = args[index + 1]
    if (!next || next.startsWith("--")) {
      throw new Error(`${argument} requires a value`)
    }
    index += 1
    if (argument === "--manifest") {
      if (manifestPath) {
        throw new Error("--manifest may only be supplied once")
      }
      manifestPath = next
    } else if (argument === "--plan-output") {
      if (planOutputPath) {
        throw new Error("--plan-output may only be supplied once")
      }
      if (!isAbsolute(next)) {
        throw new Error("--plan-output must be an absolute path")
      }
      planOutputPath = next
    } else if (argument === "--receipt-output") {
      if (receiptOutputPath) {
        throw new Error("--receipt-output may only be supplied once")
      }
      if (!isAbsolute(next)) {
        throw new Error("--receipt-output must be an absolute path")
      }
      receiptOutputPath = next
    } else if (argument === "--restore-output") {
      if (restoreOutputPath) {
        throw new Error("--restore-output may only be supplied once")
      }
      if (!isAbsolute(next)) {
        throw new Error("--restore-output must be an absolute path")
      }
      restoreOutputPath = next
    } else if (argument.startsWith("--expected-")) {
      if (expectedDeployment[argument]) {
        throw new Error(`${argument} may only be supplied once`)
      }
      expectedDeployment[argument] = next
    } else {
      if (confirmPlanHash) {
        throw new Error("--confirm-plan-hash may only be supplied once")
      }
      if (!SHA_256.test(next)) {
        throw new Error("--confirm-plan-hash must be a lowercase SHA-256")
      }
      confirmPlanHash = next
    }
  }
  if (!manifestPath) {
    throw new Error("--manifest is required")
  }
  if (!planOutputPath) {
    throw new Error("--plan-output is required")
  }
  const backendBuildHash = expectedDeployment["--expected-backend-build-hash"]
  const backendDeploymentId =
    expectedDeployment["--expected-backend-deployment-id"]
  const backendReleaseSha = expectedDeployment["--expected-backend-release-sha"]
  const backendSlot = expectedDeployment["--expected-backend-slot"]
  const expectedCommerceManifestSha256 =
    expectedDeployment["--expected-commerce-manifest-sha256"]
  const databaseFingerprint =
    expectedDeployment["--expected-database-fingerprint"]
  const databaseInstanceFingerprint =
    expectedDeployment["--expected-database-instance-fingerprint"]
  const expectedPriceAuthoritySha256 =
    expectedDeployment["--expected-price-authority-sha256"]
  const expectedSkCommerceBaselineSha256 =
    expectedDeployment["--expected-sk-commerce-baseline-sha256"]
  const environmentId = expectedDeployment["--expected-environment-id"]
  if (
    !(
      backendBuildHash &&
      backendDeploymentId &&
      backendReleaseSha &&
      backendSlot &&
      expectedCommerceManifestSha256 &&
      databaseFingerprint &&
      databaseInstanceFingerprint &&
      expectedPriceAuthoritySha256 &&
      expectedSkCommerceBaselineSha256 &&
      environmentId
    )
  ) {
    throw new Error("all expected deployment identity arguments are required")
  }
  if (
    !(
      IDENTIFIER.test(backendBuildHash) &&
      IDENTIFIER.test(backendDeploymentId) &&
      RELEASE_SHA.test(backendReleaseSha)
    ) ||
    (backendSlot !== "blue" && backendSlot !== "green") ||
    !SHA_256.test(expectedCommerceManifestSha256) ||
    !SHA_256.test(databaseFingerprint) ||
    !SHA_256.test(databaseInstanceFingerprint) ||
    !SHA_256.test(expectedPriceAuthoritySha256) ||
    !SHA_256.test(expectedSkCommerceBaselineSha256) ||
    !IDENTIFIER.test(environmentId)
  ) {
    throw new Error("expected deployment identity is invalid")
  }
  if (!apply && confirmPlanHash) {
    throw new Error("--confirm-plan-hash is only valid with --apply")
  }
  if (apply && !(demo && confirmPlanHash)) {
    throw new Error("--apply requires --demo and --confirm-plan-hash")
  }
  if (apply && !(receiptOutputPath && restoreOutputPath)) {
    throw new Error("--apply requires --receipt-output and --restore-output")
  }
  if (
    apply &&
    new Set(
      [planOutputPath, receiptOutputPath, restoreOutputPath].map((path) =>
        resolve(path as string)
      )
    ).size !== 3
  ) {
    throw new Error(
      "--plan-output, --receipt-output, and --restore-output must be distinct paths"
    )
  }
  if (!apply && (receiptOutputPath || restoreOutputPath)) {
    throw new Error("receipt and restore outputs are only valid with --apply")
  }
  return {
    apply,
    confirmPlanHash,
    demo,
    expectedCommerceManifestSha256,
    expectedDeployment: {
      backendBuildHash,
      backendDeploymentId,
      backendReleaseSha,
      backendSlot,
      databaseFingerprint,
      databaseInstanceFingerprint,
      environmentId,
    },
    expectedPriceAuthoritySha256,
    expectedSkCommerceBaselineSha256,
    manifestPath,
    planOutputPath,
    ...(receiptOutputPath ? { receiptOutputPath } : {}),
    ...(restoreOutputPath ? { restoreOutputPath } : {}),
  }
}

export const parseRoDemoFingerprintCliOptions = (args: readonly string[]) => {
  const flag = "--capture-deployment-fingerprint"
  const valueFlags = [
    "--manifest",
    "--fingerprint-output",
    "--expected-backend-build-hash",
    "--expected-backend-deployment-id",
    "--expected-backend-release-sha",
    "--expected-backend-slot",
    "--expected-commerce-manifest-sha256",
    "--expected-environment-id",
    "--expected-price-authority-sha256",
  ] as const
  if (args.filter((argument) => argument === flag).length !== 1) {
    throw new Error(`${flag} is required exactly once`)
  }
  const values = new Map<string, string>()
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (!argument) {
      throw new Error("fingerprint argument is missing")
    }
    if (argument === flag) {
      continue
    }
    if (!valueFlags.includes(argument as (typeof valueFlags)[number])) {
      throw new Error(`unknown fingerprint argument ${argument}`)
    }
    if (values.has(argument)) {
      throw new Error(`${argument} may only be supplied once`)
    }
    const value = args[index + 1]
    if (!(value && !value.startsWith("--"))) {
      throw new Error(`${argument} requires a value`)
    }
    values.set(argument, value)
    index += 1
  }
  const required = (name: (typeof valueFlags)[number]) => {
    const value = values.get(name)
    if (!value) {
      throw new Error(`${name} is required`)
    }
    return value
  }
  const manifestPath = required("--manifest")
  const fingerprintOutputPath = required("--fingerprint-output")
  const backendBuildHash = required("--expected-backend-build-hash")
  const backendDeploymentId = required("--expected-backend-deployment-id")
  const backendReleaseSha = required("--expected-backend-release-sha")
  const backendSlot = required("--expected-backend-slot")
  const expectedCommerceManifestSha256 = required(
    "--expected-commerce-manifest-sha256"
  )
  const environmentId = required("--expected-environment-id")
  const expectedPriceAuthoritySha256 = required(
    "--expected-price-authority-sha256"
  )
  if (
    !(
      isAbsolute(fingerprintOutputPath) &&
      IDENTIFIER.test(backendBuildHash) &&
      IDENTIFIER.test(backendDeploymentId) &&
      RELEASE_SHA.test(backendReleaseSha)
    ) ||
    (backendSlot !== "blue" && backendSlot !== "green") ||
    !SHA_256.test(expectedCommerceManifestSha256) ||
    !SHA_256.test(expectedPriceAuthoritySha256) ||
    !IDENTIFIER.test(environmentId)
  ) {
    throw new Error("fingerprint deployment identity or output path is invalid")
  }
  const parsedBackendSlot: "blue" | "green" =
    backendSlot === "blue" ? "blue" : "green"
  return {
    backendBuildHash,
    backendDeploymentId,
    backendReleaseSha,
    backendSlot: parsedBackendSlot,
    environmentId,
    expectedCommerceManifestSha256,
    expectedPriceAuthoritySha256,
    fingerprintOutputPath,
    manifestPath,
  }
}
