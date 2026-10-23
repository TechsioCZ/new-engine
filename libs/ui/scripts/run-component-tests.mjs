import { spawnSync } from "node:child_process"
import crypto from "node:crypto"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import {
  assertPrimaryBaselines,
  assertReleaseSelection,
  assertVisualCompletion,
  parseReleaseShard,
  visualStories,
} from "../test/visual-completion.mjs"
import { createVisualMatrix } from "../test/visual-projects.mjs"

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
const imageName =
  process.env.PLAYWRIGHT_DOCKER_IMAGE ??
  `new-engine-ui-playwright:${playwrightVersion ? `${playwrightVersion}-` : ""}${dockerfileHash}`
const platform = "linux/amd64"
const projects = createVisualMatrix(process.env.VISUAL_BRANDS).map(
  (project) => project.name
)
const sequentialProjects =
  (process.env.PLAYWRIGHT_DOCKER_SEQUENTIAL ?? "0") !== "0"
const storybookOverride = process.env.VISUAL_STORYBOOK_STATIC_DIR
const storybookDir = storybookOverride ?? path.join(uiRoot, "storybook-static")
const harPath =
  process.env.VISUAL_ASSET_HAR_PATH ??
  path.join(uiRoot, "test/fixtures/visual-assets/assets.har")
const selectedStories = (process.env.TEST_STORIES ?? "")
  .split(",")
  .map((story) => story.trim())
  .filter(Boolean)
const extraArgs = process.argv.slice(2).filter((arg) => arg !== "--")
if (process.env.VISUAL_RELEASE_READINESS === "1") {
  assertReleaseSelection(extraArgs, process.env)
}
// CI splits the release run; scripts/verify-component-shards.mjs then asserts
// completeness over every shard report together.
const releaseShard = parseReleaseShard(process.env.PLAYWRIGHT_RELEASE_SHARD)
const updatesSnapshots = extraArgs.some((arg, index) => {
  const match = updateSnapshotsPattern.exec(arg)
  const mode = match?.[1] ?? (match && extraArgs[index + 1])
  return match && mode !== "none"
})
const containerName = `pw-visual-${crypto.randomUUID()}`
// Each `playwright test` run empties test-results, so reports live beside it.
const reportRoot = "/app/visual-reports"

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
  docker(["container", "rm", "--force", containerName])
}

/** @typedef {{status: string}} ReportTest */
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

/** @param {{errors: unknown[], stats: {unexpected: number, flaky: number}, suites: ReportSuite[]}[]} reports */
function verifyCompletion(reports) {
  const stories = visualStories(
    JSON.parse(fs.readFileSync(path.join(storybookDir, "index.json"), "utf8"))
      .entries
  )
  const requireComplete = selectedStories.length === 0 && extraArgs.length === 0
  if (requireComplete && !releaseShard) {
    assertVisualCompletion(reports, stories, projects)
    return
  }
  const ran = reports.flatMap((report) => reportTests(report.suites))
  if (
    !ran.length ||
    reports.some(
      ({ errors, stats }) => errors.length || stats.unexpected || stats.flaky
    )
  ) {
    throw new Error("Focused component run was empty or not clean")
  }
}

function verifyReviewedBaselines() {
  const entries = visualStories(
    JSON.parse(fs.readFileSync(path.join(storybookDir, "index.json"), "utf8"))
      .entries
  )
  const directory = path.join(uiRoot, "test/visual.spec.ts-snapshots")
  assertPrimaryBaselines(
    entries,
    createVisualMatrix(),
    new Set(fs.existsSync(directory) ? fs.readdirSync(directory) : [])
  )
}

function ensureStorybookBuild() {
  if (
    storybookOverride === undefined &&
    process.env.PLAYWRIGHT_STORYBOOK_REBUILD !== "0"
  ) {
    // Run the Storybook CLI with Node: Windows cannot spawn the pnpm.cmd shim.
    const storybookManifest = createRequire(
      path.join(uiRoot, "package.json")
    ).resolve("storybook/package.json")
    const storybookBin = JSON.parse(
      fs.readFileSync(storybookManifest, "utf8")
    ).bin
    run(
      process.execPath,
      [path.join(path.dirname(storybookManifest), storybookBin), "build"],
      { cwd: uiRoot }
    )
  }
  if (!fs.existsSync(path.join(storybookDir, "iframe.html"))) {
    throw new Error(`Storybook build not found: ${storybookDir}`)
  }
}

function ensureDockerImage() {
  if (docker(["image", "inspect", imageName]).status !== 0) {
    run("docker", [
      "build",
      `--platform=${platform}`,
      "-t",
      imageName,
      "-f",
      dockerfilePath,
      repoRoot,
    ])
  }
  console.log(`Using Docker image: ${imageName}`)
}

function startContainer() {
  const env = {
    CI: "true",
    PLAYWRIGHT_DOCKER: "1",
    PLAYWRIGHT_WORKERS: process.env.PLAYWRIGHT_WORKERS ?? "4",
    TEST_BASE_URL: process.env.TEST_BASE_URL,
    TEST_STORIES: process.env.TEST_STORIES,
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

/** @returns {{reportNames: string[], status: number}} */
function runPlaywrightProjects() {
  const reportNames = []
  let status = 0
  for (const project of sequentialProjects
    ? ["desktop", "mobile", ...projects]
    : [undefined]) {
    const reportName = `${project ?? "all"}.json`
    reportNames.push(reportName)
    const result = spawnSync(
      "docker",
      [
        "exec",
        "--tty",
        "--env",
        `PLAYWRIGHT_JSON_OUTPUT_FILE=${reportRoot}/${reportName}`,
        containerName,
        "npx",
        "playwright",
        "test",
        "-c",
        "playwright.config.mts",
        "--reporter=list,html,json",
        ...(project ? ["--project", project] : []),
        ...(releaseShard
          ? [`--shard=${releaseShard.index}/${releaseShard.total}`]
          : []),
        ...extraArgs,
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
    docker(["cp", `${containerName}:${source}`, path.join(uiRoot, destination)])
  }
  if (releaseShard) {
    // The shard verifier needs the exact story list this commit was built with.
    fs.copyFileSync(
      path.join(storybookDir, "index.json"),
      path.join(uiRoot, "test-results/visual-reports/index.json")
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

function main() {
  ensureStorybookBuild()
  if (process.env.VISUAL_RELEASE_READINESS === "1") {
    verifyReviewedBaselines()
  }
  ensureDockerImage()
  startContainer()
  const { reportNames, status } = runPlaywrightProjects()
  copyResultsToHost()
  if (status !== 0) {
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
