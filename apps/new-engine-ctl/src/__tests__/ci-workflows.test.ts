import { execFile } from "node:child_process"
import type { ExecFileException } from "node:child_process"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { promisify } from "node:util"

import { isRecord } from "@techsio/std/object"
import { describe, expect, test } from "vitest"
import { parse as parseYaml } from "yaml"

const repoRoot = path.resolve(import.meta.dirname, "../../../..")
const execFileAsync = promisify(
  (
    file: string,
    args: readonly string[],
    settle: (
      error: ExecFileException | null,
      stdout: string,
      stderr: string,
    ) => void,
  ) => {
    execFile(file, args, settle)
  },
)
const execFileWithEnvAsync = promisify(
  (
    file: string,
    args: readonly string[],
    env: NodeJS.ProcessEnv,
    settle: (
      error: ExecFileException | null,
      stdout: string,
      stderr: string,
    ) => void,
  ) => {
    execFile(file, args, { env }, settle)
  },
)

const runQualityGate = async (
  script: string,
  resultEnvironment: Record<string, string>,
) => {
  await execFileWithEnvAsync("/bin/bash", ["-c", script], {
    ...process.env,
    ...resultEnvironment,
    GITHUB_STEP_SUMMARY: "/dev/null",
  })
}

const findNamedStep = (steps: readonly unknown[], name: string) =>
  steps.find((step) => isRecord(step) && step["name"] === name)

const githubExpression = (expression: string) => `\${{ ${expression} }}`
const shellVariable = (name: string) => `\${${name}}`

const makeAccessibilityReport = (targets: readonly string[]) => [
  {
    name: "Injected",
    results: {
      violations: [
        {
          id: "color-contrast",
          nodes: targets.map((target) => ({ target: [target] })),
        },
      ],
    },
    storyId: "contract--injected",
    title: "Contract",
  },
]

const workflowPaths = [
  ".github/workflows/zaneops-main-after-ci.yml",
  ".github/workflows/zaneops-preview-after-ci.yml",
  ".github/workflows/zaneops-preview-teardown.yml",
]
const downtimeEnvironmentPattern =
  /environment:\n\s+name: zaneops-main-downtime/u
const downtimeApprovalEnvPattern = /REQUIRES_DOWNTIME_APPROVAL:/u
const approveDowntimeRiskFlagPattern = /--approve-downtime-risk/u
const baselineCompleteOutputPattern = /baseline_complete:/u
const previewBaselineCompleteEnvPattern = /PREVIEW_BASELINE_COMPLETE:/u
const previewBaselineCompleteFlagPattern =
  /--preview-baseline-complete "\$PREVIEW_BASELINE_COMPLETE"/u
const node24Pattern = /node-version: 24/u
const ciCtlTestPattern = /nubx --node nx run new-engine-ctl:test/u
const blockingJobIds = [
  "format-and-lint",
  "architecture-and-hygiene",
  "typecheck",
  "design-tokens",
  "tests",
  "builds",
]
const blockingResultEnvironment = {
  ARCHITECTURE_AND_HYGIENE: githubExpression(
    "needs.architecture-and-hygiene.result",
  ),
  BUILDS: githubExpression("needs.builds.result"),
  DESIGN_TOKENS: githubExpression("needs.design-tokens.result"),
  FORMAT_AND_LINT: githubExpression("needs.format-and-lint.result"),
  TESTS: githubExpression("needs.tests.result"),
  TYPECHECK: githubExpression("needs.typecheck.result"),
}
const mainVerifyEnvironmentFallbackPattern =
  /ENVIRONMENT_NAME:\s*\$\{\{\s*needs\.deploy\.outputs\.environment_name\s*\|\|\s*secrets\.ZANEOPS_ZANE_PRODUCTION_ENVIRONMENT_NAME\s*\}\}/u
const mainVerifySummaryEnvironmentFallbackPattern =
  /echo "- Environment:\s*\$\{\{\s*needs\.deploy\.outputs\.environment_name\s*\|\|\s*secrets\.ZANEOPS_ZANE_PRODUCTION_ENVIRONMENT_NAME\s*\|\|\s*'n\/a'\s*\}\}"/u

const collectEnvMaps = (
  value: unknown,
  envMaps: Record<string, unknown>[] = [],
) => {
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

describe("CI workflow contracts", () => {
  // ZaneOps workflows are temporarily disabled.
  test.skipIf(true)(
    "ZaneOps workflows alias the prefixed project slug secret for ctl",
    async () => {
      const rawContents = await Promise.all(
        workflowPaths.map(
          async (workflowPath) =>
            await readFile(path.join(repoRoot, workflowPath), "utf-8"),
        ),
      )

      for (const raw of rawContents) {
        const parsed: unknown = parseYaml(raw)
        const envMaps = collectEnvMaps(parsed)

        expect(raw).not.toContain("ZANE_CANONICAL_PROJECT_SLUG")

        for (const envMap of envMaps) {
          expect(
            Object.hasOwn(envMap, "ZANE_CANONICAL_PROJECT_SLUG"),
          ).toBeFalsy()
          expect(
            !Object.hasOwn(envMap, "ZANEOPS_ZANE_PROJECT_SLUG") ||
              envMap["ZANE_PROJECT_SLUG"] ===
                envMap["ZANEOPS_ZANE_PROJECT_SLUG"],
          ).toBeTruthy()
        }
      }
    },
  )

  // ZaneOps workflows are temporarily disabled.
  test.skipIf(true)(
    "main deploy passes downtime approval only after the approval gate",
    async () => {
      const raw = await readFile(
        path.join(repoRoot, ".github/workflows/zaneops-main-after-ci.yml"),
        "utf-8",
      )

      expect(raw).toMatch(downtimeEnvironmentPattern)
      expect(raw).toMatch(downtimeApprovalEnvPattern)
      expect(raw).toMatch(approveDowntimeRiskFlagPattern)
    },
  )

  // ZaneOps workflows are temporarily disabled.
  test.skipIf(true)(
    "main verify falls back to the production environment secret",
    async () => {
      const raw = await readFile(
        path.join(repoRoot, ".github/workflows/zaneops-main-after-ci.yml"),
        "utf-8",
      )

      expect(raw).toMatch(mainVerifyEnvironmentFallbackPattern)
      expect(raw).toMatch(mainVerifySummaryEnvironmentFallbackPattern)
    },
  )

  // ZaneOps workflows are temporarily disabled.
  test.skipIf(true)(
    "preview scope feeds baseline state into prepare decisions",
    async () => {
      const raw = await readFile(
        path.join(repoRoot, ".github/workflows/zaneops-preview-after-ci.yml"),
        "utf-8",
      )

      expect(raw).toMatch(baselineCompleteOutputPattern)
      expect(raw).toMatch(previewBaselineCompleteEnvPattern)
      expect(raw).toMatch(previewBaselineCompleteFlagPattern)
    },
  )

  test("main CI runs new-engine-ctl tests on the supported Node version", async () => {
    const raw = await readFile(
      path.join(repoRoot, ".github/workflows/ci.yml"),
      "utf-8",
    )

    expect(raw).toMatch(node24Pattern)
    expect(raw).toMatch(ciCtlTestPattern)
  })

  test("main CI pins the documented blocking quality-gate contract", async () => {
    const raw = await readFile(
      path.join(repoRoot, ".github/workflows/ci.yml"),
      "utf-8",
    )
    const workflow: unknown = parseYaml(raw)

    if (!isRecord(workflow) || !isRecord(workflow["jobs"])) {
      throw new TypeError("CI workflow must define a jobs mapping")
    }

    const qualityGate = workflow["jobs"]["quality-gate"]
    if (!isRecord(qualityGate)) {
      throw new TypeError("CI workflow must define the quality-gate job")
    }
    const qualityGateSteps: unknown = qualityGate["steps"]
    if (!Array.isArray(qualityGateSteps)) {
      throw new TypeError("quality-gate must define its steps")
    }

    expect(qualityGate["if"]).toBe("always()")
    expect(qualityGate["needs"]).toStrictEqual(blockingJobIds)

    const reductionStep = findNamedStep(
      qualityGateSteps,
      "Require every blocking lane to pass",
    )
    if (!isRecord(reductionStep)) {
      throw new TypeError(
        "quality-gate must define its blocking reduction step",
      )
    }

    expect(reductionStep["env"]).toStrictEqual(blockingResultEnvironment)
    const qualityGateScript = reductionStep["run"]
    if (typeof qualityGateScript !== "string") {
      throw new TypeError("quality-gate reduction step must define a script")
    }

    const successfulResults = Object.fromEntries(
      Object.keys(blockingResultEnvironment).map((name) => [name, "success"]),
    )
    await expect(
      runQualityGate(qualityGateScript, successfulResults),
    ).resolves.toBeUndefined()

    const rejectedResults = [
      ...Object.keys(blockingResultEnvironment).map((name) => ({
        ...successfulResults,
        [name]: "failure",
      })),
      ...["cancelled", "skipped"].map((result) => ({
        ...successfulResults,
        FORMAT_AND_LINT: result,
      })),
    ]
    await Promise.all(
      rejectedResults.map(async (results) => {
        await expect(
          runQualityGate(qualityGateScript, results),
        ).rejects.toMatchObject({ code: 1 })
      }),
    )
  })

  test("main CI runs the exact production Knip command", async () => {
    const raw = await readFile(
      path.join(repoRoot, ".github/workflows/ci.yml"),
      "utf-8",
    )
    const workflow: unknown = parseYaml(raw)

    if (!isRecord(workflow) || !isRecord(workflow["jobs"])) {
      throw new TypeError("CI workflow must define a jobs mapping")
    }

    const architectureJob = workflow["jobs"]["architecture-and-hygiene"]
    if (!isRecord(architectureJob)) {
      throw new TypeError(
        "CI workflow must define the architecture-and-hygiene job",
      )
    }
    const architectureSteps: unknown = architectureJob["steps"]
    if (!Array.isArray(architectureSteps)) {
      throw new TypeError("architecture-and-hygiene must define its steps")
    }

    const knipStep = findNamedStep(
      architectureSteps,
      "Find unused files, exports, and dependencies",
    )
    if (!isRecord(knipStep)) {
      throw new TypeError("architecture-and-hygiene must define the Knip step")
    }

    expect(knipStep["run"]).toBe("pnpm knip:prod")
  })

  test("Storybook accessibility PR scans report deltas against master", async () => {
    const workflow = await readFile(
      path.join(repoRoot, ".github/workflows/storybook-a11y.yml"),
      "utf-8",
    )

    expect(workflow).toContain("fail-on-violations: false")
    expect(workflow).toContain("post-pr-comment: false")
    expect(workflow).toContain(
      "baseline-workflow-path: .github/workflows/storybook-a11y-baseline.yml",
    )
    expect(workflow).toContain("baseline-branch: master")
    expect(workflow).toContain(
      `baseline-run-id: ${githubExpression("needs.detect-a11y-changes.outputs.baseline-run-id")}`,
    )
  })

  test("Storybook baseline resolution rejects stale scans", async () => {
    const workflow = await readFile(
      path.join(repoRoot, ".github/workflows/storybook-a11y.yml"),
      "utf-8",
    )

    expect(workflow).toContain("latest_relevant=$(git rev-list -1")
    expect(workflow).toContain(
      'git merge-base --is-ancestor "$latest_relevant" "$head_sha"',
    )
    expect(workflow).toContain("for attempt in {1..80}")
    expect(workflow).toContain("sleep 15")
  })

  test("Storybook comparator bootstrap is immutable and available", async () => {
    const workflow = await readFile(
      path.join(repoRoot, ".github/workflows/storybook-a11y.yml"),
      "utf-8",
    )
    const bootstrapCommit = "002322f8a7897be5bd4e5b1ab30840448aa14214"

    expect(workflow).toContain(
      `git cat-file -e "${shellVariable("BASE_SHA")}:libs/ui/scripts/storybook-a11y-regression.mjs"`,
    )
    expect(workflow).toContain(`bootstrap_commit="${bootstrapCommit}"`)
    await expect(
      execFileAsync("git", [
        "-C",
        repoRoot,
        "cat-file",
        "-e",
        `${bootstrapCommit}:libs/ui/scripts/storybook-a11y-regression.mjs`,
      ]),
    ).resolves.toBeDefined()
  })

  test("Storybook accessibility PR scans fail closed on integrity errors", async () => {
    const workflow = await readFile(
      path.join(repoRoot, ".github/workflows/storybook-a11y.yml"),
      "utf-8",
    )

    expect(workflow).toContain("name: Accessibility scan integrity")
    expect(workflow).toContain(
      `run-id: ${githubExpression("needs.detect-a11y-changes.outputs.baseline-run-id")}`,
    )
    expect(workflow).not.toMatch(/pull_request:\n\s+paths:/u)
    expect(workflow).not.toContain("authorize-baseline-change")
    expect(workflow).not.toContain("--fail-on-new")
  })

  test("Storybook baseline scans follow master and refresh before expiry", async () => {
    const workflow = await readFile(
      path.join(repoRoot, ".github/workflows/storybook-a11y-baseline.yml"),
      "utf-8",
    )

    expect(workflow).toMatch(/push:\n\s+branches:\n\s+- master/u)
    expect(workflow).toContain("workflow_dispatch:")
    expect(workflow).toContain('cron: "17 3 * * 1"')
    expect(workflow).toContain("group: storybook-a11y-master-baseline")
    expect(workflow).toContain("cancel-in-progress: false")
  })

  test("Storybook master scans publish only complete baselines", async () => {
    const workflow = await readFile(
      path.join(repoRoot, ".github/workflows/storybook-a11y-baseline.yml"),
      "utf-8",
    )

    expect(workflow).toContain(
      "run: pnpm --filter @techsio/std build && pnpm --filter @techsio/ui-kit build",
    )
    expect(workflow).toContain("retention-days: 30")
    expect(workflow).not.toContain("continue-on-error: true")
    expect(workflow).not.toContain("a11y-baseline.json")
  })

  test("accessibility comparison detects an added node for an existing rule", async () => {
    const fixtureRoot = await mkdtemp(
      path.join(tmpdir(), "storybook-a11y-node-delta-"),
    )
    const baselineRoot = path.join(fixtureRoot, "baseline-report")
    const currentRoot = path.join(fixtureRoot, "current-report")
    const baselinePath = path.join(fixtureRoot, "baseline.json")
    const script = path.join(
      repoRoot,
      "libs/ui/scripts/storybook-a11y-regression.mjs",
    )
    try {
      await Promise.all(
        ["light", "dark"].flatMap((theme) => [
          mkdir(path.join(baselineRoot, theme), { recursive: true }),
          mkdir(path.join(currentRoot, theme), { recursive: true }),
        ]),
      )
      await Promise.all(
        ["light", "dark"].flatMap((theme) => [
          writeFile(
            path.join(baselineRoot, theme, "report.json"),
            JSON.stringify(makeAccessibilityReport(["#one"])),
          ),
          writeFile(
            path.join(currentRoot, theme, "report.json"),
            JSON.stringify(makeAccessibilityReport(["#one", "#two"])),
          ),
        ]),
      )
      await execFileAsync(process.execPath, [
        script,
        "--report-root",
        baselineRoot,
        "--baseline",
        baselinePath,
        "--update-baseline",
      ])

      await expect(
        execFileAsync(process.execPath, [
          script,
          "--report-root",
          currentRoot,
          "--baseline",
          baselinePath,
          "--fail-on-new",
        ]),
      ).rejects.toMatchObject({ code: 1 })
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true })
    }
  })

  test("local Storybook scans do not own master baseline state", async () => {
    const packageJson = await readFile(
      path.join(repoRoot, "libs/ui/package.json"),
      "utf-8",
    )
    const script = await readFile(
      path.join(repoRoot, "libs/ui/scripts/storybook-a11y.sh"),
      "utf-8",
    )

    expect(packageJson).not.toContain('"storybook:a11y:update-baseline"')
    expect(packageJson).not.toContain('"storybook:a11y:ci"')
    expect(script).not.toContain("A11Y_BASELINE_FILE")
    expect(script).not.toContain("A11Y_FAIL_ON_REGRESSION")
    expect(script).not.toContain("storybook-a11y-regression.mjs")
  })
})
