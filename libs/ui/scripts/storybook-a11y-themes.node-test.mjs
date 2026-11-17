import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

function runThemes(t, failedTheme = "") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "a11y-themes-"))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.mkdirSync(path.join(root, "scripts"))
  fs.mkdirSync(path.join(root, "bin"))
  fs.copyFileSync(
    new URL("./storybook-a11y-themes.sh", import.meta.url),
    path.join(root, "scripts/storybook-a11y-themes.sh"),
  )
  fs.writeFileSync(
    path.join(root, "bin/node"),
    `#!${process.execPath}
import fs from "node:fs";
if (process.argv.includes("--ensure")) fs.appendFileSync(process.env.TRACE, "build\\n");
else console.log("business-light\\nakros-light\\nn1-light");
`,
    { mode: 0o755 },
  )
  fs.writeFileSync(
    path.join(root, "scripts/storybook-a11y.sh"),
    `#!/usr/bin/env bash
set -eu
printf 'start|%s|%s|%s|%s|%s\\n' "$A11Y_THEME" "$A11Y_TEST_WORKERS" "$A11Y_STORYBOOK_PORT" "$A11Y_STORYBOOK_REBUILD" "$A11Y_THEME_COUNT" >> "$TRACE"
"$REAL_NODE" -e 'setTimeout(()=>{},100)'
printf 'finish|%s\\n' "$A11Y_THEME" >> "$TRACE"
[ "$A11Y_THEME" != "$FAILED_THEME" ]
`,
  )
  const trace = path.join(root, "trace")
  const result = spawnSync(
    "bash",
    [path.join(root, "scripts/storybook-a11y-themes.sh")],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${root}/bin:${process.env.PATH}`,
        TRACE: trace,
        REAL_NODE: process.execPath,
        A11Y_TEST_WORKERS: "4",
        FAILED_THEME: failedTheme,
      },
    },
  )
  return { result, events: fs.readFileSync(trace, "utf8").trim().split("\n") }
}

test("all themes share one build and at most four workers, with independent servers", (t) => {
  const { result, events } = runThemes(t)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(events[0], "build")
  assert.equal(events.filter((event) => event === "build").length, 1)
  assert.deepEqual(events.slice(1, 3).sort(), [
    "start|akros-light|2|6007|0|3",
    "start|business-light|2|6006|0|3",
  ])
  assert.ok(
    events.indexOf("start|n1-light|2|6008|0|3") >
      events.indexOf("finish|business-light"),
  )
  assert.ok(
    events.indexOf("start|n1-light|2|6008|0|3") >
      events.indexOf("finish|akros-light"),
  )
  assert.equal(events.filter((event) => event.startsWith("finish|")).length, 3)
})

test("one failing theme fails the scan without hiding the other themes", (t) => {
  const { result, events } = runThemes(t, "akros-light")
  assert.equal(result.status, 1)
  assert.equal(events.filter((event) => event.startsWith("finish|")).length, 3)
})
