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
  fs.writeFileSync(path.join(out,"all.json"), JSON.stringify({group, shard:process.env.PLAYWRIGHT_RELEASE_SHARD}));
}
`,
    { mode: 0o755 }
  )
  fs.writeFileSync(path.join(bin, "docker"), "#!/bin/sh\nexit 0\n", {
    mode: 0o755,
  })
  // This fixture exercises orchestration, not jq. All external tools in that
  // contract are owned by the fixture; test:node needs no system jq install.
  fs.writeFileSync(
    path.join(bin, "jq"),
    "#!/bin/sh\ncat >/dev/null\nprintf 'test-image\\n'\n",
    {
      mode: 0o755,
    }
  )
  const result = spawnSync("bash", ["libs/ui/scripts/component-ci-bundle.sh"], {
    cwd: repo,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      RUNNER_TEMP: directory,
      SCOPE: "full",
      SHARD: "4/6",
      BUNDLE_GROUP: "visual",
      FAIL_GROUP: failGroup ?? "",
    },
  })
  return { directory, result }
}

test("every visual runner also executes its desktop and mobile shards", (t) => {
  const { directory, result } = runBundle(t)
  assert.equal(result.status, 0, result.stderr)
  const reports = fs.readdirSync(path.join(directory, "component-reports"))
  assert.deepEqual(reports.sort(), [
    "ui-desktop-shard-4",
    "ui-mobile-shard-4",
    "ui-visual-shard-4",
  ])
  for (const group of ["visual", "desktop", "mobile"]) {
    const file = path.join(
      directory,
      "component-reports",
      `ui-${group}-shard-4`,
      "all.json"
    )
    assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), {
      group,
      shard: "4/6",
    })
  }
})

test("a failed desktop suite fails before launching mobile browser work", (t) => {
  const { directory, result } = runBundle(t, "desktop")
  assert.equal(result.status, 7)
  assert.ok(
    !fs.existsSync(
      path.join(directory, "component-reports/ui-mobile-shard-4/all.json")
    )
  )
})
