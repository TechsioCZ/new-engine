import fs from "node:fs"

const MAX_CONTAINER_MARKER_BYTES = 64 * 1024
const containerMarkers = ["docker", "containerd", "kubepods", "podman"]

/** @param {string} filePath - Procfs file to inspect. */
const hasContainerMarkers = (filePath) => {
  let descriptor
  try {
    descriptor = fs.openSync(filePath, "r")
    const buffer = Buffer.alloc(MAX_CONTAINER_MARKER_BYTES)
    const bytesRead = fs.readSync(
      descriptor,
      buffer,
      0,
      MAX_CONTAINER_MARKER_BYTES,
      0,
    )
    const content = buffer
      .subarray(0, bytesRead)
      .toString("utf-8")
      .toLowerCase()
    return containerMarkers.some((marker) => content.includes(marker))
  } catch {
    return false
  } finally {
    if (descriptor !== undefined) {
      fs.closeSync(descriptor)
    }
  }
}

const runningInContainer = () => {
  if (process.platform !== "linux") {
    return false
  }

  const containerEnv = (
    process.env.CONTAINER ??
    process.env.container ??
    ""
  ).toLowerCase()
  if (containerEnv !== "" && containerEnv !== "0" && containerEnv !== "false") {
    return true
  }

  if (fs.existsSync("/.dockerenv")) {
    return true
  }

  return (
    hasContainerMarkers("/proc/1/cgroup") ||
    hasContainerMarkers("/proc/self/mountinfo")
  )
}

export default function dockerOnlyGlobalSetup() {
  const dockerRunnerFlag = process.env.PLAYWRIGHT_DOCKER === "1"
  if (!dockerRunnerFlag || !runningInContainer()) {
    throw new Error(
      [
        "Component visual tests must run inside Docker for reproducible snapshots.",
        "",
        "Use one of:",
        "- bunx nx run ui-kit:test:components",
        "- bunx nx run ui-kit:test:components:update",
        "- pnpm -C libs/ui test:components",
      ].join("\n"),
    )
  }
}
