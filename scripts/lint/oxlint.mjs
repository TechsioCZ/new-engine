import { spawnSync } from "node:child_process"
import process from "node:process"

const targets = process.argv.slice(2)
const args = [
  ...(targets.length > 0 ? targets : ["."]),
  "--type-aware",
  "--react-plugin",
  "--allow=all",
  "--deny=react/rules-of-hooks",
  "--warn=react/exhaustive-deps",
]
const result = spawnSync("pnpm", ["exec", "oxlint", ...args], {
  stdio: "inherit",
})

if (result.error) throw result.error
process.exitCode = result.status ?? 1
