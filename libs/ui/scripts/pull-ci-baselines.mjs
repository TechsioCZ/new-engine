// Turns the screenshots a CI run already rendered into committed Linux baselines,
// so nobody has to record them on a laptop.
//   node scripts/pull-ci-baselines.mjs (<run-id> | --pr <number> | --branch <name>) [--out <dir>] [--dry-run]
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { parseArgs } from "node:util"
import { PNG } from "pngjs"

const uiRoot = path.resolve(import.meta.dirname, "..")
const DEFAULT_OUT = path.join(uiRoot, "test/visual.spec.ts-snapshots")
const ACTUAL_SUFFIX = "-actual"
const CONTAINER_RESULTS = "/app/test-results/"
const REPORT_PATH = path.join("test-results", "visual-reports", "all.json")
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])
const DIGITS = /^\d+$/
const AUTH_FAILURE = /gh auth login|not logged into|HTTP 401/i
const NO_ARTIFACTS = /no valid artifacts|no artifacts/i

/**
 * @typedef {{ kind: "run", id: string } | { kind: "pr", number: string } | { kind: "branch", name: string }} Selector
 * @typedef {{ target: string, projectName: string, source: string, file: string | null, body: Buffer | null }} ActualEntry
 * @typedef {{ projectName: string, source: string, bytes: Buffer }} Screenshot
 */

/**
 * @param {string[]} argv
 * @returns {{ selector: Selector, out: string, dryRun: boolean }}
 */
export function parseCli(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      pr: { type: "string" },
      branch: { type: "string" },
      out: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  })
  const given = [
    positionals.length > 0,
    values.pr !== undefined,
    values.branch !== undefined,
  ].filter(Boolean).length
  if (given !== 1 || positionals.length > 1) {
    throw new Error(
      "Give exactly one of <run-id>, --pr <number>, --branch <name>"
    )
  }
  return {
    selector: parseSelector(positionals[0], values),
    out: path.resolve(values.out ?? DEFAULT_OUT),
    dryRun: values["dry-run"],
  }
}

/**
 * @param {string | undefined} runId
 * @param {{ pr?: string, branch?: string }} values
 * @returns {Selector}
 */
function parseSelector(runId, values) {
  if (runId !== undefined) {
    if (!DIGITS.test(runId)) {
      throw new Error(`Run id must be a number, got ${runId}`)
    }
    return { kind: "run", id: runId }
  }
  if (values.pr !== undefined) {
    if (!DIGITS.test(values.pr)) {
      throw new Error(`--pr must be a number, got ${values.pr}`)
    }
    return { kind: "pr", number: values.pr }
  }
  if (!values.branch) {
    throw new Error("--branch must not be empty")
  }
  return { kind: "branch", name: values.branch }
}

/**
 * Explains a failed gh call in terms of what the user should do next.
 * @param {unknown} error
 * @returns {string}
 */
export function explainGhFailure(error) {
  const failure =
    /** @type {{ code?: string, stderr?: unknown, message?: string }} */ (error)
  if (failure.code === "ENOENT") {
    return "gh is not installed or not on PATH (https://cli.github.com)"
  }
  const stderr = String(failure.stderr ?? "")
  if (AUTH_FAILURE.test(stderr)) {
    return "gh is not authenticated; run `gh auth login`"
  }
  if (NO_ARTIFACTS.test(stderr)) {
    return "the run has no ui-component-results artifacts (it passed, or the artifacts expired)"
  }
  return `gh failed: ${stderr.trim() || failure.message || "unknown error"}`
}

/**
 * @param {string[]} args
 * @returns {string}
 */
function gh(args) {
  try {
    return execFileSync("gh", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    })
  } catch (error) {
    throw new Error(explainGhFailure(error), { cause: error })
  }
}

/**
 * Picks the newest run that finished its jobs. `gh run list` returns newest
 * first; cancelled and skipped runs are completed too but uploaded nothing.
 * @param {{ databaseId: number, status: string, conclusion?: string | null, headSha: string }[]} runs
 * @param {string} label what the runs were listed for
 * @returns {{ id: string, headSha: string }}
 */
export function chooseRun(runs, label) {
  const run = runs.find(
    (item) =>
      item.status === "completed" &&
      item.conclusion !== "cancelled" &&
      item.conclusion !== "skipped"
  )
  if (!run) {
    throw new Error(`No completed CI run found for ${label}`)
  }
  return { id: String(run.databaseId), headSha: run.headSha }
}

/**
 * @param {Selector} selector
 * @returns {{ id: string, headSha: string }}
 */
function resolveRun(selector) {
  if (selector.kind === "run") {
    const run = JSON.parse(
      gh(["run", "view", selector.id, "--json", "databaseId,headSha"])
    )
    return { id: String(run.databaseId), headSha: run.headSha }
  }
  const branch =
    selector.kind === "pr"
      ? JSON.parse(gh(["pr", "view", selector.number, "--json", "headRefName"]))
          .headRefName
      : selector.name
  const runs = JSON.parse(
    gh([
      "run",
      "list",
      "--workflow",
      "CI",
      "--branch",
      branch,
      "--json",
      "databaseId,status,conclusion,headSha",
      "--limit",
      "20",
    ])
  )
  return chooseRun(runs, `branch ${branch}`)
}

/**
 * Visits every test of a Playwright JSON report, including nested suites.
 * @param {object[] | undefined} suites
 * @param {(test: object) => void} visit
 */
function forEachTest(suites, visit) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        visit(test)
      }
    }
    forEachTest(suite.suites, visit)
  }
}

/**
 * @param {string} attachmentName
 * @param {string} projectName
 * @returns {string} the committed baseline file name for this screenshot
 */
export function targetName(attachmentName, projectName) {
  if (!attachmentName.endsWith(ACTUAL_SUFFIX)) {
    throw new Error(`Not an actual-screenshot attachment: ${attachmentName}`)
  }
  const base = attachmentName.slice(0, -ACTUAL_SUFFIX.length)
  const name = `${base}-${projectName}-linux.png`
  // Both parts come from a downloaded report; never let them leave the folder.
  if (name !== path.basename(name) || name.includes("\\")) {
    throw new Error(`Unsafe baseline file name: ${name}`)
  }
  return name
}

/**
 * @param {Buffer} buffer
 * @returns {boolean}
 */
export function isPng(buffer) {
  return (
    buffer.length >= PNG_SIGNATURE.length &&
    buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  )
}

/**
 * Maps a path inside the CI container to where the artifact was downloaded.
 * @param {unknown} containerPath
 * @param {string} shardDir
 * @returns {string}
 */
function localSource(containerPath, shardDir) {
  if (
    typeof containerPath !== "string" ||
    !containerPath.startsWith(CONTAINER_RESULTS)
  ) {
    throw new Error(
      `Attachment path must start with ${CONTAINER_RESULTS}: ${String(containerPath)}`
    )
  }
  return path.join(
    shardDir,
    "test-results",
    containerPath.slice(CONTAINER_RESULTS.length)
  )
}

/**
 * Where one attachment's bytes live. The JSON report keeps screenshots inline
 * as base64 `body` (with `path: null`); a file attachment has a container `path`.
 * @param {{ name: string, path?: string | null, body?: string }} attachment
 * @param {string} shardDir
 * @returns {{ source: string, file: string | null, body: Buffer | null }}
 */
function attachmentOrigin(attachment, shardDir) {
  if (typeof attachment.body === "string") {
    return {
      source: `${path.join(shardDir, REPORT_PATH)} (${attachment.name})`,
      file: null,
      body: Buffer.from(attachment.body, "base64"),
    }
  }
  if (attachment.path == null) {
    throw new Error(
      `Attachment ${attachment.name} has neither a body nor a path`
    )
  }
  const file = localSource(attachment.path, shardDir)
  return { source: file, file, body: null }
}

/**
 * Lists every rendered screenshot (a PNG attachment named "-actual") in one report.
 * @param {{ suites?: object[] }} report parsed Playwright JSON report
 * @param {string} shardDir folder the shard artifact was downloaded into
 * @returns {ActualEntry[]}
 */
export function collectActualAttachments(report, shardDir) {
  const entries = []
  forEachTest(report.suites, (test) => {
    for (const result of test.results ?? []) {
      for (const attachment of result.attachments ?? []) {
        if (
          attachment.name?.endsWith(ACTUAL_SUFFIX) &&
          attachment.contentType === "image/png"
        ) {
          entries.push({
            target: targetName(attachment.name, test.projectName),
            projectName: test.projectName,
            ...attachmentOrigin(attachment, shardDir),
          })
        }
      }
    }
  })
  return entries
}

/**
 * Reads each source once. Retries and shards can render the same screenshot
 * twice; identical bytes are fine, different bytes abort the pull.
 * @param {ActualEntry[]} entries
 * @returns {Map<string, Screenshot>}
 */
export function uniqueScreenshots(entries) {
  /** @type {Map<string, Screenshot>} */
  const byTarget = new Map()
  for (const entry of entries) {
    const bytes = entry.body ?? readSource(entry.file ?? "")
    const seen = byTarget.get(entry.target)
    if (!seen) {
      byTarget.set(entry.target, {
        projectName: entry.projectName,
        source: entry.source,
        bytes,
      })
    } else if (!seen.bytes.equals(bytes)) {
      throw new Error(
        `Conflicting screenshots for ${entry.target}: ${seen.source} and ${entry.source} differ`
      )
    }
  }
  return byTarget
}

/**
 * @param {string} source
 * @returns {Buffer}
 */
function readSource(source) {
  try {
    return fs.readFileSync(source)
  } catch (error) {
    throw new Error(`Missing screenshot file ${source}`, { cause: error })
  }
}

/**
 * @param {Buffer} bytes
 * @returns {string | null} why the bytes are not a usable PNG, or null
 */
export function invalidReason(bytes) {
  if (bytes.length === 0) {
    return "empty file"
  }
  if (!isPng(bytes)) {
    return "not a PNG"
  }
  try {
    PNG.sync.read(bytes)
  } catch (error) {
    return `not decodable: ${error instanceof Error ? error.message : String(error)}`
  }
  return null
}

/**
 * Throws before anything is written if any screenshot is unusable.
 * @param {Map<string, Screenshot>} screenshots
 */
export function assertUsable(screenshots) {
  const problems = []
  for (const [target, shot] of screenshots) {
    const reason = invalidReason(shot.bytes)
    if (reason) {
      problems.push(`${target} (${shot.source}): ${reason}`)
    }
  }
  if (problems.length) {
    throw new Error(
      `Refusing to write: ${problems.length} invalid screenshot(s), nothing was written:\n  ${problems.join("\n  ")}`
    )
  }
}

/**
 * Decides per target whether it is a new file, a replacement, or already identical.
 * @param {Map<string, Screenshot>} screenshots
 * @param {string} outDir
 * @returns {{ target: string, dest: string, bytes: Buffer, action: "new" | "replace" | "unchanged", projectName: string }[]}
 */
export function planWrites(screenshots, outDir) {
  return [...screenshots].map(([target, shot]) => {
    const dest = path.join(outDir, target)
    let action = "new"
    if (fs.existsSync(dest)) {
      action = fs.readFileSync(dest).equals(shot.bytes)
        ? "unchanged"
        : "replace"
    }
    return {
      target,
      dest,
      bytes: shot.bytes,
      action,
      projectName: shot.projectName,
    }
  })
}

/**
 * Writes via a temporary sibling and a rename, so a partial file never appears.
 * @param {string} dest
 * @param {Buffer} bytes
 */
function writeAtomically(dest, bytes) {
  const temp = path.join(
    path.dirname(dest),
    `.${path.basename(dest)}.${process.pid}.tmp`
  )
  try {
    fs.writeFileSync(temp, bytes)
    fs.renameSync(temp, dest)
  } catch (error) {
    fs.rmSync(temp, { force: true })
    throw error
  }
}

/**
 * @param {string} downloadDir
 * @returns {string[]} shard folders that hold a Playwright JSON report
 */
function findShardFolders(downloadDir) {
  return fs
    .readdirSync(downloadDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(downloadDir, entry.name))
    .filter((folder) => fs.existsSync(path.join(folder, REPORT_PATH)))
}

/**
 * @param {string} shardDir
 * @returns {{ suites?: object[] }}
 */
function readReport(shardDir) {
  return JSON.parse(fs.readFileSync(path.join(shardDir, REPORT_PATH), "utf8"))
}

/**
 * @param {string} runId
 * @param {string} downloadDir
 */
function downloadArtifacts(runId, downloadDir) {
  gh([
    "run",
    "download",
    runId,
    "--pattern",
    "ui-component-results-*",
    "--dir",
    downloadDir,
  ])
}

/**
 * @param {Map<string, Screenshot>} screenshots
 * @returns {Record<string, number>}
 */
function countByProject(screenshots) {
  /** @type {Record<string, number>} */
  const counts = {}
  for (const shot of screenshots.values()) {
    counts[shot.projectName] = (counts[shot.projectName] ?? 0) + 1
  }
  return counts
}

/**
 * @param {ReturnType<typeof planWrites>} plan
 * @returns {Record<"new" | "replace" | "unchanged", number>}
 */
function countActions(plan) {
  const counts = { new: 0, replace: 0, unchanged: 0 }
  for (const item of plan) {
    counts[item.action] += 1
  }
  return counts
}

/**
 * @param {ReturnType<typeof planWrites>} plan
 */
function writePlan(plan) {
  for (const item of plan) {
    if (item.action !== "unchanged") {
      writeAtomically(item.dest, item.bytes)
    }
  }
}

/**
 * @param {{ id: string, headSha: string }} run
 * @param {Map<string, Screenshot>} screenshots
 * @param {ReturnType<typeof planWrites>} plan
 * @param {boolean} dryRun
 */
function printSummary(run, screenshots, plan, dryRun) {
  const actions = countActions(plan)
  console.log(`Run ${run.id}, head ${run.headSha}`)
  console.log(`Screenshots: ${screenshots.size}`)
  for (const [project, count] of Object.entries(countByProject(screenshots))) {
    console.log(`  ${project}: ${count}`)
  }
  console.log(
    `New files: ${actions.new}, replacements: ${actions.replace}, identical: ${actions.unchanged}`
  )
  if (dryRun) {
    for (const item of plan) {
      console.log(`  [${item.action}] ${item.dest}`)
    }
    console.log("Dry run: nothing was written.")
    return
  }
  console.log(
    "Review `git status` and the images before committing the baselines."
  )
}

/**
 * @param {string[]} argv
 */
export function pullBaselines(argv) {
  const options = parseCli(argv)
  const ci = resolveRun(options.selector)
  console.log(`Using CI run ${ci.id} (head ${ci.headSha})`)
  const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), "ci-baselines-"))
  try {
    downloadArtifacts(ci.id, downloadDir)
    const shards = findShardFolders(downloadDir)
    if (!shards.length) {
      throw new Error(
        "the run has no ui-component-results artifacts with a visual report (it passed, or the artifacts expired)"
      )
    }
    const entries = shards.flatMap((shard) =>
      collectActualAttachments(readReport(shard), shard)
    )
    if (!entries.length) {
      throw new Error(
        `run ${ci.id} has no "-actual" attachments: the run has no failed screenshot comparisons`
      )
    }
    const screenshots = uniqueScreenshots(entries)
    assertUsable(screenshots)
    const plan = planWrites(screenshots, options.out)
    printSummary(ci, screenshots, plan, options.dryRun)
    if (!options.dryRun) {
      fs.mkdirSync(options.out, { recursive: true })
      writePlan(plan)
    }
  } finally {
    fs.rmSync(downloadDir, { recursive: true, force: true })
  }
}

if (import.meta.filename === path.resolve(process.argv[1] ?? "")) {
  try {
    pullBaselines(process.argv.slice(2))
  } catch (error) {
    console.error(
      `pull-ci-baselines: ${error instanceof Error ? error.message : String(error)}`
    )
    process.exitCode = 1
  }
}
