import { randomUUID } from "node:crypto"
import { link, lstat, open, realpath, unlink } from "node:fs/promises"
import { basename, dirname, isAbsolute, resolve } from "node:path"
import { canonicalJsonLine, sha256Bytes } from "./canonical"
import { hashMarketPricePlan, serializeMarketPricePlan } from "./planner"
import type { MarketPricePlan, MarketPricePlanArtifact } from "./types"

const SHA_256 = /^[a-f0-9]{64}$/

const assertCanonicalAbsolutePath = (path: string, label: string) => {
  if (!isAbsolute(path) || resolve(path) !== path) {
    throw new Error(`${label} must be a canonical absolute path`)
  }
}

const assertOutputDoesNotExist = async (outputPath: string) => {
  try {
    await lstat(outputPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return
    }
    throw error
  }
  throw new Error(`plan output already exists: ${outputPath}`)
}

const assertStableOutputParent = async (
  parentPath: string,
  expected: Readonly<{ dev: number; ino: number }>
) => {
  const [parent, physicalParentPath] = await Promise.all([
    lstat(parentPath),
    realpath(parentPath),
  ])
  if (
    parent.isSymbolicLink() ||
    !parent.isDirectory() ||
    physicalParentPath !== parentPath ||
    parent.dev !== expected.dev ||
    parent.ino !== expected.ino
  ) {
    throw new Error("plan output parent changed during artifact publication")
  }
}

const assertSameRegularFile = (
  expected: Readonly<{ dev: number; ino: number }>,
  actual: Awaited<ReturnType<typeof lstat>>,
  label: string
) => {
  if (
    actual.isSymbolicLink() ||
    !actual.isFile() ||
    actual.dev !== expected.dev ||
    actual.ino !== expected.ino
  ) {
    throw new Error(`${label} changed during artifact publication`)
  }
}

const syncDirectoryIfSupported = async (parentPath: string) => {
  let directory: Awaited<ReturnType<typeof open>> | undefined
  try {
    directory = await open(parentPath, "r")
    await directory.sync()
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (
      !(
        code && ["EBADF", "EINVAL", "EISDIR", "ENOTSUP", "EPERM"].includes(code)
      )
    ) {
      throw error
    }
  } finally {
    await directory?.close().catch(() => {
      // Directory fsync support is platform-dependent.
    })
  }
}

export const buildMarketPricePlanArtifact = (
  plan: MarketPricePlan,
  planSha256: string
): MarketPricePlanArtifact => {
  if (!SHA_256.test(planSha256)) {
    throw new Error("planSha256 must be a lowercase SHA-256")
  }
  if (serializeMarketPricePlan(plan) !== canonicalJsonLine(plan)) {
    throw new Error("plan must already use deterministic canonical ordering")
  }
  if (hashMarketPricePlan(plan) !== planSha256) {
    throw new Error("planSha256 does not match the canonical plan bytes")
  }
  return {
    kind: "market-price-authority-dry-run-plan-artifact",
    plan,
    planSha256,
    schemaVersion: 1,
  }
}

export const serializeMarketPricePlanArtifact = (
  artifact: MarketPricePlanArtifact
): string => canonicalJsonLine(artifact)

export const hashMarketPricePlanArtifact = (
  artifact: MarketPricePlanArtifact
): string => sha256Bytes(serializeMarketPricePlanArtifact(artifact))

export const writeMarketPricePlanArtifact = async (
  outputPath: string,
  plan: MarketPricePlan,
  planSha256: string
): Promise<MarketPricePlanArtifact> => {
  assertCanonicalAbsolutePath(outputPath, "plan output")
  const parentPath = dirname(outputPath)
  const [parent, physicalParentPath] = await Promise.all([
    lstat(parentPath),
    realpath(parentPath),
  ])
  if (
    parent.isSymbolicLink() ||
    !parent.isDirectory() ||
    physicalParentPath !== parentPath
  ) {
    throw new Error("plan output parent must be a non-symlink directory")
  }
  const parentIdentity = { dev: parent.dev, ino: parent.ino }
  await assertOutputDoesNotExist(outputPath)

  const artifact = buildMarketPricePlanArtifact(plan, planSha256)
  const contents = serializeMarketPricePlanArtifact(artifact)
  const temporaryPath = `${parentPath}/.${basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(temporaryPath, "wx", 0o600)
    await handle.writeFile(contents, "utf8")
    await handle.sync()
    const temporaryIdentity = await handle.stat()
    assertSameRegularFile(
      temporaryIdentity,
      await lstat(temporaryPath),
      "temporary plan artifact"
    )
    await assertStableOutputParent(parentPath, parentIdentity)
    await assertOutputDoesNotExist(outputPath)
    await link(temporaryPath, outputPath)
    assertSameRegularFile(
      temporaryIdentity,
      await lstat(outputPath),
      "published plan artifact"
    )
    await handle.close()
    handle = undefined
    await syncDirectoryIfSupported(parentPath)
    await unlink(temporaryPath).catch(() => {
      // Publication is committed; stale temporary cleanup is best-effort.
    })
    await syncDirectoryIfSupported(parentPath)
    return artifact
  } catch (error) {
    await handle?.close().catch(() => {
      // Preserve the original publication failure.
    })
    await unlink(temporaryPath).catch(() => {
      // Preserve the original publication failure.
    })
    throw error
  }
}
