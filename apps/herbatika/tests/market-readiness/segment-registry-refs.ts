import { lstat, readFile, realpath } from "node:fs/promises"
import { isAbsolute, join, resolve } from "node:path"
import { parseSegmentRegistryPublicationArtifact } from "../../src/lib/url/segment-registry-publication"
import { POPULATION_MARKETS } from "../../src/lib/url-registry/population/manifest-contracts"
import type {
  SegmentRegistryArtifactRef,
  StaticTaxonomyMarketConvergence,
} from "./static-taxonomy-convergence"
import type { ReadinessMarket } from "./urlr-convergence"

export type SegmentRegistryRefsByMarket = Readonly<
  Record<ReadinessMarket, SegmentRegistryArtifactRef>
>

const canonicalDirectory = async (value: string): Promise<string> => {
  if (!isAbsolute(value) || resolve(value) !== value) {
    throw new Error(
      "four-market-readiness: segment registry directory must be absolute and normalized"
    )
  }
  const metadata = await lstat(value)
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error(
      "four-market-readiness: segment registry directory is unsafe"
    )
  }
  if ((await realpath(value)) !== value) {
    throw new Error(
      "four-market-readiness: segment registry directory must be canonical"
    )
  }
  return value
}

export const loadSegmentRegistryRefsByMarket = async (
  directoryValue: string
): Promise<SegmentRegistryRefsByMarket> => {
  const directory = await canonicalDirectory(directoryValue)
  const entries = await Promise.all(
    POPULATION_MARKETS.map(async (market) => {
      const path = join(directory, `${market}.json`)
      const metadata = await lstat(path)
      if (!metadata.isFile() || metadata.isSymbolicLink()) {
        throw new Error(
          `four-market-readiness: segment registry artifact is unsafe for ${market}`
        )
      }
      const parsed = parseSegmentRegistryPublicationArtifact(
        await readFile(path, "utf8"),
        path
      )
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
    })
  )
  return Object.fromEntries(entries) as Record<
    ReadinessMarket,
    StaticTaxonomyMarketConvergence["segmentRegistry"]
  >
}
