import { constants, type Stats } from "node:fs"
import type { FileHandle } from "node:fs/promises"
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

type FileIdentity = Readonly<{ dev: number; ino: number }>

export type PrivateReadinessDirectory = Readonly<{
  handle: FileHandle
  identity: FileIdentity
  path: string
}>

const isSameFile = (left: FileIdentity, right: FileIdentity) =>
  left.dev === right.dev && left.ino === right.ino

const assertPrivateDirectoryMetadata = (metadata: Stats) => {
  const ownedByProcess =
    typeof process.getuid !== "function" || metadata.uid === process.getuid()
  if (
    !metadata.isDirectory() ||
    metadata.isSymbolicLink() ||
    !ownedByProcess ||
    metadata.mode % 0o100 !== 0
  ) {
    throw new Error("four-market-readiness: artifact directory is unsafe")
  }
}

export const assertPrivateReadinessDirectoryUnchanged = async (
  directory: PrivateReadinessDirectory
) => {
  const [descriptorMetadata, pathnameMetadata, canonicalPath] =
    await Promise.all([
      directory.handle.stat(),
      lstat(directory.path),
      realpath(directory.path),
    ])
  assertPrivateDirectoryMetadata(pathnameMetadata)
  if (
    !(
      descriptorMetadata.isDirectory() &&
      isSameFile(directory.identity, descriptorMetadata) &&
      isSameFile(directory.identity, pathnameMetadata)
    ) ||
    canonicalPath !== directory.path
  ) {
    throw new Error("four-market-readiness: artifact directory changed")
  }
}

export const openPrivateReadinessDirectory = async (
  path: string,
  create = false
): Promise<PrivateReadinessDirectory> => {
  if (create) {
    try {
      await mkdir(path, { mode: 0o700 })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error
      }
    }
  }
  const pathnameMetadata = await lstat(path)
  assertPrivateDirectoryMetadata(pathnameMetadata)
  const handle = await open(
    path,
    // biome-ignore lint/suspicious/noBitwiseOperators: POSIX open flags are a bitmask.
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW
  )
  const directory = {
    handle,
    identity: { dev: pathnameMetadata.dev, ino: pathnameMetadata.ino },
    path,
  }
  try {
    await assertPrivateReadinessDirectoryUnchanged(directory)
    return directory
  } catch (error) {
    await handle.close()
    throw error
  }
}

type CreatedArtifact = Readonly<{ identity: FileIdentity; path: string }>

const exclusivePrivateWrite = async (
  path: string,
  bytes: string,
  directory: PrivateReadinessDirectory,
  created: CreatedArtifact[]
) => {
  await assertPrivateReadinessDirectoryUnchanged(directory)
  const handle = await open(
    path,
    // biome-ignore lint/suspicious/noBitwiseOperators: POSIX open flags are a bitmask.
    constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW |
      constants.O_WRONLY,
    0o600
  )
  try {
    const initialMetadata = await handle.stat()
    const createdArtifact = {
      identity: { dev: initialMetadata.dev, ino: initialMetadata.ino },
      path,
    }
    created.push(createdArtifact)
    await assertPrivateReadinessDirectoryUnchanged(directory)
    const initialPathMetadata = await lstat(path)
    if (!isSameFile(createdArtifact.identity, initialPathMetadata)) {
      throw new Error("four-market-readiness: artifact pathname changed")
    }
    await handle.writeFile(bytes, { encoding: "utf8" })
    await handle.chmod(0o600)
    await handle.sync()
    const metadata = await handle.stat()
    const pathnameMetadata = await lstat(path)
    const ownedByProcess =
      typeof process.getuid !== "function" || metadata.uid === process.getuid()
    if (
      !metadata.isFile() ||
      metadata.nlink !== 1 ||
      !ownedByProcess ||
      metadata.mode % 0o100 !== 0 ||
      !isSameFile(createdArtifact.identity, metadata) ||
      !isSameFile(createdArtifact.identity, pathnameMetadata)
    ) {
      throw new Error("four-market-readiness: artifact output is unsafe")
    }
    await assertPrivateReadinessDirectoryUnchanged(directory)
  } finally {
    await handle.close()
  }
}

const unlinkCreatedArtifact = async (artifact: CreatedArtifact) => {
  const metadata = await lstat(artifact.path)
  if (!isSameFile(artifact.identity, metadata)) {
    throw new Error(
      "four-market-readiness: refusing to unlink substituted artifact"
    )
  }
  await unlink(artifact.path)
}

export const writeFourMarketConvergenceArtifacts = async (
  rootValue: string,
  artifacts: FourMarketConvergenceArtifacts
): Promise<FourMarketConvergenceArtifactRefs> => {
  if (!isAbsolute(rootValue) || resolve(rootValue) !== rootValue) {
    throw new Error(
      "four-market-readiness: artifact root must be an absolute normalized path"
    )
  }
  const rootDirectory = await openPrivateReadinessDirectory(rootValue)
  const root = rootDirectory.path
  const urlRegistryPath = join(root, FOUR_MARKET_URLR_ARTIFACT_PATH)
  const staticTaxonomyPath = join(
    root,
    FOUR_MARKET_STATIC_TAXONOMY_ARTIFACT_PATH
  )
  const directories: PrivateReadinessDirectory[] = []
  const created: CreatedArtifact[] = []
  try {
    const openedDirectories = await Promise.allSettled([
      openPrivateReadinessDirectory(dirname(urlRegistryPath), true),
      openPrivateReadinessDirectory(dirname(staticTaxonomyPath), true),
    ])
    directories.push(
      ...openedDirectories.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : []
      )
    )
    const directoryOpenError = openedDirectories.find(
      (result) => result.status === "rejected"
    )
    if (directoryOpenError?.status === "rejected") {
      throw directoryOpenError.reason
    }
    const [urlRegistryDirectory, staticTaxonomyDirectory] = directories
    if (!(urlRegistryDirectory && staticTaxonomyDirectory)) {
      throw new Error("four-market-readiness: artifact directories unavailable")
    }
    await assertPrivateReadinessDirectoryUnchanged(rootDirectory)
    await exclusivePrivateWrite(
      urlRegistryPath,
      serializeFourMarketUrlrConvergence(artifacts.urlRegistry),
      urlRegistryDirectory,
      created
    )
    await exclusivePrivateWrite(
      staticTaxonomyPath,
      serializeFourMarketStaticTaxonomyConvergence(artifacts.staticTaxonomy),
      staticTaxonomyDirectory,
      created
    )
    await Promise.all([
      assertPrivateReadinessDirectoryUnchanged(rootDirectory),
      ...directories.map(assertPrivateReadinessDirectoryUnchanged),
    ])
  } catch (error) {
    const cleanup = await Promise.allSettled(created.map(unlinkCreatedArtifact))
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
  } finally {
    await Promise.allSettled([
      rootDirectory.handle.close(),
      ...directories.map((directory) => directory.handle.close()),
    ])
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
