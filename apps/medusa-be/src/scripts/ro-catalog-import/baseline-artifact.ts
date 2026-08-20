import { randomUUID } from "node:crypto"
import { open, rename, unlink } from "node:fs/promises"
import { extname, isAbsolute } from "node:path"
import type { RoCatalogSkProtectionAudit } from "./types"

export type RoCatalogSkBaselineArtifact = Readonly<{
  capturedAt: string
  provenance: "fresh-medusa-database-read"
  schemaVersion: 1
  skProtection: RoCatalogSkProtectionAudit
}>

const readFlagValue = (args: readonly string[], index: number) => {
  const argument = args[index]
  if (argument?.startsWith("--output=")) {
    return { consumed: 0, value: argument.slice("--output=".length) }
  }
  return { consumed: 1, value: args[index + 1] }
}

export const parseRoCatalogSkBaselineOutputPath = (
  args: readonly string[]
): string => {
  let outputPath: string | undefined
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument !== "--output" && !argument?.startsWith("--output=")) {
      throw new Error(`Unknown argument: ${argument}`)
    }
    if (outputPath) {
      throw new Error("--output may only be supplied once")
    }
    const parsed = readFlagValue(args, index)
    if (!parsed.value || parsed.value.startsWith("--")) {
      throw new Error("Missing required --output value")
    }
    outputPath = parsed.value
    index += parsed.consumed
  }
  if (!outputPath) {
    throw new Error("--output is required")
  }
  if (!isAbsolute(outputPath) || extname(outputPath) !== ".json") {
    throw new Error("--output must be an absolute .json path")
  }
  return outputPath
}

export const buildRoCatalogSkBaselineArtifact = (
  skProtection: RoCatalogSkProtectionAudit,
  capturedAt = new Date().toISOString()
): RoCatalogSkBaselineArtifact => {
  if (skProtection.publication.errors > 0) {
    throw new Error(
      `Cannot capture an SK baseline with ${skProtection.publication.errors} publication error(s)`
    )
  }
  return {
    capturedAt,
    provenance: "fresh-medusa-database-read",
    schemaVersion: 1,
    skProtection,
  }
}

export const writeRoCatalogSkBaselineArtifact = async (
  outputPath: string,
  artifact: RoCatalogSkBaselineArtifact
) => {
  const temporaryPath = `${outputPath}.${process.pid}.${randomUUID()}.tmp`
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(temporaryPath, "wx", 0o600)
    await handle.writeFile(`${JSON.stringify(artifact, null, 2)}\n`, "utf8")
    await handle.sync()
    await handle.close()
    handle = undefined
    await rename(temporaryPath, outputPath)
  } catch (error) {
    await handle?.close().catch(() => null)
    await unlink(temporaryPath).catch(() => null)
    throw error
  }
}
