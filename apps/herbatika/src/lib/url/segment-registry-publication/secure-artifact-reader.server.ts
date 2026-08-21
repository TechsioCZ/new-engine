import { constants, type Stats } from "node:fs"
import type { FileHandle } from "node:fs/promises"
import { lstat, open, realpath } from "node:fs/promises"
import {
  dirname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
  sep,
} from "node:path"

type FileIdentity = Readonly<{ dev: number; ino: number }>

type SecureDirectory = Readonly<{
  handle: FileHandle
  identity: FileIdentity
  path: string
}>

export type SecureArtifactBoundary = Readonly<{
  artifactRoot: SecureDirectory
  publicationDirectory: SecureDirectory
  publicationDirectoryRef: string
}>

const isSameFile = (left: FileIdentity, right: FileIdentity) =>
  left.dev === right.dev && left.ino === right.ino

const isProcessOwned = (metadata: Stats) =>
  typeof process.getuid === "function" && metadata.uid === process.getuid()

const assertPrivateDirectoryMetadata = (metadata: Stats) => {
  // biome-ignore lint/suspicious/noBitwiseOperators: POSIX permission masks are bit fields.
  const writableByAnotherPrincipal = (metadata.mode & 0o022) !== 0
  if (
    !metadata.isDirectory() ||
    metadata.isSymbolicLink() ||
    !isProcessOwned(metadata) ||
    writableByAnotherPrincipal
  ) {
    throw new Error("segment-registry artifact directory is unsafe")
  }
}

const assertCanonicalAbsolutePath = (path: string) => {
  if (!isAbsolute(path) || resolve(path) !== path) {
    throw new Error("segment-registry artifact path must be canonical absolute")
  }
}

const assertDirectoryUnchanged = async (directory: SecureDirectory) => {
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
    throw new Error("segment-registry artifact directory changed")
  }
}

const openSecureDirectory = async (path: string): Promise<SecureDirectory> => {
  assertCanonicalAbsolutePath(path)
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
    await assertDirectoryUnchanged(directory)
    return directory
  } catch (error) {
    await handle.close()
    throw error
  }
}

export const openSecureArtifactBoundary = async (
  publicationDirectoryPath: string
): Promise<SecureArtifactBoundary> => {
  assertCanonicalAbsolutePath(publicationDirectoryPath)
  const artifactRoot = await openSecureDirectory(
    dirname(publicationDirectoryPath)
  )
  let publicationDirectory: SecureDirectory | undefined
  try {
    publicationDirectory = await openSecureDirectory(publicationDirectoryPath)
    await assertDirectoryUnchanged(artifactRoot)
    const publicationDirectoryRef = relative(
      artifactRoot.path,
      publicationDirectory.path
    )
    if (
      !publicationDirectoryRef ||
      publicationDirectoryRef.includes(sep) ||
      isAbsolute(publicationDirectoryRef)
    ) {
      throw new Error(
        "segment-registry publication directory must be below its artifact root"
      )
    }
    return { artifactRoot, publicationDirectory, publicationDirectoryRef }
  } catch (error) {
    await Promise.allSettled([
      artifactRoot.handle.close(),
      ...(publicationDirectory ? [publicationDirectory.handle.close()] : []),
    ])
    throw error
  }
}

export const closeSecureArtifactBoundary = async (
  boundary: SecureArtifactBoundary
) => {
  await Promise.allSettled([
    boundary.publicationDirectory.handle.close(),
    boundary.artifactRoot.handle.close(),
  ])
}

const resolveSecureRef = (root: string, ref: string) => {
  if (!ref || isAbsolute(ref) || normalize(ref) !== ref) {
    throw new Error("segment-registry artifact ref is not normalized")
  }
  const path = resolve(root, ref)
  const pathFromRoot = relative(root, path)
  if (
    !pathFromRoot ||
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot)
  ) {
    throw new Error("segment-registry artifact ref escapes its root")
  }
  return { path, pathFromRoot }
}

const assertStableFile = (initial: Stats, final: Stats, pathname: Stats) => {
  if (
    !initial.isFile() ||
    initial.nlink !== 1 ||
    !final.isFile() ||
    final.nlink !== 1 ||
    !pathname.isFile() ||
    pathname.nlink !== 1 ||
    !isSameFile(initial, final) ||
    !isSameFile(final, pathname) ||
    initial.size !== final.size ||
    initial.mtimeMs !== final.mtimeMs ||
    initial.ctimeMs !== final.ctimeMs ||
    final.size !== pathname.size ||
    final.mtimeMs !== pathname.mtimeMs ||
    final.ctimeMs !== pathname.ctimeMs
  ) {
    throw new Error("segment-registry artifact file is unsafe or changed")
  }
}

export const readSecureArtifactText = async (
  boundary: SecureArtifactBoundary,
  ref: string
): Promise<string> => {
  const { path, pathFromRoot } = resolveSecureRef(
    boundary.artifactRoot.path,
    ref
  )
  const directories: SecureDirectory[] = []
  try {
    await Promise.all([
      assertDirectoryUnchanged(boundary.artifactRoot),
      assertDirectoryUnchanged(boundary.publicationDirectory),
    ])
    const parts = pathFromRoot.split(sep)
    let directoryPath = boundary.artifactRoot.path
    for (const part of parts.slice(0, -1)) {
      directoryPath = join(directoryPath, part)
      directories.push(await openSecureDirectory(directoryPath))
    }
    const handle = await open(
      path,
      // biome-ignore lint/suspicious/noBitwiseOperators: POSIX open flags are a bitmask.
      constants.O_RDONLY | constants.O_NOFOLLOW
    )
    try {
      const initialMetadata = await handle.stat()
      const initialPathMetadata = await lstat(path)
      assertStableFile(initialMetadata, initialMetadata, initialPathMetadata)
      const contents = await handle.readFile("utf8")
      const [finalMetadata, finalPathMetadata] = await Promise.all([
        handle.stat(),
        lstat(path),
      ])
      assertStableFile(initialMetadata, finalMetadata, finalPathMetadata)
      await Promise.all([
        assertDirectoryUnchanged(boundary.artifactRoot),
        assertDirectoryUnchanged(boundary.publicationDirectory),
        ...directories.map(assertDirectoryUnchanged),
      ])
      return contents
    } finally {
      await handle.close()
    }
  } finally {
    await Promise.allSettled(directories.map(({ handle }) => handle.close()))
  }
}
