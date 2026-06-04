import { readFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { expect, test } from "vitest"
import { parse as parseYaml } from "yaml"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..")

const workflowPaths = [
  ".github/workflows/zaneops-main-after-ci.yml",
  ".github/workflows/zaneops-preview-after-ci.yml",
  ".github/workflows/zaneops-preview-teardown.yml",
]
const downtimeEnvironmentPattern =
  /environment:\n\s+name: zaneops-main-downtime/
const downtimeApprovalEnvPattern = /REQUIRES_DOWNTIME_APPROVAL:/
const approveDowntimeRiskFlagPattern = /--approve-downtime-risk/
const baselineCompleteOutputPattern = /baseline_complete:/
const previewBaselineCompleteEnvPattern = /PREVIEW_BASELINE_COMPLETE:/
const previewBaselineCompleteFlagPattern =
  /--preview-baseline-complete "\$PREVIEW_BASELINE_COMPLETE"/
const node26Pattern = /node-version: 26/
const ciCtlTestPattern = /pnpm exec nx run new-engine-ctl:test/
const mainVerifyEnvironmentFallbackPattern =
  /ENVIRONMENT_NAME:\s*\$\{\{\s*needs\.deploy\.outputs\.environment_name\s*\|\|\s*secrets\.ZANEOPS_ZANE_PRODUCTION_ENVIRONMENT_NAME\s*\}\}/
const mainVerifySummaryEnvironmentFallbackPattern =
  /echo "- Environment:\s*\$\{\{\s*needs\.deploy\.outputs\.environment_name\s*\|\|\s*secrets\.ZANEOPS_ZANE_PRODUCTION_ENVIRONMENT_NAME\s*\|\|\s*'n\/a'\s*\}\}"/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function collectEnvMaps(
  value: unknown,
  envMaps: Record<string, unknown>[] = []
) {
  if (!isRecord(value)) {
    return envMaps
  }

  if (isRecord(value.env)) {
    envMaps.push(value.env)
  }

  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        collectEnvMaps(item, envMaps)
      }
      continue
    }

    collectEnvMaps(child, envMaps)
  }

  return envMaps
}

// biome-ignore lint/suspicious/noSkippedTests: ZaneOps workflows are temporarily disabled.
test.skip("ZaneOps workflows alias the prefixed project slug secret for ctl", async () => {
  for (const workflowPath of workflowPaths) {
    const raw = await readFile(join(repoRoot, workflowPath), "utf8")
    const parsed = parseYaml(raw)
    const envMaps = collectEnvMaps(parsed)

    expect(raw.includes("ZANE_CANONICAL_PROJECT_SLUG")).toBe(false)

    for (const envMap of envMaps) {
      expect(Object.hasOwn(envMap, "ZANE_CANONICAL_PROJECT_SLUG")).toBe(false)

      if (Object.hasOwn(envMap, "ZANEOPS_ZANE_PROJECT_SLUG")) {
        expect(envMap.ZANE_PROJECT_SLUG).toBe(envMap.ZANEOPS_ZANE_PROJECT_SLUG)
      }
    }
  }
})

// biome-ignore lint/suspicious/noSkippedTests: ZaneOps workflows are temporarily disabled.
test.skip("main deploy passes downtime approval only after the approval gate", async () => {
  const raw = await readFile(
    join(repoRoot, ".github/workflows/zaneops-main-after-ci.yml"),
    "utf8"
  )

  expect(raw).toMatch(downtimeEnvironmentPattern)
  expect(raw).toMatch(downtimeApprovalEnvPattern)
  expect(raw).toMatch(approveDowntimeRiskFlagPattern)
})

// biome-ignore lint/suspicious/noSkippedTests: ZaneOps workflows are temporarily disabled.
test.skip("main verify falls back to the production environment secret", async () => {
  const raw = await readFile(
    join(repoRoot, ".github/workflows/zaneops-main-after-ci.yml"),
    "utf8"
  )

  expect(raw).toMatch(mainVerifyEnvironmentFallbackPattern)
  expect(raw).toMatch(mainVerifySummaryEnvironmentFallbackPattern)
})

// biome-ignore lint/suspicious/noSkippedTests: ZaneOps workflows are temporarily disabled.
test.skip("preview scope feeds baseline state into prepare decisions", async () => {
  const raw = await readFile(
    join(repoRoot, ".github/workflows/zaneops-preview-after-ci.yml"),
    "utf8"
  )

  expect(raw).toMatch(baselineCompleteOutputPattern)
  expect(raw).toMatch(previewBaselineCompleteEnvPattern)
  expect(raw).toMatch(previewBaselineCompleteFlagPattern)
})

test("main CI runs new-engine-ctl tests on the supported Node version", async () => {
  const raw = await readFile(join(repoRoot, ".github/workflows/ci.yml"), "utf8")

  expect(raw).toMatch(node26Pattern)
  expect(raw).toMatch(ciCtlTestPattern)
})
