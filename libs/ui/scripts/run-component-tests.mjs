import { spawnSync } from "node:child_process"
import crypto from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  assertPrimaryBaselines,
  assertReleaseSelection,
  assertVisualCompletion,
  parseReleaseShard,
  visualStories,
} from "../test/visual-completion.mjs"
import {
  assertGroupsCoverProjects,
  createProjectNames,
  createVisualMatrix,
  groupProjectNames,
  PLAYWRIGHT_GROUPS,
} from "../test/visual-projects.mjs"
import {
  affectedStoriesFromDisk,
  gitChangedFiles,
  readPathList,
} from "./visual-affected-stories.mjs"
import { ensureStorybookBuild } from "./visual-storybook-build.mjs"
import { trackedBaselines } from "./component-baselines.mjs"
import {
  assertBehaviorCompletion,
  behaviorShardPlan,
} from "./component-behavior-shards.mjs"

// Runs the Playwright visual tests inside Docker for reproducible snapshots.
const uiRoot = path.resolve(import.meta.dirname, "..")
const repoRoot = path.resolve(uiRoot, "../..")
const playwrightVersionPattern = /^ARG\s+PLAYWRIGHT_VERSION\s*=\s*([^\s]+)\s*$/m
const updateSnapshotsPattern = /^(?:-u|--update-snapshots)(?:=(\w+))?$/

const dockerfilePath = path.join(
  repoRoot,
  "docker/development/playwright/Dockerfile"
)
const dockerfile = fs.readFileSync(dockerfilePath, "utf8")
const dockerfileHash = crypto
  .createHash("sha256")
  .update(dockerfile)
  .digest("hex")
  .slice(0, 12)
const playwrightVersion = dockerfile.match(playwrightVersionPattern)?.[1]
// Introspection flag: prints the resolved image, platform, group and shard as
// JSON and exits without touching Storybook or Docker. CI and the tooling
// tests both read it, so the tag and the group filter
// have exactly one definition.
const printPlan = process.argv.slice(2).includes("--print-plan")
const extraArgs = process.argv
  .slice(2)
  .filter((arg) => arg !== "--" && arg !== "--print-plan")
const updatesSnapshots = extraArgs.some((arg, index) => {
  const match = updateSnapshotsPattern.exec(arg)
  const mode = match?.[1] ?? (match && extraArgs[index + 1])
  return match && mode !== "none"
})
// Committed baselines are rendered on linux/amd64 (CI). Local comparison runs use
// the host architecture because emulation is several times slower; snapshot
// updates and release runs stay on linux/amd64.
/** @returns {string} */
function resolvePlatform() {
  if (process.env.PLAYWRIGHT_DOCKER_PLATFORM) {
    return process.env.PLAYWRIGHT_DOCKER_PLATFORM
  }
  if (updatesSnapshots || process.env.VISUAL_RELEASE_READINESS === "1") {
    return "linux/amd64"
  }
  return process.arch === "arm64" ? "linux/arm64" : "linux/amd64"
}
const platform = resolvePlatform()
if (!["linux/amd64", "linux/arm64"].includes(platform)) {
  throw new Error(
    `Unsupported PLAYWRIGHT_DOCKER_PLATFORM "${platform}": allowed values are linux/amd64 and linux/arm64`
  )
}
const platformTag =
  platform === "linux/amd64" ? "" : `-${platform.split("/").at(-1)}`
// CI caches this content-addressed image, with no registry or credentials.
const imageTag = `${playwrightVersion ? `${playwrightVersion}-` : ""}${dockerfileHash}${platformTag}`
const imageName =
  process.env.PLAYWRIGHT_DOCKER_IMAGE ?? `new-engine-ui-playwright:${imageTag}`
const projects = createVisualMatrix(process.env.VISUAL_BRANDS).map(
  (project) => project.name
)
// CI separates mobile/desktop behavior and visual projects. Behavior uses
// the same measured file allocator as visuals, without native re-sharding.
// Focused CLI calls retain native selection and sharding instead.
const group = (process.env.PLAYWRIGHT_GROUP ?? "").trim() || undefined
const sequentialProjects =
  (process.env.PLAYWRIGHT_DOCKER_SEQUENTIAL ?? "0") !== "0"
const storybookOverride = process.env.VISUAL_STORYBOOK_STATIC_DIR
const storybookDir = storybookOverride ?? path.join(uiRoot, "storybook-static")
const harPath =
  process.env.VISUAL_ASSET_HAR_PATH ??
  path.join(uiRoot, "test/fixtures/visual-assets/assets.har")
// Changed mode (VISUAL_CHANGED_SINCE) rewrites these three bindings together:
// the container TEST_STORIES env, the selected story list and the Playwright args.
let testStories = process.env.TEST_STORIES
let selectedStories = (testStories ?? "")
  .split(",")
  .map((story) => story.trim())
  .filter(Boolean)
const changedSince = (process.env.VISUAL_CHANGED_SINCE ?? "").trim()
// Explicit repo-relative paths; when set they replace the git diff entirely.
const explicitChangedFilesList = (process.env.VISUAL_CHANGED_FILES ?? "").trim()
const explicitChangedFiles = explicitChangedFilesList
  .split(",")
  .map((file) => file.trim())
  .filter(Boolean)
// A file list beats the env list because a file can hold thousands of paths.
const changedFilesPath = (process.env.VISUAL_CHANGED_FILES_FROM ?? "").trim()
const changedMode =
  changedSince !== "" ||
  explicitChangedFilesList !== "" ||
  changedFilesPath !== ""
// Also run the component behavior specs in a changed subset.
const changedBehavior = process.env.VISUAL_CHANGED_BEHAVIOR === "1"
const dryRun = process.env.VISUAL_CHANGED_DRY_RUN === "1"
// Set just before `docker run`; until then cleanup has nothing to remove.
let containerRequested = false
// Set by narrowToStories: only the screenshot spec runs, selected by project.
let changedSubset = false
// Changed mode rejects release readiness in main() with a clearer message.
if (process.env.VISUAL_RELEASE_READINESS === "1" && !changedMode) {
  assertReleaseSelection(extraArgs, process.env)
}
// CI splits the release run; scripts/verify-component-shards.mjs then asserts
// completeness over every shard report together.
const releaseShard = parseReleaseShard(process.env.PLAYWRIGHT_RELEASE_SHARD)
// Non-release shard: splits a focused or changed run without the release guarantees.
const playwrightShard = parseReleaseShard(
  process.env.PLAYWRIGHT_SHARD,
  "PLAYWRIGHT_SHARD"
)
const activeShard = releaseShard ?? playwrightShard
const behaviorPlan =
  (group === "desktop" || group === "mobile") && extraArgs.length === 0
    ? behaviorShardPlan(group, activeShard)
    : undefined
const containerName = `pw-visual-${crypto.randomUUID()}`
// Each `playwright test` run empties test-results, so reports live beside it.
const reportRoot = "/app/visual-reports"
// Concurrent CI suites own separate output trees; no suite overwrites another.
const outputRoot = process.env.PLAYWRIGHT_OUTPUT_DIR ?? uiRoot

/** @param {string} command @param {string[]} args @param {import("node:child_process").SpawnSyncOptions} [options] */
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options })
  if (result.error || result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`)
  }
  return result
}

/** @param {string[]} args */
function docker(args) {
  return spawnSync("docker", args, { stdio: "pipe" })
}

function cleanup() {
  if (!containerRequested) {
    return
  }
  docker(["container", "rm", "--force", containerName])
}

/** @typedef {{status: string, annotations?: {type: string, description?: string}[]}} ReportTest */
/** @typedef {{specs?: {file: string, tests: ReportTest[]}[], suites?: ReportSuite[]}} ReportSuite */
/** @param {ReportSuite[]} suites @param {string} [file] @returns {ReportTest[]} */
function reportTests(suites, file) {
  return suites.flatMap((suite) => [
    ...(suite.specs ?? [])
      .filter((spec) => file === undefined || spec.file === file)
      .flatMap((spec) => spec.tests),
    ...reportTests(suite.suites ?? [], file),
  ])
}

/** @param {ReportSuite[]} suites @returns {{file: string, storyId?: string}[]} */
function failedTests(suites) {
  return suites.flatMap((suite) => [
    ...(suite.specs ?? []).flatMap((spec) =>
      spec.tests
        .filter((test) => test.status === "unexpected")
        .map((test) => ({
          file: spec.file,
          storyId: test.annotations?.find(
            (annotation) => annotation.type === "visual-story-id"
          )?.description,
        }))
    ),
    ...failedTests(suite.suites ?? []),
  ])
}

/** @param {(string | undefined)[]} values @returns {string[]} */
function uniqueSorted(values) {
  return [...new Set(values.filter((value) => value !== undefined))].sort()
}

/** @param {{errors: unknown[], stats: {unexpected: number, flaky: number}, suites: ReportSuite[]}[]} reports */
function verifyCompletion(reports) {
  if (behaviorPlan && extraArgs.length === 0) {
    assertBehaviorCompletion(reports, group, behaviorPlan.testFiles)
    return
  }
  const stories = visualStories(
    JSON.parse(fs.readFileSync(path.join(storybookDir, "index.json"), "utf8"))
      .entries
  )
  // A group run covers part of the project list, so completeness belongs to
  // scripts/verify-component-shards.mjs over every group's merged reports.
  const requireComplete =
    selectedStories.length === 0 && extraArgs.length === 0 && !group
  if (requireComplete && !activeShard) {
    assertVisualCompletion(reports, stories, projects)
    return
  }
  const ran = reports.flatMap((report) => reportTests(report.suites))
  // A PLAYWRIGHT_SHARD may hold no tests of a changed subset; failures never pass.
  const mayBeEmpty = playwrightShard !== undefined && !ran.length
  const dirty = reports.some(
    ({ errors, stats }) => errors.length || stats.unexpected || stats.flaky
  )
  if (!(ran.length || mayBeEmpty) || dirty) {
    throw new Error("Focused component run was empty or not clean")
  }
}

function verifyReviewedBaselines() {
  const entries = visualStories(
    JSON.parse(fs.readFileSync(path.join(storybookDir, "index.json"), "utf8"))
      .entries
  )
  assertPrimaryBaselines(
    entries,
    createVisualMatrix(),
    new Set(trackedBaselines(repoRoot).map((file) => path.posix.basename(file)))
  )
}

/** The tag of an image reference, "" when it carries none. A colon before the
 * last slash is a registry port, not a tag.
 * @param {string} reference
 * @returns {string}
 */
function imageReferenceTag(reference) {
  const colon = reference.lastIndexOf(":")
  return colon > reference.lastIndexOf("/") ? reference.slice(colon + 1) : ""
}

/** A cached image is equivalent to a built one only while the tag is the
 * content hash of the Dockerfile in this checkout. Asserting that is what makes
 * the pull a second source of one artifact rather than an untested image. */
function assertImageMatchesDockerfile() {
  const tag = imageReferenceTag(imageName)
  if (tag !== imageTag) {
    throw new Error(
      `Docker image "${imageName}" is tagged "${tag}", not "${imageTag}" for the checked-out docker/development/playwright/Dockerfile`
    )
  }
}

/** Use the local image (restored by CI when cached), otherwise build it. */
function ensureDockerImage() {
  const started = Date.now()
  /** @param {string} source */
  const report = (source) => {
    const seconds = ((Date.now() - started) / 1000).toFixed(1)
    console.log(`Docker image ${imageName}: ${source} in ${seconds}s`)
    console.log(`Using Docker platform: ${platform}`)
  }
  if (docker(["image", "inspect", imageName]).status === 0) {
    report("already on this runner")
    return
  }
  run("docker", [
    "build",
    `--platform=${platform}`,
    "-t",
    imageName,
    "-f",
    dockerfilePath,
    repoRoot,
  ])
  report("built")
}

function startContainer() {
  const env = {
    CI: "true",
    PLAYWRIGHT_DOCKER: "1",
    PLAYWRIGHT_WORKERS: process.env.PLAYWRIGHT_WORKERS ?? "4",
    PLAYWRIGHT_VISUAL_SHARD:
      group === "visual" && activeShard
        ? `${activeShard.index}/${activeShard.total}`
        : undefined,
    TEST_BASE_URL: process.env.TEST_BASE_URL,
    TEST_STORIES: testStories,
    VISUAL_BRANDS: process.env.VISUAL_BRANDS,
    VISUAL_ASSET_HAR_PATH: `/app/visual-assets/${path.basename(harPath)}`,
  }
  const mounts = [
    [storybookDir, "/app/storybook-static"],
    [path.join(uiRoot, "playwright.config.mts"), "/app/playwright.config.mts"],
    [path.join(uiRoot, "package.json"), "/app/package.json"],
    [
      path.join(uiRoot, "src/theme/theme-config.ts"),
      "/app/src/theme/theme-config.ts",
    ],
    [path.dirname(harPath), "/app/visual-assets"],
  ]
  containerRequested = true
  run(
    "docker",
    [
      "run",
      "--detach",
      "--name",
      containerName,
      "--label",
      "io.techsio.visual-tests=1",
      `--platform=${platform}`,
      `--shm-size=${process.env.PLAYWRIGHT_DOCKER_SHM_SIZE ?? "2g"}`,
      `--ipc=${process.env.PLAYWRIGHT_DOCKER_IPC ?? "host"}`,
      "--add-host=host.docker.internal:host-gateway",
      ...Object.entries(env).flatMap(([key, value]) =>
        value === undefined ? [] : ["--env", `${key}=${value}`]
      ),
      ...mounts.flatMap(([source, destination]) => [
        "--volume",
        `${fs.realpathSync(source)}:${destination}:ro`,
      ]),
      "--entrypoint",
      "sleep",
      imageName,
      "infinity",
    ],
    { stdio: ["ignore", "ignore", "inherit"] }
  )
  // docker cp streams a tar archive, avoiding copy_file_range corruption on VM
  // bind mounts; the copy stays writable for snapshot updates.
  run("docker", [
    "cp",
    path.join(uiRoot, "test/."),
    `${containerName}:/app/test`,
  ])
  run("docker", [
    "exec",
    "--user",
    "0",
    containerName,
    "chown",
    "-R",
    "node:node",
    "/app/test",
  ])
}

/** @returns {boolean} */
function userChoseProject() {
  return extraArgs.some(
    (arg) => arg === "--project" || arg.startsWith("--project=")
  )
}

/**
 * The one place that decides which Playwright projects a run covers. Release
 * runs and changed runs share it, so a group narrows both: release mode rejects
 * CLI arguments, which is why the group is an environment input and never
 * --project from YAML. An empty list means "every project in the config".
 * @returns {string[]}
 */
function selectedProjectNames() {
  if (userChoseProject()) {
    return []
  }
  if (group) {
    return groupProjectNames(group, process.env.VISUAL_BRANDS)
  }
  // A changed subset only screenshots: the desktop project excludes
  // visual.spec.ts and the mobile project lists its specs, so neither matches.
  return changedSubset ? [...projects] : []
}

/**
 * Projects to run one by one, for PLAYWRIGHT_DOCKER_SEQUENTIAL. Changed mode
 * "all" is a normal full run and keeps every project.
 * @returns {Array<string | undefined>}
 */
function projectRunList() {
  if (!sequentialProjects || userChoseProject()) {
    return [undefined]
  }
  const selected = selectedProjectNames()
  return selected.length
    ? selected
    : createProjectNames(process.env.VISUAL_BRANDS)
}

/**
 * File selection uses the screenshot allocator for behavior too. Never pass
 * --shard after selecting files: that would partition the selection twice.
 * Empty mobile allocations are explicit, not an unfiltered Playwright run.
 * @returns {string[]}
 */
function shardArgs() {
  if (behaviorPlan && activeShard) {
    return behaviorPlan.testFiles.length
      ? behaviorPlan.testFiles.map(
          (file) =>
            `/^/app/test/${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$/`
        )
      : ["$^", "--pass-with-no-tests"]
  }
  if (!activeShard) {
    return []
  }
  // Screenshot specs split stories inside each project. Native sharding would
  // partition the already narrowed tests a second time and omit identities.
  const flags =
    group === "visual"
      ? []
      : [`--shard=${activeShard.index}/${activeShard.total}`]
  return playwrightShard ? [...flags, "--pass-with-no-tests"] : flags
}

/** @returns {{reportNames: string[], status: number}} */
function runPlaywrightProjects() {
  const reportNames = []
  let status = 0
  for (const project of projectRunList()) {
    const reportName = `${project ?? "all"}.json`
    reportNames.push(reportName)
    const command = [
      "npx",
      "playwright",
      "test",
      "-c",
      "playwright.config.mts",
      "--reporter=list,html,json",
      ...(project
        ? [`--project=${project}`]
        : selectedProjectNames().map((name) => `--project=${name}`)),
      ...shardArgs(),
      ...extraArgs,
    ]
    // Measure the actual container workload, including browser descendants,
    // rather than the host docker client's negligible CPU time. Bash preserves
    // the command's exit status and positional arguments without re-parsing.
    const measured = process.env.GITHUB_ACTIONS === "true"
    if (measured) {
      console.log(
        `Playwright resources: ${process.env.PLAYWRIGHT_WORKERS ?? "4"} workers, ${os.availableParallelism()} runner CPUs`
      )
    }
    const result = spawnSync(
      "docker",
      [
        "exec",
        "--tty",
        "--env",
        `PLAYWRIGHT_JSON_OUTPUT_FILE=${reportRoot}/${reportName}`,
        containerName,
        ...(measured
          ? [
              "bash",
              "-c",
              'TIMEFORMAT="Playwright workload: wall %3R s, user %3U s, system %3S s"; time "$@"',
              "--",
              ...command,
            ]
          : command),
      ],
      { stdio: "inherit" }
    )
    status = result.status ?? 1
    if (status !== 0) {
      break
    }
  }
  return { reportNames, status }
}

function copyResultsToHost() {
  fs.mkdirSync(outputRoot, { recursive: true })
  if (updatesSnapshots) {
    run("docker", [
      "cp",
      `${containerName}:/app/test/visual.spec.ts-snapshots/.`,
      path.join(uiRoot, "test/visual.spec.ts-snapshots"),
    ])
  }
  for (const [source, destination] of [
    ["/app/playwright-report/.", "playwright-report"],
    ["/app/test-results/.", "test-results"],
    [`${reportRoot}/.`, "test-results/visual-reports"],
  ]) {
    docker([
      "cp",
      `${containerName}:${source}`,
      path.join(outputRoot, destination),
    ])
  }
  if (activeShard) {
    // The shard verifier needs the exact story list this commit was built with.
    fs.copyFileSync(
      path.join(storybookDir, "index.json"),
      path.join(outputRoot, "test-results/visual-reports/index.json")
    )
  }
}

/** @param {string[]} reportNames */
function readReports(reportNames) {
  return reportNames.map((name) =>
    JSON.parse(
      run("docker", ["exec", containerName, "cat", `${reportRoot}/${name}`], {
        stdio: "pipe",
        // Full-matrix JSON reports exceed spawnSync's 1 MiB default buffer.
        maxBuffer: 512 * 1024 * 1024,
      }).stdout.toString()
    )
  )
}

/**
 * Rejects option combinations that make changed mode meaningless or unsafe.
 */
function assertChangedModeCompatible() {
  if (dryRun && !changedMode) {
    throw new Error(
      "VISUAL_CHANGED_DRY_RUN=1 requires VISUAL_CHANGED_SINCE, VISUAL_CHANGED_FILES or VISUAL_CHANGED_FILES_FROM; without them it would start a full Docker run"
    )
  }
  if (!changedMode) {
    return
  }
  if (process.env.VISUAL_RELEASE_READINESS === "1") {
    throw new Error(
      "Changed mode cannot be combined with VISUAL_RELEASE_READINESS=1: release runs cover every story"
    )
  }
  if (selectedStories.length > 0) {
    throw new Error(
      "Changed mode cannot be combined with TEST_STORIES: both choose the stories to run"
    )
  }
  if (releaseShard) {
    throw new Error(
      "Changed mode cannot be combined with PLAYWRIGHT_RELEASE_SHARD: a sharded subset is meaningless"
    )
  }
}

/**
 * @param {string} ref
 * @returns {string[]}
 */
function changedFilesSince(ref) {
  try {
    return gitChangedFiles(repoRoot, ref)
  } catch (error) {
    throw new Error(
      `Cannot diff against VISUAL_CHANGED_SINCE "${ref}": ${error instanceof Error ? error.message : error}`
    )
  }
}

/**
 * Focuses the run on the given stories; the screenshot spec is selected by project.
 * @param {string[]} storyIds
 */
function narrowToStories(storyIds) {
  testStories = storyIds.join(",")
  selectedStories = [...storyIds]
  // Behavior specs ignore TEST_STORIES, so they stay out unless requested.
  changedSubset = !changedBehavior
  console.log(
    changedBehavior
      ? `Changed mode: ${storyIds.length} visual stories selected; component behavior specs run in full (VISUAL_CHANGED_BEHAVIOR=1).`
      : `Changed mode: ${storyIds.length} visual stories selected; only screenshot specs run (VISUAL_CHANGED_BEHAVIOR=1 adds the behavior specs).`
  )
}

/**
 * Repo-relative paths from VISUAL_CHANGED_FILES_FROM, else VISUAL_CHANGED_FILES.
 * Null when neither is set, so git decides.
 * @returns {{ source: string, files: string[] } | null}
 */
function explicitChangedFileList() {
  if (changedFilesPath !== "") {
    return {
      source: `file ${changedFilesPath}`,
      files: readChangedFilesFile(changedFilesPath),
    }
  }
  if (explicitChangedFilesList !== "") {
    return { source: "explicit files", files: explicitChangedFiles }
  }
  return null
}

/** @param {string} file */
function readChangedFilesFile(file) {
  try {
    return readPathList(file)
  } catch (error) {
    throw new Error(
      `Cannot read VISUAL_CHANGED_FILES_FROM "${file}": ${error instanceof Error ? error.message : error}`
    )
  }
}

/**
 * Leaves an artifact for CI when a changed run has nothing to screenshot.
 * @param {string} reason
 */
function writeNoneReport(reason) {
  const file = path.join(
    outputRoot,
    "test-results/visual-reports/changed-none.json"
  )
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(
    file,
    `${JSON.stringify({ mode: "none", reason }, null, 2)}\n`
  )
}

/**
 * Applies changed mode before any Docker work. Returns false when the run ends here.
 * A dry run only reads the existing Storybook index and never builds or starts Docker.
 * @returns {boolean}
 */
function applyChangedMode() {
  if (!changedMode) {
    return true
  }
  if (dryRun && !fs.existsSync(path.join(storybookDir, "index.json"))) {
    throw new Error(
      `Storybook index not found: ${path.join(storybookDir, "index.json")}. Build Storybook first.`
    )
  }
  const explicit = explicitChangedFileList()
  if (explicit && changedSince) {
    console.log(
      "An explicit file list is set (VISUAL_CHANGED_FILES_FROM or VISUAL_CHANGED_FILES): VISUAL_CHANGED_SINCE is ignored, git is not consulted."
    )
  }
  const selection = affectedStoriesFromDisk({
    repoRoot,
    storybookDir,
    changedFiles: explicit ? explicit.files : changedFilesSince(changedSince),
  })
  console.log(
    `Changed mode (${explicit ? explicit.source : changedSince}): ${selection.mode} - ${selection.reason}`
  )
  if (dryRun) {
    console.log(
      JSON.stringify({
        mode: selection.mode,
        reason: selection.reason,
        count: selection.storyIds.length,
        storyIds: selection.storyIds,
      })
    )
    return false
  }
  if (selection.mode === "none") {
    console.log(
      "No visual story is affected by these changes; no Docker container started."
    )
    writeNoneReport(selection.reason)
    return false
  }
  if (selection.mode === "subset") {
    narrowToStories(selection.storyIds)
  }
  return true
}

/**
 * Native local runs differ from the linux/amd64 baselines by a few anti-aliased
 * pixels in rare stories, so a failure there is only a regression once the
 * canonical platform agrees.
 * @param {string[]} reportNames
 */
function printCanonicalPlatformHint(reportNames) {
  if (platform === "linux/amd64") {
    return
  }
  /** @type {{file: string, storyId?: string}[]} */
  let failed
  try {
    failed = readReports(reportNames).flatMap((report) =>
      failedTests(report.suites)
    )
  } catch {
    // A crashed run leaves no report to read.
    return
  }
  const storyIds = uniqueSorted(failed.map((test) => test.storyId))
  const behaviorFiles = uniqueSorted(
    failed.filter((test) => !test.storyId).map((test) => `test/${test.file}`)
  )
  const lines = []
  if (storyIds.length) {
    lines.push(
      `${storyIds.length} screenshot ${storyIds.length === 1 ? "story" : "stories"} failed on ${platform}. Baselines are rendered on linux/amd64;`,
      "confirm there before treating this as a regression:",
      `  PLAYWRIGHT_DOCKER_PLATFORM=linux/amd64 TEST_STORIES=${storyIds.join(",")} pnpm -C libs/ui test:components -- test/visual.spec.ts`
    )
  }
  if (behaviorFiles.length) {
    lines.push(
      `${behaviorFiles.length} behavior spec ${behaviorFiles.length === 1 ? "file" : "files"} failed on ${platform}. CI runs them on linux/amd64;`,
      "confirm there before treating this as a regression:",
      `  PLAYWRIGHT_DOCKER_PLATFORM=linux/amd64 pnpm -C libs/ui test:components -- ${behaviorFiles.join(" ")}`
    )
  }
  if (lines.length) {
    console.log(["", ...lines, ""].join("\n"))
  }
}

/**
 * Release shards belong to the release gate and never mix with a PLAYWRIGHT_SHARD.
 * Either shard variable also requires a group: a count-based shard across the
 * whole project list is a contiguous partition of a heterogeneous suite, which
 * is why eight equal-sized shards used to run between 2.4 and 14.5 minutes.
 */
function assertShardCompatible() {
  if (playwrightShard && releaseShard) {
    throw new Error(
      "PLAYWRIGHT_SHARD cannot be combined with PLAYWRIGHT_RELEASE_SHARD: set only one shard variable"
    )
  }
  if (playwrightShard && process.env.VISUAL_RELEASE_READINESS === "1") {
    throw new Error(
      "PLAYWRIGHT_SHARD cannot be combined with VISUAL_RELEASE_READINESS=1: release runs shard with PLAYWRIGHT_RELEASE_SHARD"
    )
  }
  if (activeShard && !group) {
    throw new Error(
      `A shard requires PLAYWRIGHT_GROUP (${PLAYWRIGHT_GROUPS.join(", ")}): --shard splits by test count, which only splits duration inside one cost-homogeneous group`
    )
  }
  // Rejects an unknown group, with or without a shard.
  if (group) {
    groupProjectNames(group, process.env.VISUAL_BRANDS)
  }
}

function main() {
  assertGroupsCoverProjects(process.env.VISUAL_BRANDS)
  assertImageMatchesDockerfile()
  assertShardCompatible()
  assertChangedModeCompatible()
  if (printPlan) {
    console.log(
      JSON.stringify({
        image: imageName,
        platform,
        group: group ?? null,
        projects: selectedProjectNames(),
        shard: activeShard ?? null,
        release: process.env.VISUAL_RELEASE_READINESS === "1",
        changed: changedMode,
        ...(group === "desktop" || group === "mobile"
          ? { testArgs: [...shardArgs(), ...extraArgs] }
          : {}),
        ...(behaviorPlan
          ? {
              ...behaviorPlan,
            }
          : {}),
      })
    )
    return 0
  }
  if (dryRun) {
    // Dry runs never build Storybook or touch Docker.
    applyChangedMode()
    return 0
  }
  ensureStorybookBuild({
    uiRoot,
    repoRoot,
    storybookDir,
    externalBuild: storybookOverride !== undefined,
    rebuild: process.env.PLAYWRIGHT_STORYBOOK_REBUILD,
  })
  if (!applyChangedMode()) {
    return 0
  }
  if (process.env.VISUAL_RELEASE_READINESS === "1") {
    verifyReviewedBaselines()
  }
  // The allocator and the gate independently agree that this project owns no
  // files. Launching a container/server/browser cannot exercise a test here.
  // Still leave the normal report and immutable index: silence is not coverage.
  if (behaviorPlan?.emptyAllocation) {
    const report = {
      errors: [],
      suites: [],
      stats: { expected: 0, unexpected: 0, flaky: 0, skipped: 0, duration: 0 },
    }
    verifyCompletion([report])
    const directory = path.join(outputRoot, "test-results/visual-reports")
    fs.mkdirSync(directory, { recursive: true })
    fs.writeFileSync(path.join(directory, "all.json"), JSON.stringify(report))
    fs.copyFileSync(
      path.join(storybookDir, "index.json"),
      path.join(directory, "index.json")
    )
    console.log(`No ${group} files assigned; no browser started`)
    return 0
  }
  ensureDockerImage()
  startContainer()
  const { reportNames, status } = runPlaywrightProjects()
  copyResultsToHost()
  if (status !== 0) {
    printCanonicalPlatformHint(reportNames)
    return status
  }
  verifyCompletion(readReports(reportNames))
  return 0
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    cleanup()
    process.exit(1)
  })
}
try {
  process.exitCode = main()
} catch (error) {
  console.error("Error:", error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  cleanup()
}
