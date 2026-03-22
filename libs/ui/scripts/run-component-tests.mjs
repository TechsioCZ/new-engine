import { spawnSync } from "node:child_process"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

// Runs Playwright component visual tests inside Docker for reproducible snapshots.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uiRoot = path.resolve(__dirname, "..")
const repoRoot = path.resolve(uiRoot, "../..")

const dockerfilePath = path.resolve(
  repoRoot,
  "docker/development/playwright/Dockerfile"
)
const dockerfileContents = fs.readFileSync(dockerfilePath, "utf8")
const playwrightVersion = dockerfileContents.match(
  /^ARG\s+PLAYWRIGHT_VERSION\s*=\s*([^\s]+)\s*$/m
)?.[1]
const dockerfileHash = crypto
  .createHash("sha256")
  .update(dockerfileContents)
  .digest("hex")
  .slice(0, 12)
const defaultImageName = playwrightVersion
  ? `new-engine-ui-playwright:${playwrightVersion}-${dockerfileHash}`
  : `new-engine-ui-playwright:${dockerfileHash}`
const imageName = process.env.PLAYWRIGHT_DOCKER_IMAGE ?? defaultImageName
const platform = process.env.DOCKER_PLATFORM ?? "linux/amd64"
const testBaseUrl = process.env.TEST_BASE_URL
const shmSize = process.env.PLAYWRIGHT_DOCKER_SHM_SIZE ?? "2g"
const ipcMode = process.env.PLAYWRIGHT_DOCKER_IPC ?? "host"
const sequentialProjects =
  (process.env.PLAYWRIGHT_DOCKER_SEQUENTIAL ?? "0") !== "0"
const dockerProjectsEnv = process.env.PLAYWRIGHT_DOCKER_PROJECTS ?? ""
const dockerProjects = dockerProjectsEnv
  .split(",")
  .map((project) => project.trim())
  .filter(Boolean)
const storybookDir = path.resolve(uiRoot, "storybook-static")
const storybookIframe = path.resolve(storybookDir, "iframe.html")
const snapshotsDir = path.resolve(uiRoot, "test/visual.spec.ts-snapshots")
const containerName = `pw-visual-${Date.now()}`
const rebuildStorybook =
  (process.env.PLAYWRIGHT_STORYBOOK_REBUILD ?? "1") !== "0"
const optionalContainerEnv = [
  ["TEST_BASE_URL", testBaseUrl],
  ["PLAYWRIGHT_WORKERS", process.env.PLAYWRIGHT_WORKERS],
  ["PLAYWRIGHT_PAGE_RESET", process.env.PLAYWRIGHT_PAGE_RESET],
  ["TEST_STORIES", process.env.TEST_STORIES],
]

console.log(`Using Docker image: ${imageName}`)

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  })
  if (result.error) {
    throw new Error(
      `Failed to spawn command: ${command} ${args.join(" ")} (${result.error.message})`
    )
  }
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`)
  }
  return result
}

const runSilent = (command, args) =>
  spawnSync(command, args, {
    stdio: "pipe",
    shell: process.platform === "win32",
  })

const cleanup = () => {
  runSilent("docker", ["rm", "-f", containerName])
}

const handleExit = (signal) => {
  console.warn(`Received ${signal}, cleaning up container...`)
  cleanup()
  process.exit(1)
}

process.on("SIGINT", () => handleExit("SIGINT"))
process.on("SIGTERM", () => handleExit("SIGTERM"))
process.on("exit", cleanup)

const getProcessOutcome = (result, contextLabel) => {
  if (result.error) {
    console.error(`${contextLabel} failed to spawn:`, result.error.message)
  }
  return {
    status: result.status ?? (result.signal || result.error ? 1 : 0),
    signal: result.signal,
  }
}

const copyArtifact = (label, sourcePath, destinationPath) => {
  console.log(`Copying ${label} back to host...`)
  const copyResult = runSilent("docker", [
    "cp",
    `${containerName}:${sourcePath}`,
    destinationPath,
  ])
  if (copyResult.status !== 0) {
    console.warn(`Warning: Could not copy ${label} (may not exist yet)`)
  }
}

// Build storybook (default) or when missing
if (rebuildStorybook) {
  console.log("Building Storybook...")
  run("pnpm", ["-C", uiRoot, "build:storybook"])
} else if (!fs.existsSync(storybookIframe)) {
  console.log("storybook-static not found, building Storybook...")
  run("pnpm", ["-C", uiRoot, "build:storybook"])
}

// Build docker image if needed
const imageInspect = runSilent("docker", ["image", "inspect", imageName])
if (imageInspect.status !== 0) {
  console.log("Building Docker image...")
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

const extraArgs = process.argv.slice(2)

console.log("Starting container...")

// Start container in background (keeps running)
const containerEnvArgs = optionalContainerEnv.flatMap(([key, value]) =>
  value ? ["-e", `${key}=${value}`] : []
)
const dockerRunArgs = [
  "run",
  "-d",
  "--name",
  containerName,
  `--platform=${platform}`,
  // With --ipc=host this is a no-op, but it still applies for non-host IPC modes.
  `--shm-size=${shmSize}`,
  `--ipc=${ipcMode}`,
  "--add-host=host.docker.internal:host-gateway",
  "-e",
  "CI=true",
  "-e",
  "PLAYWRIGHT_DOCKER=1",
  ...containerEnvArgs,
  "--entrypoint",
  "sleep",
  // Mount sources as read-only
  "-v",
  `${storybookDir}:/app/storybook-static:ro`,
  "-v",
  `${path.resolve(uiRoot, "test")}:/app/test-src:ro`,
  "-v",
  `${path.resolve(uiRoot, "playwright.config.cts")}:/app/playwright.config.cts:ro`,
  "-v",
  `${path.resolve(uiRoot, "package.json")}:/app/package.json:ro`,
  imageName,
  "infinity",
]

const startResult = runSilent("docker", dockerRunArgs)

if (startResult.status !== 0) {
  console.error("Failed to start container")
  console.error(startResult.stderr?.toString())
  process.exit(1)
}

const runningCheck = runSilent("docker", [
  "inspect",
  containerName,
  "--format",
  "{{.State.Running}}",
])
if (runningCheck.status !== 0 || runningCheck.stdout?.toString().trim() !== "true") {
  console.error("Container is not running after start.")
  const logsResult = runSilent("docker", ["logs", containerName])
  if (logsResult.status === 0) {
    console.error(logsResult.stdout?.toString())
  }
  cleanup()
  process.exit(1)
}

try {
  // Copy test files into container (internal I/O is faster)
  console.log("Copying test files into container...")
  run("docker", [
    "exec",
    containerName,
    "cp",
    "-r",
    "/app/test-src",
    "/app/test",
  ])

  // Run playwright tests (all I/O happens inside container)
  console.log("Running Playwright tests...")
  const runPlaywright = (project) =>
    spawnSync(
      "docker",
      [
        "exec",
        "-t",
        containerName,
        "npx",
        "playwright",
        "test",
        "-c",
        "playwright.config.cts",
        "--reporter=list,html",
        ...(project ? ["--project", project] : []),
        ...extraArgs,
      ],
      { stdio: "inherit" }
    )

  let testStatus = 0
  let testSignal = null
  if (sequentialProjects) {
    const projectsToRun =
      dockerProjects.length > 0 ? dockerProjects : ["desktop", "mobile"]
    for (const project of projectsToRun) {
      const result = runPlaywright(project)
      const outcome = getProcessOutcome(result, `Playwright project "${project}"`)
      if (outcome.status !== 0 || outcome.signal) {
        testStatus = outcome.status
        testSignal = outcome.signal
        break
      }
    }
  } else {
    const outcome = getProcessOutcome(runPlaywright(), "Playwright")
    testStatus = outcome.status
    testSignal = outcome.signal
  }

  if (testStatus !== 0 || testSignal) {
    console.warn("Playwright exited with a non-zero status.")
    const inspectResult = runSilent("docker", [
      "inspect",
      containerName,
      "--format",
      "{{json .State}}",
    ])
    if (inspectResult.status === 0) {
      console.warn("Container state:", inspectResult.stdout?.toString().trim())
    }
  }

  const reportDir = path.resolve(uiRoot, "playwright-report")
  const resultsDir = path.resolve(uiRoot, "test-results")
  copyArtifact("snapshots", "/app/test/visual.spec.ts-snapshots/.", snapshotsDir)
  copyArtifact("HTML report", "/app/playwright-report/.", reportDir)
  copyArtifact("test results", "/app/test-results/.", resultsDir)

  cleanup()
  process.exit(testStatus ?? 0)
} catch (error) {
  console.error("Error:", error.message)
  cleanup()
  process.exit(1)
}
