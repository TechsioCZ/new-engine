import { spawn } from "node:child_process"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const composeFile = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "compose.yaml"
)
const projectName = `herbatika-m00-${process.pid}`
const dockerCommand = process.env.M00_DOCKER_COMMAND ?? "docker"
let activeChild

const runDocker = (args) =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn(dockerCommand, args, {
      shell: false,
      stdio: "inherit",
      windowsHide: true,
    })
    activeChild = child
    child.once("error", rejectRun)
    child.once("exit", (code, signal) => {
      activeChild = undefined
      resolveRun({ code, signal })
    })
  })

const forwardSignal = (signal) => {
  activeChild?.kill(signal)
}

process.once("SIGINT", () => forwardSignal("SIGINT"))
process.once("SIGTERM", () => forwardSignal("SIGTERM"))

let primaryError
let upResult

try {
  upResult = await runDocker([
    "compose",
    "--project-name",
    projectName,
    "--file",
    composeFile,
    "up",
    "--build",
    "--abort-on-container-exit",
    "--exit-code-from",
    "wire",
  ])
} catch (error) {
  primaryError = error
} finally {
  try {
    const downResult = await runDocker([
      "compose",
      "--project-name",
      projectName,
      "--file",
      composeFile,
      "down",
      "--volumes",
      "--remove-orphans",
      "--timeout",
      "10",
    ])
    if (downResult.code !== 0 && !primaryError) {
      primaryError = new Error(
        `Docker Compose cleanup failed with ${downResult.code ?? downResult.signal}`
      )
    }
  } catch (error) {
    primaryError ??= error
  }
}

if (primaryError) {
  throw primaryError
}

if (upResult?.code !== 0) {
  throw new Error(
    `M00 Docker wire gate failed with ${upResult?.code ?? upResult?.signal}`
  )
}
