import { execFile } from "node:child_process"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import { expect, test } from "vitest"
import { parse as parseYaml } from "yaml"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..")
const execFileAsync = promisify(execFile)

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
const ciCtlTestPattern = /nubx --node nx run new-engine-ctl:test/
const immutableBaseA11yBaselinePattern =
  /git show "\$\{BASE_SHA\}:libs\/ui\/a11y-baseline\.json" > "\$BASELINE_PATH"/
const baseA11yRegressionPattern =
  /storybook-a11y-regression\.mjs --report-root storybook-a11y-report --baseline "\$BASELINE_PATH" --fail-on-new/
const immutableBaseShaPattern =
  /\$\{\{ github\.event\.pull_request\.base\.sha \|\| github\.sha \}\}/
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

  if (isRecord(value["env"])) {
    envMaps.push(value["env"])
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
        expect(envMap["ZANE_PROJECT_SLUG"]).toBe(
          envMap["ZANEOPS_ZANE_PROJECT_SLUG"]
        )
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

  expect(raw).toMatch(node24Pattern)
  expect(raw).toMatch(ciCtlTestPattern)
})

test("Storybook accessibility CI compares against an immutable base baseline", async () => {
  const workflow = await readFile(
    join(repoRoot, ".github/workflows/storybook-a11y.yml"),
    "utf8"
  )
  const baselineWorkflow = await readFile(
    join(repoRoot, ".github/workflows/storybook-a11y-baseline.yml"),
    "utf8"
  )

  expect(workflow).toContain("fail-on-violations: false")
  expect(workflow).toMatch(immutableBaseShaPattern)
  expect(workflow).toContain('git fetch --no-tags --depth=1 origin "$BASE_SHA"')
  expect(workflow).toMatch(immutableBaseA11yBaselinePattern)
  expect(workflow).toMatch(baseA11yRegressionPattern)
  expect(workflow).not.toMatch(
    /--baseline libs\/ui\/a11y-baseline\.json --fail-on-new/
  )
  expect(baselineWorkflow).not.toMatch(/\bpush:/)
})

test("Storybook baseline changes run and require the explicit authorized workflow", async () => {
  const workflow = await readFile(
    join(repoRoot, ".github/workflows/storybook-a11y.yml"),
    "utf8"
  )
  const baselineWorkflow = await readFile(
    join(repoRoot, ".github/workflows/storybook-a11y-baseline.yml"),
    "utf8"
  )

  expect(workflow).not.toContain("!libs/ui/a11y-baseline.json")
  expect(workflow).toContain(
    "libs/ui/a11y-baseline.json)\n                baseline_changed=true\n                should_run=true"
  )
  expect(workflow).toContain(
    "/actions/workflows/storybook-a11y-baseline.yml/runs?event=workflow_dispatch"
  )
  expect(workflow).toContain(
    'select(.head_sha == env.BASELINE_SHA and .conclusion == "success")'
  )
  expect(workflow).toContain(
    "Accessibility baseline changes require a successful authorized run"
  )
  expect(workflow).toContain("- authorize-baseline-change")
  expect(workflow).toContain(
    "needs.authorize-baseline-change.result == 'success'"
  )
  expect(baselineWorkflow).toContain(
    "Verify proposed baseline matches the authorized scan"
  )
  expect(baselineWorkflow).toContain(
    'cmp --silent "$AUTHORIZED_BASELINE" libs/ui/a11y-baseline.json'
  )
})

test("accessibility regression counts nodes and preserves story coverage", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "storybook-a11y-nodes-"))
  const reportRoot = join(fixtureRoot, "report")
  const baselinePath = join(fixtureRoot, "baseline.json")
  const script = join(repoRoot, "libs/ui/scripts/storybook-a11y-regression.mjs")
  const baseline = {
    description: "node contract fixture",
    themes: Object.fromEntries(
      ["light", "dark"].map((theme) => [
        theme,
        {
          entries: [
            {
              count: 1,
              id: "color-contrast",
              story: "Contract / Injected",
              storyId: "contract--injected",
              target: '["#one"]',
            },
          ],
          stories: 1,
          storyIds: ["contract--injected"],
          violations: 1,
        },
      ])
    ),
    version: 2,
  }

  try {
    for (const theme of ["light", "dark"]) {
      await mkdir(join(reportRoot, theme), { recursive: true })
      await writeFile(
        join(reportRoot, theme, "report.json"),
        JSON.stringify([
          {
            name: "Injected",
            results: {
              violations: [
                {
                  id: "color-contrast",
                  nodes: [{ target: ["#one"] }, { target: ["#two"] }],
                },
              ],
            },
            storyId: "contract--injected",
            title: "Contract",
          },
        ])
      )
    }
    await writeFile(baselinePath, JSON.stringify(baseline))

    await expect(
      execFileAsync(process.execPath, [
        script,
        "--report-root",
        reportRoot,
        "--baseline",
        baselinePath,
        "--fail-on-new",
      ])
    ).rejects.toMatchObject({ code: 1 })

    for (const theme of ["light", "dark"]) {
      await writeFile(join(reportRoot, theme, "report.json"), "[]")
    }
    await expect(
      execFileAsync(process.execPath, [
        script,
        "--report-root",
        reportRoot,
        "--baseline",
        baselinePath,
        "--fail-on-new",
      ])
    ).rejects.toMatchObject({ code: 1 })
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true })
  }
})

test("a PR-edited baseline cannot mask an injected accessibility finding", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "storybook-a11y-contract-"))
  const reportRoot = join(fixtureRoot, "report")
  const baseBaselinePath = join(fixtureRoot, "base-baseline.json")
  const pullRequestBaselinePath = join(fixtureRoot, "pr-baseline.json")
  const report = [
    {
      name: "Injected",
      results: { violations: [{ id: "injected-finding" }] },
      storyId: "contract--injected",
      title: "Contract",
    },
  ]
  const makeBaseline = (count: number) => ({
    description: "contract fixture",
    themes: Object.fromEntries(
      ["light", "dark"].map((theme) => [
        theme,
        {
          entries:
            count === 0
              ? []
              : [
                  {
                    count,
                    id: "injected-finding",
                    story: "Contract / Injected",
                    storyId: "contract--injected",
                    target: "__violation__",
                  },
                ],
          stories: 1,
          storyIds: ["contract--injected"],
          violations: count,
        },
      ])
    ),
    version: 2,
  })

  try {
    for (const theme of ["light", "dark"]) {
      await mkdir(join(reportRoot, theme), { recursive: true })
      await writeFile(
        join(reportRoot, theme, "report.json"),
        JSON.stringify(report)
      )
    }
    await writeFile(baseBaselinePath, JSON.stringify(makeBaseline(0)))
    await writeFile(pullRequestBaselinePath, JSON.stringify(makeBaseline(1)))

    const script = join(
      repoRoot,
      "libs/ui/scripts/storybook-a11y-regression.mjs"
    )
    await expect(
      execFileAsync(process.execPath, [
        script,
        "--report-root",
        reportRoot,
        "--baseline",
        pullRequestBaselinePath,
        "--fail-on-new",
      ])
    ).resolves.toBeDefined()
    await expect(
      execFileAsync(process.execPath, [
        script,
        "--report-root",
        reportRoot,
        "--baseline",
        baseBaselinePath,
        "--fail-on-new",
      ])
    ).rejects.toMatchObject({ code: 1 })
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true })
  }
})
