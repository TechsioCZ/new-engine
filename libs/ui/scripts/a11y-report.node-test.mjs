import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import { once } from "node:events"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { recordA11yResult } from "../.storybook/a11y-report.mjs"

test("loading the runner does not disable enforcement in child workers", () => {
  const runner = new URL("../.storybook/test-runner.mjs", import.meta.url).href
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import assert from "node:assert/strict"
    await import(${JSON.stringify(runner)})
    assert.equal(process.env.A11Y_REPORT_FAIL_ON_VIOLATIONS, "true")
  `], {
    env: { ...process.env, A11Y_REPORT_FAIL_ON_VIOLATIONS: "true" },
    encoding: "utf8",
  })
  assert.equal(result.status, 0, result.stderr)
})

test("parallel scan workers retain each result and summarize only after completion", async (t) => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "a11y-append-"))
  t.after(() => fs.rmSync(output, { recursive: true, force: true }))
  const module = new URL("../.storybook/a11y-report.mjs", import.meta.url).href
  const workers = Array.from({ length: 4 }, (_, worker) =>
    spawn(process.execPath, ["--input-type=module", "-e", `
      import { recordA11yResult } from ${JSON.stringify(module)}
      for (let story = 0; story < 20; story++) {
        recordA11yResult(${JSON.stringify(output)}, {
          storyId: ${worker} + "-" + story,
          title: "Product", name: "Story", url: "http://localhost",
          parameters: null,
          results: { violations: [{ id: "image-alt", nodes: [{ html: "x".repeat(8000) }] }] }
        })
      }
    `], { stdio: ["ignore", "ignore", "pipe"] })
  )
  await Promise.all(workers.map(async (worker) => {
    let stderr = ""
    worker.stderr.on("data", (chunk) => { stderr += chunk })
    const [code] = await once(worker, "exit")
    assert.equal(code, 0, stderr)
  }))
  const report = path.join(output, "report.ndjson")
  const entries = fs.readFileSync(report, "utf8").trim().split("\n").map(JSON.parse)
  assert.equal(entries.length, 80)
  assert.equal(new Set(entries.map(({ storyId }) => storyId)).size, 80)
  assert.deepEqual(fs.readdirSync(output), ["report.ndjson"])
  const summary = path.join(output, "summary.md")
  const result = spawnSync(process.execPath, [
    new URL("./storybook-a11y-summary.mjs", import.meta.url).pathname,
    "--input", report, "--output", summary,
  ], { encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr)
  assert.match(fs.readFileSync(summary, "utf8"), /Total stories: 80/)
  assert.match(fs.readFileSync(summary, "utf8"), /Total violations: 80/)
})

test("a result append never truncates an earlier scan or hides its violations", (t) => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "a11y-existing-"))
  t.after(() => fs.rmSync(output, { recursive: true, force: true }))
  const file = path.join(output, "report.ndjson")
  const previous = '{"storyId":"previous","results":{"violations":[{"id":"button-name"}]}}\n'
  fs.writeFileSync(file, previous)
  recordA11yResult(output, {
    storyId: "next", title: "Product", name: "Next",
    url: "http://localhost", parameters: null, results: { violations: [] },
  })
  assert.ok(fs.readFileSync(file, "utf8").startsWith(previous))
  assert.equal(fs.readFileSync(file, "utf8").trim().split("\n").length, 2)
})
