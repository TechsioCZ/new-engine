// One deterministic plan, evaluated during each consumer's existing checkout;
// no planning runner or changed-path artifact dependency before browser startup.
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { classifyScope, GIT_MAX_BUFFER } from "./visual-affected-stories.mjs"

const temporary = process.env.RUNNER_TEMP
if (!temporary) throw new Error("RUNNER_TEMP is required")
const changedDirectory = path.join(temporary, "ui-changed-files")
const planDirectory = path.join(temporary, "ui-build-plan")
fs.mkdirSync(changedDirectory, { recursive: true })
fs.mkdirSync(planDirectory, { recursive: true })
let scope = "full"
if (process.env.MODE === "changed" && process.env.BASE_SHA) {
  let base
  try {
    base = execFileSync(
      "git",
      ["merge-base", process.env.BASE_SHA, process.env.HEAD_SHA],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim()
  } catch {
    // An unavailable comparison must still run the full regression gate.
  }
  if (base) {
    const changed = execFileSync(
      "git",
      [
        "diff",
        "-z",
        "--name-only",
        "--no-renames",
        base,
        process.env.HEAD_SHA,
      ],
      { maxBuffer: GIT_MAX_BUFFER },
    )
    fs.writeFileSync(path.join(changedDirectory, "changed-files.txt"), changed)
    scope = classifyScope(changed.toString().split("\0").filter(Boolean))
  }
}
const idle = scope === "none"
const bundles = 6
// Accessibility scans as theme@shard. main scans business-light beside its
// lower-priority checks, then akros-light; bundle 2 already installs the
// scanner and takes n1-light (main-ci-checks.sh, ui-quality.yml).
const mainScans = ["business-light@1/1", "akros-light@1/1"]
const bundleScans = { 2: ["n1-light@1/1"] }
const matrix = {
  include: Array.from({ length: bundles }, (_, index) => ({
    group: "visual",
    shard: index + 1,
    total: bundles,
    a11y: (bundleScans[index + 1] ?? []).join(" "),
  })),
}
const themes = ["business-light", "akros-light", "n1-light"]
const scans = [...mainScans, ...Object.values(bundleScans).flat()]
const shards = Object.fromEntries(
  themes.map((theme) => [
    theme,
    scans.filter((scan) => scan.startsWith(`${theme}@`)).length,
  ]),
)
fs.writeFileSync(
  path.join(planDirectory, "expected.json"),
  JSON.stringify(
    {
      scope,
      components: idle
        ? { include: [], groups: {}, total: 0 }
        : {
            include: matrix.include,
            groups: { visual: bundles, desktop: 1, mobile: 1 },
            total: bundles + 2,
          },
      a11y: {
        themes: idle ? [] : themes,
        shards: idle ? {} : shards,
        total: idle ? 0 : scans.length,
      },
    },
    null,
    2,
  ) + "\n",
)
if (process.env.GITHUB_OUTPUT)
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `scope=${scope}\n`)
console.log(`UI scope: ${scope}; ${idle ? 0 : bundles} browser bundles`)
