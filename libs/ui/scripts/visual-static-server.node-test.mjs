import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { once } from "node:events"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createInterface } from "node:readline"
import test from "node:test"

test("the accessibility server announces readiness only after owning its port", {
  timeout: 5000,
}, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "storybook-server-"))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.writeFileSync(path.join(root, "index.json"), '{"entries":{}}')
  const script = new URL("../test/visual-static-server.mjs", import.meta.url)
  function start(port) {
    const child = spawn(process.execPath, [script.pathname], {
      env: {
        ...process.env,
        VISUAL_STORYBOOK_STATIC_DIR: root,
        VISUAL_STORYBOOK_PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    })
    t.after(() => child.kill())
    return child
  }
  const owner = start(0)
  const lines = createInterface({ input: owner.stdout })
  t.after(() => lines.close())
  const [line] = await once(lines, "line")
  assert.match(line, /^Serving Storybook on http:\/\/127\.0\.0\.1:\d+$/)
  const url = new URL(line.replace("Serving Storybook on ", ""))
  const response = await fetch(new URL("index.json", url))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { entries: {} })

  // A successful curl to the existing owner must not prove the next process
  // started; the shell also requires this process's own readiness marker.
  const contender = start(url.port)
  let stdout = ""
  let stderr = ""
  contender.stdout.on("data", (chunk) => { stdout += chunk })
  contender.stderr.on("data", (chunk) => { stderr += chunk })
  const [code] = await once(contender, "exit")
  assert.notEqual(code, 0)
  assert.equal(stdout, "")
  assert.match(stderr, /EADDRINUSE/)
})
