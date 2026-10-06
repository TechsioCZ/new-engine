import { spawnSync } from "node:child_process"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { createVisualMatrix } from "../test/visual-projects.mjs"

// Runs the Playwright visual tests inside Docker for reproducible snapshots.
const uiRoot = path.resolve(import.meta.dirname, "..")
const repoRoot = path.resolve(uiRoot, "../..")
const playwrightVersionPattern = /^ARG\s+PLAYWRIGHT_VERSION\s*=\s*([^\s]+)\s*$/m
const partialSelectionPattern =
  /^(?:--project|--grep|--grep-invert|--shard|--test-list|--test-list-invert|--last-failed|--only-changed)(?:=|$)|^-[gG]/
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
const extraArgs = process.argv.slice(2)
const updatesSnapshots = extraArgs.some((arg, index) => {
  const match = updateSnapshotsPattern.exec(arg)
  const mode = match?.[1] ?? (match && extraArgs[index + 1])
  return match && mode !== "none"
})
const containerName = `pw-visual-${crypto.randomUUID()}`
const reportRoot = "/app/test-results/visual-reports"

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

/** @param {{errors: unknown[], stats: {expected: number, unexpected: number, flaky: number, skipped: number}}[]} reports */
function verifyCompletion(reports) {
  const stories = Object.values(
    JSON.parse(fs.readFileSync(path.join(storybookDir, "index.json"), "utf8"))
      .entries
  ).filter((entry) => entry.type === "story")
  const requireComplete = !(
    selectedStories.length ||
    extraArgs.some((arg) => partialSelectionPattern.test(arg))
  )
  let expected = 0
  for (const { errors, stats } of reports) {
    if (
      errors.length ||
      stats.unexpected ||
      stats.flaky ||
      (requireComplete && stats.skipped)
    ) {
      throw new Error(
        `Visual test run was not clean: ${JSON.stringify({ errors, stats })}`
      )
    }
    expected += stats.expected
  }
  const required = stories.length * projects.length
  if (!expected || (requireComplete && expected !== required)) {
    throw new Error(
      `Visual test run covered ${expected} of ${required} story/project cases`
    )
  }
}

function main() {
  if (
    storybookOverride === undefined &&
    process.env.PLAYWRIGHT_STORYBOOK_REBUILD !== "0"
  ) {
    run("pnpm", ["-C", uiRoot, "build:storybook"])
  }
  if (!fs.existsSync(path.join(storybookDir, "iframe.html"))) {
    throw new Error(`Storybook build not found: ${storybookDir}`)
  }
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

  const reportNames = []
  let status = 0
  for (const project of sequentialProjects ? projects : [undefined]) {
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
        ...extraArgs,
      ],
      { stdio: "inherit" }
    )
    status = result.status ?? 1
    if (status !== 0) {
      break
    }
  }

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
  ]) {
    docker(["cp", `${containerName}:${source}`, path.join(uiRoot, destination)])
  }
  if (status !== 0) {
    return status
  }
  verifyCompletion(
    reportNames.map((name) =>
      JSON.parse(
        run("docker", ["exec", containerName, "cat", `${reportRoot}/${name}`], {
          stdio: "pipe",
        }).stdout.toString()
      )
    )
  )
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
