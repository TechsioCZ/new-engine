import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import test from "node:test"
import { fileURLToPath } from "node:url"

const uiRoot = fileURLToPath(new URL("../", import.meta.url))
const loadRunner = `
const { getTestRunnerConfig } = await import("@storybook/test-runner")
const config = await getTestRunnerConfig()
process.stdout.write(JSON.stringify({
  loaded: typeof config?.postVisit === "function",
  enforcement: process.env.A11Y_REPORT_FAIL_ON_VIOLATIONS ?? null,
}))
`

for (const setting of ["true", "false", undefined]) {
  test(`loading the a11y runner preserves enforcement=${setting ?? "unset"} for child workers`, () => {
    const env = { ...process.env }
    if (setting === undefined) {
      Reflect.deleteProperty(env, "A11Y_REPORT_FAIL_ON_VIOLATIONS")
    } else {
      env.A11Y_REPORT_FAIL_ON_VIOLATIONS = setting
    }
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", loadRunner],
      {
        cwd: uiRoot,
        env,
        encoding: "utf8",
        timeout: 15_000,
      }
    )
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(JSON.parse(result.stdout), {
      loaded: true,
      enforcement: setting ?? null,
    })
  })
}
