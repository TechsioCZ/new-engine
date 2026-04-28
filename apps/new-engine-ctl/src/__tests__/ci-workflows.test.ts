import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

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
const node24Pattern = /node-version: 24/
const ciCtlTestPattern = /pnpm exec nx run new-engine-ctl:test/

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

test("ZaneOps workflows alias the prefixed project slug secret for ctl", async () => {
  for (const workflowPath of workflowPaths) {
    const raw = await readFile(join(repoRoot, workflowPath), "utf8")
    const parsed = parseYaml(raw)
    const envMaps = collectEnvMaps(parsed)

    assert.equal(
      raw.includes("ZANE_CANONICAL_PROJECT_SLUG"),
      false,
      `${workflowPath} must not use the old canonical project slug env`
    )

    for (const envMap of envMaps) {
      assert.equal(
        Object.hasOwn(envMap, "ZANE_CANONICAL_PROJECT_SLUG"),
        false,
        `${workflowPath} contains the old canonical project slug env`
      )

      if (Object.hasOwn(envMap, "ZANEOPS_ZANE_PROJECT_SLUG")) {
        assert.equal(
          envMap.ZANE_PROJECT_SLUG,
          envMap.ZANEOPS_ZANE_PROJECT_SLUG,
          `${workflowPath} must expose ZANE_PROJECT_SLUG as the ctl alias`
        )
      }
    }
  }
})

test("main deploy passes downtime approval only after the approval gate", async () => {
  const raw = await readFile(
    join(repoRoot, ".github/workflows/zaneops-main-after-ci.yml"),
    "utf8"
  )

  assert.match(raw, downtimeEnvironmentPattern)
  assert.match(raw, downtimeApprovalEnvPattern)
  assert.match(raw, approveDowntimeRiskFlagPattern)
})

test("preview scope feeds baseline state into prepare decisions", async () => {
  const raw = await readFile(
    join(repoRoot, ".github/workflows/zaneops-preview-after-ci.yml"),
    "utf8"
  )

  assert.match(raw, baselineCompleteOutputPattern)
  assert.match(raw, previewBaselineCompleteEnvPattern)
  assert.match(raw, previewBaselineCompleteFlagPattern)
})

test("preview deploy does not pass DB passwords through GitHub outputs", async () => {
  const raw = await readFile(
    join(repoRoot, ".github/workflows/zaneops-preview-after-ci.yml"),
    "utf8"
  )

  assert.equal(raw.includes("preview_db_password"), false)
  assert.equal(raw.includes("PREVIEW_DB_PASSWORD"), false)
})

test("main CI runs new-engine-ctl tests on the supported Node version", async () => {
  const raw = await readFile(join(repoRoot, ".github/workflows/ci.yml"), "utf8")

  assert.match(raw, node24Pattern)
  assert.match(raw, ciCtlTestPattern)
})
