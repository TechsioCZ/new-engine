import { randomUUID } from "node:crypto"
import { link, open, readFile, unlink } from "node:fs/promises"
import { isSameImportValue } from "./planner"
import type { RoCatalogImportPlan } from "./types"

export type RoCatalogPlanArtifact = Readonly<{
  plan: RoCatalogImportPlan
  planHash: string
  schemaVersion: 1
}>

const artifactValue = (
  plan: RoCatalogImportPlan,
  planHash: string
): RoCatalogPlanArtifact => ({ plan, planHash, schemaVersion: 1 })

const writePrivateNoClobberArtifact = async (
  outputPath: string,
  contents: string
) => {
  const temporaryPath = `${outputPath}.${process.pid}.${randomUUID()}.tmp`
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(temporaryPath, "wx", 0o600)
    await handle.writeFile(contents, "utf8")
    await handle.sync()
    await handle.close()
    handle = undefined
    await link(temporaryPath, outputPath)
    await unlink(temporaryPath)
  } catch (error) {
    await handle?.close().catch(() => null)
    await unlink(temporaryPath).catch(() => null)
    throw error
  }
}

export const writeRoCatalogPlanArtifact = async (
  outputPath: string,
  plan: RoCatalogImportPlan,
  planHash: string
) => {
  await writePrivateNoClobberArtifact(
    outputPath,
    `${JSON.stringify(artifactValue(plan, planHash), null, 2)}\n`
  )
}

export const assertRoCatalogPlanArtifact = async (
  outputPath: string,
  plan: RoCatalogImportPlan,
  planHash: string
) => {
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(outputPath, "utf8"))
  } catch (error) {
    throw new Error(
      `reviewed plan artifact cannot be read: ${(error as Error).message}`
    )
  }
  if (!isSameImportValue(parsed, artifactValue(plan, planHash))) {
    throw new Error(
      "reviewed plan artifact does not exactly match the fresh import plan"
    )
  }
}

export const writeRoCatalogOmissionLedger = async (
  outputPath: string,
  ledger: NonNullable<RoCatalogImportPlan["omissionLedger"]>
) => {
  await writePrivateNoClobberArtifact(
    outputPath,
    `${JSON.stringify(ledger, null, 2)}\n`
  )
}

export const assertRoCatalogOmissionLedger = async (
  outputPath: string,
  ledger: NonNullable<RoCatalogImportPlan["omissionLedger"]>
) => {
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(outputPath, "utf8"))
  } catch (error) {
    throw new Error(
      `reviewed omission ledger cannot be read: ${(error as Error).message}`
    )
  }
  if (!isSameImportValue(parsed, ledger)) {
    throw new Error(
      "reviewed omission ledger does not exactly match the fresh import plan"
    )
  }
}
