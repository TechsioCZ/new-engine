import { readFile, rename, unlink, writeFile } from "node:fs/promises"
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

export const writeRoCatalogPlanArtifact = async (
  outputPath: string,
  plan: RoCatalogImportPlan,
  planHash: string
) => {
  const temporaryPath = `${outputPath}.${process.pid}.${Date.now()}.tmp`
  try {
    await writeFile(
      temporaryPath,
      `${JSON.stringify(artifactValue(plan, planHash), null, 2)}\n`,
      { encoding: "utf8", flag: "wx" }
    )
    await rename(temporaryPath, outputPath)
  } catch (error) {
    await unlink(temporaryPath).catch(() => {
      // Best-effort cleanup of the importer-owned temporary artifact.
    })
    throw error
  }
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
  const temporaryPath = `${outputPath}.${process.pid}.${Date.now()}.tmp`
  try {
    await writeFile(temporaryPath, `${JSON.stringify(ledger, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    })
    await rename(temporaryPath, outputPath)
  } catch (error) {
    await unlink(temporaryPath).catch(() => {
      // Best-effort cleanup of the importer-owned temporary artifact.
    })
    throw error
  }
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
