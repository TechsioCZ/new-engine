import { constants } from "node:fs"
import { lstat, open } from "node:fs/promises"
import { isAbsolute, join, resolve } from "node:path"
import { parseSegmentRegistryPublicationArtifact } from "../../src/lib/url/segment-registry-publication"
import { POPULATION_MARKETS } from "../../src/lib/url-registry/population/manifest-contracts"
import {
  assertPrivateReadinessDirectoryUnchanged,
  openPrivateReadinessDirectory,
} from "./convergence-artifacts"
import type {
  SegmentRegistryArtifactRef,
  StaticTaxonomyMarketConvergence,
} from "./static-taxonomy-convergence"
import type { ReadinessMarket } from "./urlr-convergence"

export type SegmentRegistryRefsByMarket = Readonly<
  Record<ReadinessMarket, SegmentRegistryArtifactRef>
>

const canonicalRoot = (value: string) => {
  if (!isAbsolute(value) || resolve(value) !== value) {
    throw new Error(
      "four-market-readiness: artifact root must be absolute and normalized"
    )
  }
  return openPrivateReadinessDirectory(value)
}

export const loadSegmentRegistryRefsByMarket = async (
  artifactRootValue: string
): Promise<SegmentRegistryRefsByMarket> => {
  const root = await canonicalRoot(artifactRootValue)
  const directoryPath = join(root.path, "segment-registry-g1")
  let directory:
    | Awaited<ReturnType<typeof openPrivateReadinessDirectory>>
    | undefined
  try {
    const openedDirectory = await openPrivateReadinessDirectory(directoryPath)
    directory = openedDirectory
    await assertPrivateReadinessDirectoryUnchanged(root)
    const entryResults = await Promise.allSettled(
      POPULATION_MARKETS.map(async (market) => {
        const path = join(openedDirectory.path, `${market}.json`)
        await assertPrivateReadinessDirectoryUnchanged(openedDirectory)
        const handle = await open(
          path,
          // biome-ignore lint/suspicious/noBitwiseOperators: POSIX open flags are a bitmask.
          constants.O_RDONLY | constants.O_NOFOLLOW
        )
        try {
          const initialMetadata = await handle.stat()
          const pathnameMetadata = await lstat(path)
          if (
            !initialMetadata.isFile() ||
            initialMetadata.nlink !== 1 ||
            initialMetadata.dev !== pathnameMetadata.dev ||
            initialMetadata.ino !== pathnameMetadata.ino
          ) {
            throw new Error(
              `four-market-readiness: segment registry artifact is unsafe for ${market}`
            )
          }
          const parsed = parseSegmentRegistryPublicationArtifact(
            await handle.readFile("utf8"),
            path
          )
          const finalMetadata = await handle.stat()
          const finalPathMetadata = await lstat(path)
          if (
            initialMetadata.dev !== finalMetadata.dev ||
            initialMetadata.ino !== finalMetadata.ino ||
            initialMetadata.size !== finalMetadata.size ||
            initialMetadata.mtimeMs !== finalMetadata.mtimeMs ||
            initialMetadata.ctimeMs !== finalMetadata.ctimeMs ||
            finalMetadata.dev !== finalPathMetadata.dev ||
            finalMetadata.ino !== finalPathMetadata.ino
          ) {
            throw new Error(
              `four-market-readiness: segment registry artifact changed for ${market}`
            )
          }
          await assertPrivateReadinessDirectoryUnchanged(openedDirectory)
          if (parsed.artifact.market !== market) {
            throw new Error(
              `four-market-readiness: segment registry market mismatch for ${market}`
            )
          }
          return [
            market,
            {
              ref: `segment-registry-g1/${market}.json`,
              sha256: parsed.sha256,
            },
          ] as const
        } finally {
          await handle.close()
        }
      })
    )
    const entryError = entryResults.find(
      (result) => result.status === "rejected"
    )
    if (entryError?.status === "rejected") {
      throw entryError.reason
    }
    const entries = entryResults.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : []
    )
    await Promise.all([
      assertPrivateReadinessDirectoryUnchanged(root),
      assertPrivateReadinessDirectoryUnchanged(openedDirectory),
    ])
    return Object.fromEntries(entries) as Record<
      ReadinessMarket,
      StaticTaxonomyMarketConvergence["segmentRegistry"]
    >
  } finally {
    await Promise.allSettled([
      root.handle.close(),
      ...(directory ? [directory.handle.close()] : []),
    ])
  }
}
