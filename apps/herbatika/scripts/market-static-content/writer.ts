import { randomUUID } from "node:crypto"
import { link, mkdir, open, unlink } from "node:fs/promises"
import { basename, dirname, join } from "node:path"

const ignoreCleanupError = (_error: unknown): void => {
  // Cleanup is best-effort after the primary write or publication result.
}

export const writeStaticContentPlanNoClobber = async (
  outputPath: string,
  contents: string
): Promise<void> => {
  const parent = dirname(outputPath)
  await mkdir(parent, { recursive: true, mode: 0o700 })
  const temporaryPath = join(
    parent,
    `.${basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`
  )
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(temporaryPath, "wx", 0o600)
    await handle.writeFile(contents, { encoding: "utf8" })
    await handle.sync()
    await handle.close()
    handle = undefined
    await link(temporaryPath, outputPath)
    const directoryHandle = await open(parent, "r")
    try {
      await directoryHandle.sync()
    } finally {
      await directoryHandle.close()
    }
  } finally {
    await handle?.close().catch(ignoreCleanupError)
    await unlink(temporaryPath).catch(ignoreCleanupError)
  }
}
