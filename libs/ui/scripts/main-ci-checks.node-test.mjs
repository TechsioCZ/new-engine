import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

const script = path.join(import.meta.dirname, "main-ci-checks.sh")

function runChecks(t, overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "main-ci-checks-"))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  for (const name of ["bin", "node24", "node26", "node_modules/.bin", "libs/ui/storybook-static"]) {
    fs.mkdirSync(path.join(root, name), { recursive: true })
  }
  for (const runtime of ["node24", "node26"]) {
    fs.symlinkSync(process.execPath, path.join(root, runtime, "node"))
  }
  fs.writeFileSync(path.join(root, "libs/ui/storybook-static/index.json"), "{}")
  fs.writeFileSync(path.join(root, "node_modules/.bin/nubx"), "#!/bin/sh\nexit 0\n", { mode: 0o755 })
  fs.writeFileSync(path.join(root, "bin/timeout"), '#!/bin/sh\nshift\nexec "$@"\n', { mode: 0o755 })
  fs.writeFileSync(path.join(root, "bin/pnpm"), `#!/bin/sh
echo "$(basename "$(dirname "$(command -v node)")")|$*" >> "$RUNNER_TEMP/commands"
if [ "$*" = "lint:nx" ] && [ "$FAIL_CHECKS" = 1 ]; then exit 7; fi
if [ "$*" = "--dir libs/ui storybook:a11y" ]; then
  node -e 'setTimeout(()=>{},100)'
  echo "$A11Y_THEME@$A11Y_SHARD" >> "$RUNNER_TEMP/a11y-finished"
  if [ "$MUTATE_INDEX" = 1 ]; then echo '{"bad":true}' > libs/ui/storybook-static/index.json; fi
  if [ "$FAIL_A11Y" = 1 ]; then exit 9; fi
fi
exit 0
`, { mode: 0o755 })
  const result = spawnSync("bash", [script], {
    cwd: root, encoding: "utf8",
    env: {
      ...process.env, PATH: `${root}/bin:${process.env.PATH}`,
      NODE24_BIN: `${root}/node24`, NODE26_BIN: `${root}/node26`,
      UI_SCOPE: "full", RUNNER_TEMP: root, AFFECTED_PROJECTS: "ui-kit",
      FAIL_CHECKS: "0", FAIL_A11Y: "0", MUTATE_INDEX: "0", ...overrides,
    },
  })
  return { root, result }
}

test("the installed runner completes both workspace and accessibility checks", (t) => {
  const { root, result } = runChecks(t)
  assert.equal(result.status, 0, result.stderr)
  // bundle 2 scans n1-light 1/1 and akros-light 2/2 (ci-ui-plan.mjs).
  assert.deepEqual(fs.readFileSync(path.join(root, "a11y-finished"), "utf8").trim().split("\n"), ["business-light@1/1", "akros-light@1/2"])
  const commands = fs.readFileSync(path.join(root, "commands"), "utf8")
  for (const command of [
    "node24|lint:nx",
    "node26|--dir libs/ui typecheck", "node26|--dir libs/ui test",
    "node26|--dir libs/ui validate:tokens", "node26|--dir libs/ui check:package",
    "node24|--dir libs/ui test:visual-assets", "node26|--dir libs/ui storybook:a11y",
    "node24|--dir libs/ui check:consumer",
  ]) {
    assert.ok(commands.includes(command), command)
  }
  // One package build, on Node 26; Node 24 imports that packed build.
  const lines = commands.trim().split("\n")
  assert.deepEqual(lines.filter((line) => line.endsWith("check:package")), ["node26|--dir libs/ui check:package"])
  assert.ok(lines.indexOf("node26|--dir libs/ui check:package") < lines.indexOf("node24|--dir libs/ui check:consumer"))
})

test("an unaffected UI package skips the Node 24 consumer import", (t) => {
  const { root, result } = runChecks(t, { AFFECTED_PROJECTS: "analytics" })
  assert.equal(result.status, 0, result.stderr)
  assert.ok(!fs.readFileSync(path.join(root, "commands"), "utf8").includes("check:consumer"))
})

test("a failed workspace check cannot be hidden by successful accessibility", (t) => {
  const { root, result } = runChecks(t, { FAIL_CHECKS: "1" })
  assert.equal(result.status, 1)
  assert.ok(fs.existsSync(path.join(root, "a11y-finished")))
})

test("failed accessibility cannot be hidden by successful workspace checks", (t) => {
  assert.equal(runChecks(t, { FAIL_A11Y: "1" }).result.status, 1)
})

test("a scanner that corrupts the cached index fails validation", (t) => {
  const { result } = runChecks(t, { MUTATE_INDEX: "1" })
  assert.equal(result.status, 1)
  assert.match(result.stdout, /shared Storybook index was mutated/)
})
