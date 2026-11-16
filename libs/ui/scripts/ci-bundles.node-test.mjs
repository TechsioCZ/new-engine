import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

const repo = path.resolve(import.meta.dirname, "../../..")

function runBundle(t, failGroup) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ci-bundle-"))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const bin = path.join(directory, "bin")
  fs.mkdirSync(bin)
  // Exercise the real shell entrypoint, replacing only the expensive external
  // browser process. The stub has the same exit-code and report-file contract.
  fs.writeFileSync(
    path.join(bin, "node"),
    `#!${process.execPath}
import fs from "node:fs";
import path from "node:path";
if (process.argv.includes("--print-plan")) {
  console.log(JSON.stringify({image:"test-image"}));
} else {
  const group = process.env.PLAYWRIGHT_GROUP;
  if (process.env.FAIL_GROUP === group) process.exit(7);
  await new Promise(resolve => setTimeout(resolve, group === "visual" ? 100 : 1));
  const out = path.join(process.env.PLAYWRIGHT_OUTPUT_DIR, "test-results/visual-reports");
  fs.mkdirSync(out, {recursive:true});
  fs.writeFileSync(path.join(out,"all.json"), JSON.stringify({group}));
}
`,
    { mode: 0o755 }
  )
  fs.writeFileSync(path.join(bin, "docker"), "#!/bin/sh\nexit 0\n", {
    mode: 0o755,
  })
  const result = spawnSync("bash", ["libs/ui/scripts/component-ci-bundle.sh"], {
    cwd: repo,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      RUNNER_TEMP: directory,
      SCOPE: "full",
      SHARD: "4/4",
      BUNDLE: "4",
      BUNDLES: "4",
      FAIL_GROUP: failGroup ?? "",
    },
  })
  return { directory, result }
}

test("concurrent component suites retain separate reports until all finish", (t) => {
  const { directory, result } = runBundle(t)
  assert.equal(result.status, 0, result.stderr)
  for (const group of ["visual", "desktop", "mobile"]) {
    const shard = group === "mobile" ? 1 : 4
    const file = path.join(
      directory, "component-reports", `ui-${group}-shard-${shard}`, "all.json"
    )
    assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), { group })
  }
})

test("a failed suite fails the bundle but still waits for the other report", (t) => {
  const { directory, result } = runBundle(t, "desktop")
  assert.equal(result.status, 1)
  assert.ok(fs.existsSync(path.join(
    directory, "component-reports/ui-visual-shard-4/all.json"
  )))
})
