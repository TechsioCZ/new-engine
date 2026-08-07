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
const immutableBaseA11yBaselinePattern =
  /git show "\$\{BASE_SHA\}:libs\/ui\/a11y-baseline\.json" > "\$BASELINE_PATH"/u
const baseA11yRegressionPattern =
  /storybook-a11y-regression\.mjs --report-root storybook-a11y-report --baseline "\$BASELINE_PATH" --fail-on-new/u
const immutableBaseShaPattern =
  /\$\{\{ github\.event\.pull_request\.base\.sha \|\| github\.sha \}\}/u
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

const makeAccessibilityFindingBaseline = (count: number) => ({
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
    ]),
  ),
  version: 2,
})

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

  test("Storybook accessibility CI uses the immutable base SHA and baseline path", async () => {
    const workflow = await readFile(
      path.join(repoRoot, ".github/workflows/storybook-a11y.yml"),
      "utf-8",
    )

    expect(workflow).toContain("fail-on-violations: false")
    expect(workflow).toMatch(immutableBaseShaPattern)
    expect(workflow).toContain(
      'git fetch --no-tags --depth=1 origin "$BASE_SHA"',
    )
    expect(workflow).toMatch(immutableBaseA11yBaselinePattern)
    expect(workflow).toMatch(baseA11yRegressionPattern)
  })

  test("Storybook accessibility CI does not compare against the static committed baseline", async () => {
    const workflow = await readFile(
      path.join(repoRoot, ".github/workflows/storybook-a11y.yml"),
      "utf-8",
    )
    const baselineWorkflow = await readFile(
      path.join(repoRoot, ".github/workflows/storybook-a11y-baseline.yml"),
      "utf-8",
    )

    expect(workflow).not.toMatch(
      /--baseline libs\/ui\/a11y-baseline\.json --fail-on-new/u,
    )
    expect(baselineWorkflow).not.toMatch(/\bpush:/u)
  })

  test("Storybook baseline changes trigger should_run and surface the dispatch link", async () => {
    const workflow = await readFile(
      path.join(repoRoot, ".github/workflows/storybook-a11y.yml"),
      "utf-8",
    )

    expect(workflow).not.toContain("!libs/ui/a11y-baseline.json")
    expect(workflow).toContain(
      "libs/ui/a11y-baseline.json)\n                baseline_changed=true\n                should_run=true",
    )
    expect(workflow).toContain(
      "/actions/workflows/storybook-a11y-baseline.yml/runs?event=workflow_dispatch",
    )
    expect(workflow).toContain(
      'select(.head_sha == env.BASELINE_SHA and .conclusion == "success")',
    )
    expect(workflow).toContain(
      "Accessibility baseline changes require a successful authorized run",
    )
  })

  test("Storybook baseline scan builds dist dependencies and surfaces scan failures", async () => {
    const baselineWorkflow = await readFile(
      path.join(repoRoot, ".github/workflows/storybook-a11y-baseline.yml"),
      "utf-8",
    )

    expect(baselineWorkflow).toContain(
      [
        "      - name: Build test-runner dependencies",
        "        run: pnpm --filter @techsio/std build && pnpm --filter @techsio/ui-kit build",
        "",
        "      - name: Install Playwright browsers",
      ].join("\n"),
    )
    expect(baselineWorkflow).not.toContain("continue-on-error: true")
  })

  test("Storybook baseline change authorization gate blocks unauthorized baseline changes", async () => {
    const workflow = await readFile(
      path.join(repoRoot, ".github/workflows/storybook-a11y.yml"),
      "utf-8",
    )
    const baselineWorkflow = await readFile(
      path.join(repoRoot, ".github/workflows/storybook-a11y-baseline.yml"),
      "utf-8",
    )

    expect(workflow).toContain("- authorize-baseline-change")
    expect(workflow).toContain(
      [
        "AUTHORIZATION_RESULT: ${{",
        "needs.authorize-baseline-change.result }}",
      ].join(" "),
    )
    expect(workflow).toContain(
      '[ "$BASELINE_CHANGED" = "true" ] && [ "$AUTHORIZATION_RESULT" != "success" ]',
    )
    expect(baselineWorkflow).toContain(
      "Verify proposed baseline matches the authorized scan",
    )
    expect(baselineWorkflow).toContain(
      'cmp --silent "$AUTHORIZED_BASELINE" libs/ui/a11y-baseline.json',
    )
  })

  test("accessibility regression counts nodes and preserves story coverage", async () => {
    const fixtureRoot = await mkdtemp(
      path.join(tmpdir(), "storybook-a11y-nodes-"),
    )
    const reportRoot = path.join(fixtureRoot, "report")
    const baselinePath = path.join(fixtureRoot, "baseline.json")
    const script = path.join(
      repoRoot,
      "libs/ui/scripts/storybook-a11y-regression.mjs",
    )
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
        ]),
      ),
      version: 2,
    }

    try {
      await Promise.all(
        ["light", "dark"].map(async (theme) => {
          await mkdir(path.join(reportRoot, theme), { recursive: true })
          await writeFile(
            path.join(reportRoot, theme, "report.json"),
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
            ]),
          )
        }),
      )
      await writeFile(baselinePath, JSON.stringify(baseline))

      await expect(
        execFileAsync(process.execPath, [
          script,
          "--report-root",
          reportRoot,
          "--baseline",
          baselinePath,
          "--fail-on-new",
        ]),
      ).rejects.toMatchObject({ code: 1 })

      await Promise.all(
        ["light", "dark"].map(async (theme) => {
          await writeFile(path.join(reportRoot, theme, "report.json"), "[]")
        }),
      )
      await expect(
        execFileAsync(process.execPath, [
          script,
          "--report-root",
          reportRoot,
          "--baseline",
          baselinePath,
          "--fail-on-new",
        ]),
      ).rejects.toMatchObject({ code: 1 })
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true })
    }
  })

  test("a PR-edited baseline cannot mask an injected accessibility finding", async () => {
    const fixtureRoot = await mkdtemp(
      path.join(tmpdir(), "storybook-a11y-contract-"),
    )
    const reportRoot = path.join(fixtureRoot, "report")
    const baseBaselinePath = path.join(fixtureRoot, "base-baseline.json")
    const pullRequestBaselinePath = path.join(fixtureRoot, "pr-baseline.json")
    const report = [
      {
        name: "Injected",
        results: { violations: [{ id: "injected-finding" }] },
        storyId: "contract--injected",
        title: "Contract",
      },
    ]

    try {
      await Promise.all(
        ["light", "dark"].map(async (theme) => {
          await mkdir(path.join(reportRoot, theme), { recursive: true })
          await writeFile(
            path.join(reportRoot, theme, "report.json"),
            JSON.stringify(report),
          )
        }),
      )
      await writeFile(
        baseBaselinePath,
        JSON.stringify(makeAccessibilityFindingBaseline(0)),
      )
      await writeFile(
        pullRequestBaselinePath,
        JSON.stringify(makeAccessibilityFindingBaseline(1)),
      )

      const script = path.join(
        repoRoot,
        "libs/ui/scripts/storybook-a11y-regression.mjs",
      )
      await expect(
        execFileAsync(process.execPath, [
          script,
          "--report-root",
          reportRoot,
          "--baseline",
          pullRequestBaselinePath,
          "--fail-on-new",
        ]),
      ).resolves.toBeDefined()
      await expect(
        execFileAsync(process.execPath, [
          script,
          "--report-root",
          reportRoot,
          "--baseline",
          baseBaselinePath,
          "--fail-on-new",
        ]),
      ).rejects.toMatchObject({ code: 1 })
    } finally {
      await rm(fixtureRoot, { force: true, recursive: true })
    }
  })
})
