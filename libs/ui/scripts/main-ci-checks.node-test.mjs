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
  for (const name of ["bin", "node24", "node26", "node_modules/.bin", "libs/ui/storybook-static", "libs/ui/scripts"]) {
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
exit 0
`, { mode: 0o755 })
  fs.writeFileSync(path.join(root, "libs/ui/scripts/component-ci-bundle.sh"), `#!/bin/sh
echo "$(basename "$(dirname "$(command -v node)")")|behavior:$BUNDLE_GROUP:$SHARD" >> "$RUNNER_TEMP/commands"
node -e 'setTimeout(()=>{},100)'
touch "$RUNNER_TEMP/behavior-finished"
if [ "$MUTATE_INDEX" = 1 ]; then echo '{"bad":true}' > libs/ui/storybook-static/index.json; fi
if [ "$FAIL_BROWSER" = 1 ]; then exit 9; fi
`)
  const result = spawnSync("bash", [script], {
    cwd: root, encoding: "utf8",
    env: {
      ...process.env, PATH: `${root}/bin:${process.env.PATH}`,
      NODE24_BIN: `${root}/node24`, NODE26_BIN: `${root}/node26`,
      UI_SCOPE: "full", RUNNER_TEMP: root, AFFECTED_PROJECTS: "ui-kit",
      FAIL_CHECKS: "0", FAIL_BROWSER: "0", MUTATE_INDEX: "0", ...overrides,
    },
  })
  return { root, result }
}

test("the installed runner completes both workspace and behavior checks", (t) => {
  const { root, result } = runChecks(t)
  assert.equal(result.status, 0, result.stderr)
  assert.ok(fs.existsSync(path.join(root, "behavior-finished")))
  const commands = fs.readFileSync(path.join(root, "commands"), "utf8")
  for (const command of [
    "node24|lint:nx", "node24|--dir libs/ui check:package",
    "node26|--dir libs/ui typecheck", "node26|--dir libs/ui test",
    "node26|--dir libs/ui validate:tokens", "node26|--dir libs/ui check:package",
    "node24|--dir libs/ui test:visual-assets", "node26|behavior:behavior:1/1",
  ]) {
    assert.ok(commands.includes(command), command)
  }
})

test("a failed workspace check cannot be hidden by successful behavior", (t) => {
  const { root, result } = runChecks(t, { FAIL_CHECKS: "1" })
  assert.equal(result.status, 1)
  assert.ok(fs.existsSync(path.join(root, "behavior-finished")))
})

test("failed behavior cannot be hidden by successful workspace checks", (t) => {
  assert.equal(runChecks(t, { FAIL_BROWSER: "1" }).result.status, 1)
})

test("a browser suite that corrupts the cached index fails validation", (t) => {
  const { result } = runChecks(t, { MUTATE_INDEX: "1" })
  assert.equal(result.status, 1)
  assert.match(result.stdout, /shared Storybook index was mutated/)
})
