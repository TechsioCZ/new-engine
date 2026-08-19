import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"
import { loadReleaseFixture } from "./config.mjs"

if (Number(process.versions.node.split(".")[0]) !== 24) {
  throw new Error(
    `URL architecture release gate requires Node 24, got ${process.version}`
  )
}

const appRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)))
const fixture = await loadReleaseFixture()
const lifecycleToken = fixture.lifecycle.tokenEnvironmentVariable
if (!process.env[lifecycleToken]) {
  throw new Error(`${lifecycleToken} is required for the release gate`)
}
if (!existsSync(chromium.executablePath())) {
  throw new Error(
    "Pinned Playwright Chromium is required; run `pnpm --filter=herbatika exec playwright install chromium`"
  )
}

const run = (command, args) =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: appRoot,
      env: process.env,
      shell: false,
      stdio: "inherit",
    })
    child.once("error", rejectRun)
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolveRun()
        return
      }
      rejectRun(
        new Error(
          `${command} ${args.join(" ")} failed with ${code ?? signal ?? "unknown"}`
        )
      )
    })
  })

const gates = [
  [
    process.execPath,
    [
      "--test",
      "tests/url-architecture/matrix.node-test.mjs",
      "tests/url-architecture/helpers.node-test.mjs",
    ],
  ],
  ["pnpm", ["exec", "tsc", "--noEmit", "-p", "tsconfig.json"]],
  ["pnpm", ["test"]],
  ["pnpm", ["test:url-registry:pg18"]],
  ["pnpm", ["test:m00:wire"]],
  ["pnpm", ["test:url-architecture:wire"]],
]

for (const [command, args] of gates) {
  await run(command, args)
}
