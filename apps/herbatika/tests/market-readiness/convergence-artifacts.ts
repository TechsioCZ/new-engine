import { constants } from "node:fs"
import { lstat, mkdir, open, realpath, unlink } from "node:fs/promises"
import { dirname, isAbsolute, join, resolve } from "node:path"
import type { FourMarketConvergenceArtifacts } from "./convergence-collector"
import {
  hashFourMarketStaticTaxonomyConvergenceFile,
  serializeFourMarketStaticTaxonomyConvergence,
} from "./static-taxonomy-convergence"
import {
  hashFourMarketUrlrConvergenceFile,
  serializeFourMarketUrlrConvergence,
} from "./urlr-convergence"

export const FOUR_MARKET_URLR_ARTIFACT_PATH =
  "operations/four-market-urlr-convergence.json"
export const FOUR_MARKET_STATIC_TAXONOMY_ARTIFACT_PATH =
  "urlr/four-market-static-taxonomy-convergence.json"

export type ReadinessArtifactRef = Readonly<{
  path: string
  sha256: string
}>

export type FourMarketConvergenceArtifactRefs = Readonly<{
  staticTaxonomy: ReadinessArtifactRef
  urlRegistry: ReadinessArtifactRef
}>

const secureDirectory = async (path: string) => {
  try {
    await mkdir(path, { mode: 0o700 })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error
    }
  }
  const metadata = await lstat(path)
  const ownedByProcess =
    typeof process.getuid !== "function" || metadata.uid === process.getuid()
  if (
    !metadata.isDirectory() ||
    metadata.isSymbolicLink() ||
    !ownedByProcess ||
    metadata.mode % 0o100 !== 0 ||
    (await realpath(path)) !== path
  ) {
    throw new Error("four-market-readiness: artifact directory is unsafe")
  }
}

const artifactRoot = async (value: string): Promise<string> => {
  if (!isAbsolute(value) || resolve(value) !== value) {
    throw new Error(
      "four-market-readiness: artifact root must be an absolute normalized path"
    )
  }
  const metadata = await lstat(value)
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("four-market-readiness: artifact root is unsafe")
  }
  if ((await realpath(value)) !== value) {
    throw new Error("four-market-readiness: artifact root must be canonical")
  }
  return value
}

const exclusivePrivateWrite = async (
  path: string,
  bytes: string,
  created: string[]
) => {
  const handle = await open(
    path,
    // biome-ignore lint/suspicious/noBitwiseOperators: POSIX open flags are a bitmask.
    constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW |
      constants.O_WRONLY,
    0o600
  )
  created.push(path)
  try {
    if ((await realpath(dirname(path))) !== dirname(path)) {
      throw new Error("four-market-readiness: artifact directory changed")
    }
    await handle.writeFile(bytes, { encoding: "utf8" })
    await handle.chmod(0o600)
    const metadata = await handle.stat()
    if (!metadata.isFile() || metadata.nlink !== 1) {
      throw new Error("four-market-readiness: artifact output is unsafe")
    }
  } finally {
    await handle.close()
  }
}

export const writeFourMarketConvergenceArtifacts = async (
  rootValue: string,
  artifacts: FourMarketConvergenceArtifacts
): Promise<FourMarketConvergenceArtifactRefs> => {
  const root = await artifactRoot(rootValue)
  const urlRegistryPath = join(root, FOUR_MARKET_URLR_ARTIFACT_PATH)
  const staticTaxonomyPath = join(
    root,
    FOUR_MARKET_STATIC_TAXONOMY_ARTIFACT_PATH
  )
  await Promise.all([
    secureDirectory(dirname(urlRegistryPath)),
    secureDirectory(dirname(staticTaxonomyPath)),
  ])
  const created: string[] = []
  try {
    await exclusivePrivateWrite(
      urlRegistryPath,
      serializeFourMarketUrlrConvergence(artifacts.urlRegistry),
      created
    )
    await exclusivePrivateWrite(
      staticTaxonomyPath,
      serializeFourMarketStaticTaxonomyConvergence(artifacts.staticTaxonomy),
      created
    )
  } catch (error) {
    const cleanup = await Promise.allSettled(
      created.map((path) => unlink(path))
    )
    const cleanupErrors = cleanup.flatMap((result) =>
      result.status === "rejected" ? [result.reason] : []
    )
    if (cleanupErrors.length) {
      throw new AggregateError(
        [error, ...cleanupErrors],
        "four-market-readiness: artifact write and cleanup failed"
      )
    }
    throw error
  }
  return {
    staticTaxonomy: {
      path: FOUR_MARKET_STATIC_TAXONOMY_ARTIFACT_PATH,
      sha256: hashFourMarketStaticTaxonomyConvergenceFile(
        artifacts.staticTaxonomy
      ),
    },
    urlRegistry: {
      path: FOUR_MARKET_URLR_ARTIFACT_PATH,
      sha256: hashFourMarketUrlrConvergenceFile(artifacts.urlRegistry),
    },
  }
}
