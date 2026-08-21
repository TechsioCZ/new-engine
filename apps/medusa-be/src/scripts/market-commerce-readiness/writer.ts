import { randomUUID } from "node:crypto"
import { link, mkdir, open, realpath, unlink } from "node:fs/promises"
import { dirname, isAbsolute, join, resolve } from "node:path"
import {
  serializeCanonicalCommerceArtifact,
  serializeMarketCommerceReadinessProof,
  sha256CommerceArtifactBytes,
} from "."
import { buildCommerceCollectionReceipt } from "./collector"
import type {
  BuiltCommerceCollection,
  CommerceArtifactRef,
  CommerceReleaseIdentity,
  MarketCommerceCollectionReceipt,
} from "./collector-types"
import { COMMERCE_READINESS_MARKETS } from "./types"

const ignoreCleanupError = (_error: unknown) => {
  // Cleanup is best effort; the original publication error must remain primary.
}

const assertSafeAbsoluteOutput = async (path: string) => {
  if (!isAbsolute(path) || resolve(path) !== path) {
    throw new Error(
      `evidence output path must be canonical and absolute: ${path}`
    )
  }
  const parent = dirname(path)
  await mkdir(parent, { mode: 0o700, recursive: true })
  if ((await realpath(parent)) !== parent) {
    throw new Error(`evidence output parent must not be a symlink: ${parent}`)
  }
}

export const writePrivateCommerceArtifactNoClobber = async (
  path: string,
  bytes: string
) => {
  await assertSafeAbsoluteOutput(path)
  const temporaryPath = join(
    dirname(path),
    `.${path.split("/").at(-1)}.${randomUUID()}.tmp`
  )
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(temporaryPath, "wx", 0o600)
    await handle.writeFile(bytes, "utf8")
    await handle.sync()
    await handle.close()
    handle = undefined
    await link(temporaryPath, path)
  } finally {
    await handle?.close().catch(ignoreCleanupError)
    await unlink(temporaryPath).catch(ignoreCleanupError)
  }
}

export const writeCommerceCollectionEvidence = async (
  collection: BuiltCommerceCollection,
  options: Readonly<{
    authority: CommerceArtifactRef
    capturedAt: string
    proofOutputDirectory: string
    receiptOutputPath: string
    releaseIdentity: CommerceReleaseIdentity
  }>
): Promise<MarketCommerceCollectionReceipt> => {
  if (!isAbsolute(options.proofOutputDirectory)) {
    throw new Error("proof output directory must be absolute")
  }
  const proofEntries = await Promise.all(
    COMMERCE_READINESS_MARKETS.map(async (market) => {
      const path = join(
        options.proofOutputDirectory,
        `${market}-commerce-readiness.json`
      )
      const bytes = serializeMarketCommerceReadinessProof(
        collection.proofs[market]
      )
      await writePrivateCommerceArtifactNoClobber(path, bytes)
      return [
        market,
        { path, sha256: sha256CommerceArtifactBytes(bytes) },
      ] as const
    })
  )
  const proofRefs = Object.fromEntries(proofEntries) as Record<
    (typeof COMMERCE_READINESS_MARKETS)[number],
    CommerceArtifactRef
  >
  const receipt = buildCommerceCollectionReceipt({
    authority: options.authority,
    capturedAt: options.capturedAt,
    proofs: proofRefs,
    ready: collection.bundle.ready,
    releaseIdentity: options.releaseIdentity,
  })
  await writePrivateCommerceArtifactNoClobber(
    options.receiptOutputPath,
    serializeCanonicalCommerceArtifact(receipt)
  )
  return receipt
}
