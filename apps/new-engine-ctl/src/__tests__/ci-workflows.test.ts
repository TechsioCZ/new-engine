import { readFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { expect, test } from "vitest"
import { parse as parseYaml } from "yaml"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..")

const mainWorkflowPath = ".github/workflows/zaneops-main-after-ci.yml"
const previewWorkflowPaths = [
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
const ciCtlTestPattern = /nubx --node nx run new-engine-ctl:test/
const mainVerifyEnvironmentFallbackPattern =
  /ENVIRONMENT_NAME:\s*\$\{\{\s*needs\.deploy\.outputs\.environment_name\s*\|\|\s*secrets\.ZANEOPS_ZANE_PRODUCTION_ENVIRONMENT_NAME\s*\}\}/
const mainVerifySummaryEnvironmentFallbackPattern =
  /ENVIRONMENT_NAME:\s*\$\{\{\s*needs\.deploy\.outputs\.environment_name\s*\|\|\s*secrets\.ZANEOPS_ZANE_PRODUCTION_ENVIRONMENT_NAME\s*\|\|\s*'n\/a'\s*\}\}/
const currentMasterApiPattern =
  /\$GITHUB_API_URL\/repos\/\$GITHUB_REPOSITORY\/git\/ref\/heads\/master/
const freshnessOutputExpression = [
  "$",
  "{{ steps.master.outputs.is_fresh }}",
].join("")

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

async function loadProjectSlugContracts(workflowPaths: string[]) {
  return await Promise.all(
    workflowPaths.map(async (workflowPath) => {
      const raw = await readFile(join(repoRoot, workflowPath), "utf8")
      const parsed = parseYaml(raw)
      const envMaps = collectEnvMaps(parsed)

      return { envMaps, raw }
    })
  )
}

test("main ZaneOps workflow aliases the prefixed project slug secret for ctl", async () => {
  const contracts = await loadProjectSlugContracts([mainWorkflowPath])
  for (const { envMaps, raw } of contracts) {
    expect(raw.includes("ZANE_CANONICAL_PROJECT_SLUG")).toBe(false)
    for (const envMap of envMaps) {
      expect(Object.hasOwn(envMap, "ZANE_CANONICAL_PROJECT_SLUG")).toBe(false)
      if (Object.hasOwn(envMap, "ZANEOPS_ZANE_PROJECT_SLUG")) {
        expect(envMap.ZANE_PROJECT_SLUG).toBe(envMap.ZANEOPS_ZANE_PROJECT_SLUG)
      }
    }
  }
})

// biome-ignore lint/suspicious/noSkippedTests: preview deployment workflows remain intentionally disabled.
test.skip("preview ZaneOps workflows alias the prefixed project slug secret for ctl", async () => {
  const contracts = await loadProjectSlugContracts(previewWorkflowPaths)
  for (const { envMaps, raw } of contracts) {
    expect(raw.includes("ZANE_CANONICAL_PROJECT_SLUG")).toBe(false)
    for (const envMap of envMaps) {
      expect(Object.hasOwn(envMap, "ZANE_CANONICAL_PROJECT_SLUG")).toBe(false)
      if (Object.hasOwn(envMap, "ZANEOPS_ZANE_PROJECT_SLUG")) {
        expect(envMap.ZANE_PROJECT_SLUG).toBe(envMap.ZANEOPS_ZANE_PROJECT_SLUG)
      }
    }
  }
})

test("main deploy passes downtime approval only after the approval gate", async () => {
  const raw = await readFile(
    join(repoRoot, ".github/workflows/zaneops-main-after-ci.yml"),
    "utf8"
  )

  expect(raw).toMatch(downtimeEnvironmentPattern)
  expect(raw).toMatch(downtimeApprovalEnvPattern)
  expect(raw).toMatch(approveDowntimeRiskFlagPattern)
})

test("main verify falls back to the production environment secret", async () => {
  const raw = await readFile(
    join(repoRoot, ".github/workflows/zaneops-main-after-ci.yml"),
    "utf8"
  )

  expect(raw).toMatch(mainVerifyEnvironmentFallbackPattern)
  expect(raw).toMatch(mainVerifySummaryEnvironmentFallbackPattern)
})

test("main deploy rejects stale workflow_run commits before mutation", async () => {
  const raw = await readFile(join(repoRoot, mainWorkflowPath), "utf8")
  const parsed = parseYaml(raw)

  expect(parsed.jobs.deploy.outputs.is_fresh).toBe(freshnessOutputExpression)

  const deploySteps = parsed.jobs.deploy.steps as Record<string, unknown>[]
  const freshnessIndex = deploySteps.findIndex(
    (step) => step.name === "Confirm deploy commit is current master"
  )
  const validateIndex = deploySteps.findIndex(
    (step) => step.name === "Validate deploy inputs"
  )
  const mutationIndex = deploySteps.findIndex(
    (step) => step.name === "Run main deploy"
  )

  expect(freshnessIndex).toBeGreaterThan(-1)
  expect(validateIndex).toBeGreaterThan(-1)
  expect(validateIndex).toBeGreaterThan(freshnessIndex)
  expect(mutationIndex).toBeGreaterThan(validateIndex)
  expect(deploySteps[freshnessIndex]?.run).toMatch(currentMasterApiPattern)
  expect(deploySteps[validateIndex]?.if).toBe(
    "steps.master.outputs.is_fresh == 'true'"
  )
  expect(deploySteps[mutationIndex]?.if).toBe(
    "steps.master.outputs.is_fresh == 'true'"
  )
  expect(parsed.jobs.verify.if).toContain(
    "needs.deploy.outputs.is_fresh == 'true'"
  )
})

test("newer pushes cancel older CI before workflow_run deployment", async () => {
  const [ciRaw, deployRaw] = await Promise.all([
    readFile(join(repoRoot, ".github/workflows/ci.yml"), "utf8"),
    readFile(join(repoRoot, mainWorkflowPath), "utf8"),
  ])
  const ci = parseYaml(ciRaw)
  const deploy = parseYaml(deployRaw)

  expect(ci.concurrency.group).toContain("github.workflow")
  expect(ci.concurrency.group).toContain("github.ref")
  expect(ci.concurrency["cancel-in-progress"]).toBe(true)
  expect(deploy.concurrency.group).toContain(
    "github.event.workflow_run.head_branch"
  )
  expect(deploy.concurrency["cancel-in-progress"]).toBe(true)
  expect(deploy.jobs.deploy.concurrency).toBeUndefined()
  expect(deploy.jobs.verify.concurrency).toBeUndefined()
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

  expect(raw).toMatch(node24Pattern)
  expect(raw).toMatch(ciCtlTestPattern)
})
