import { spawnSync } from "node:child_process"
import process from "node:process"
import { fileURLToPath } from "node:url"

const targets = process.argv.slice(2)
const args = [
  ...(targets.length > 0 ? targets : ["."]),
  "--type-aware",
  "--react-plugin",
  "--allow=all",
  "--deny=react/rules-of-hooks",
  "--warn=react/exhaustive-deps",
]
const oxlintCli = fileURLToPath(
  new URL("../../node_modules/oxlint/bin/oxlint", import.meta.url),
)
const result = spawnSync(process.execPath, [oxlintCli, ...args], {
  stdio: "inherit",
})

if (result.error) {
  throw result.error
}
process.exitCode = result.status ?? 1
