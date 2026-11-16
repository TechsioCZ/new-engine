import fs from "node:fs"
import path from "node:path"

const containerMarkers = ["docker", "containerd", "kubepods", "podman"]

const hasContainerMarkers = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, "utf8").toLowerCase()
    return containerMarkers.some((marker) => content.includes(marker))
  } catch {
    return false
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
  if (containerEnv && containerEnv !== "0" && containerEnv !== "false") {
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

const assertNativeSnapshotDir = (snapshotDir) => {
  if (snapshotDir && path.isAbsolute(snapshotDir)) {
    return
  }
  throw new Error(
    [
      "Native visual runs never touch the committed Linux baselines.",
      "Set VISUAL_SNAPSHOT_DIR to an absolute directory for the native snapshots.",
    ].join("\n")
  )
}

export default function dockerOnlyGlobalSetup() {
  if (process.env.VISUAL_NATIVE === "1") {
    assertNativeSnapshotDir(process.env.VISUAL_SNAPSHOT_DIR)
    return
  }
  const dockerRunnerFlag = process.env.PLAYWRIGHT_DOCKER === "1"
  if (!(dockerRunnerFlag && runningInContainer())) {
    throw new Error(
      [
        "Component visual tests must run inside Docker for reproducible snapshots.",
        "",
        "Use one of:",
        "- bunx nx run ui-kit:test:components",
        "- bunx nx run ui-kit:test:components:update",
        "- pnpm -C libs/ui test:components",
      ].join("\n")
    )
  }
}
