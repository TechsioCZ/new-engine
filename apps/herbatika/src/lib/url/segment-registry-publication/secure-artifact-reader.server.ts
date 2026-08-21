import { constants, type Stats } from "node:fs"
import type { FileHandle } from "node:fs/promises"
import { lstat, open, realpath } from "node:fs/promises"
import {
  basename,
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
  policy: "private" | "trusted-ancestor"
}>

export type SecureArtifactBoundary = Readonly<{
  directories: readonly SecureDirectory[]
  artifactRoot: SecureDirectory
  publicationDirectory: SecureDirectory
  publicationDirectoryRef: string
}>

const isSameFile = (left: FileIdentity, right: FileIdentity) =>
  left.dev === right.dev && left.ino === right.ino

const isProcessOwned = (metadata: Stats) =>
  typeof process.getuid === "function" && metadata.uid === process.getuid()

const isWritableByAnotherPrincipal = (metadata: Stats) => {
  // biome-ignore lint/suspicious/noBitwiseOperators: POSIX permission masks are bit fields.
  return (metadata.mode & 0o022) !== 0
}

const isRootOwnedStickyDirectory = (metadata: Stats) => {
  // biome-ignore lint/suspicious/noBitwiseOperators: POSIX mode flags are bit fields.
  return metadata.uid === 0 && (metadata.mode & 0o1000) !== 0
}

const assertPrivateDirectoryMetadata = (metadata: Stats) => {
  if (
    !metadata.isDirectory() ||
    metadata.isSymbolicLink() ||
    !isProcessOwned(metadata) ||
    isWritableByAnotherPrincipal(metadata)
  ) {
    throw new Error("segment-registry artifact directory is unsafe")
  }
}

const assertTrustedAncestorMetadata = (metadata: Stats) => {
  const ownedByTrustedPrincipal = metadata.uid === 0 || isProcessOwned(metadata)
  if (
    !metadata.isDirectory() ||
    metadata.isSymbolicLink() ||
    !ownedByTrustedPrincipal ||
    (isWritableByAnotherPrincipal(metadata) &&
      !isRootOwnedStickyDirectory(metadata))
  ) {
    throw new Error("segment-registry artifact ancestor is unsafe")
  }
}

const assertDirectoryMetadata = (
  metadata: Stats,
  policy: SecureDirectory["policy"]
) => {
  if (policy === "private") {
    assertPrivateDirectoryMetadata(metadata)
  } else {
    assertTrustedAncestorMetadata(metadata)
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
  assertDirectoryMetadata(pathnameMetadata, directory.policy)
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

const openSecureDirectory = async (
  path: string,
  policy: SecureDirectory["policy"]
): Promise<SecureDirectory> => {
  assertCanonicalAbsolutePath(path)
  const pathnameMetadata = await lstat(path)
  assertDirectoryMetadata(pathnameMetadata, policy)
  if ((await realpath(path)) !== path) {
    throw new Error("segment-registry artifact directory is not canonical")
  }
  const handle = await open(
    path,
    // biome-ignore lint/suspicious/noBitwiseOperators: POSIX open flags are a bitmask.
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW
  )
  const directory = {
    handle,
    identity: { dev: pathnameMetadata.dev, ino: pathnameMetadata.ino },
    path,
    policy,
  }
  try {
    await assertDirectoryUnchanged(directory)
    return directory
  } catch (error) {
    await handle.close()
    throw error
  }
}

const pathPartsBelowRoot = (path: string) =>
  relative(sep, path).split(sep).filter(Boolean)

/**
 * Node does not expose openat(2), so make absolute pathname traversal safe by
 * starting at the non-renamable filesystem root and holding every directory
 * descriptor in the chain. Each parent is exclusively controlled by root or
 * this process identity; an untrusted principal therefore cannot rename or
 * substitute the next component during a leaf read. The process UID is the
 * explicit trust domain for these unsigned publication bundles.
 */
export const openSecureArtifactBoundary = async (
  publicationDirectoryPath: string
): Promise<SecureArtifactBoundary> => {
  assertCanonicalAbsolutePath(publicationDirectoryPath)
  const artifactRootPath = dirname(publicationDirectoryPath)
  const publicationDirectoryRef = basename(publicationDirectoryPath)
  if (
    !publicationDirectoryRef ||
    dirname(artifactRootPath) === artifactRootPath
  ) {
    throw new Error(
      "segment-registry publication directory must be below its artifact root"
    )
  }
  const directories: SecureDirectory[] = []
  try {
    const root = await openSecureDirectory(sep, "trusted-ancestor")
    directories.push(root)
    let parent = root
    for (const part of pathPartsBelowRoot(publicationDirectoryPath)) {
      const path = join(/* turbopackIgnore: true */ parent.path, part)
      const policy: SecureDirectory["policy"] =
        path === artifactRootPath || path === publicationDirectoryPath
          ? "private"
          : "trusted-ancestor"
      const directory = await openSecureDirectory(path, policy)
      directories.push(directory)
      parent = directory
    }
    const artifactRoot = directories.find(
      (directory) => directory.path === artifactRootPath
    )
    const publicationDirectory = directories.at(-1)
    if (
      !(artifactRoot && publicationDirectory) ||
      publicationDirectory.path !== publicationDirectoryPath
    ) {
      throw new Error("segment-registry artifact boundary is incomplete")
    }
    await Promise.all(directories.map(assertDirectoryUnchanged))
    return {
      artifactRoot,
      directories,
      publicationDirectory,
      publicationDirectoryRef,
    }
  } catch (error) {
    await Promise.allSettled(directories.map(({ handle }) => handle.close()))
    throw error
  }
}

export const closeSecureArtifactBoundary = async (
  boundary: SecureArtifactBoundary
) => {
  await Promise.allSettled(
    boundary.directories.map(({ handle }) => handle.close())
  )
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
    !isProcessOwned(initial) ||
    isWritableByAnotherPrincipal(initial) ||
    !final.isFile() ||
    final.nlink !== 1 ||
    !isProcessOwned(final) ||
    isWritableByAnotherPrincipal(final) ||
    !pathname.isFile() ||
    pathname.nlink !== 1 ||
    !isProcessOwned(pathname) ||
    isWritableByAnotherPrincipal(pathname) ||
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
    await Promise.all(boundary.directories.map(assertDirectoryUnchanged))
    const parts = pathFromRoot.split(sep)
    let directoryPath = boundary.artifactRoot.path
    for (const part of parts.slice(0, -1)) {
      directoryPath = join(directoryPath, part)
      directories.push(await openSecureDirectory(directoryPath, "private"))
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
        ...boundary.directories.map(assertDirectoryUnchanged),
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
