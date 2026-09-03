import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { writePrivateJsonOutput } from "./private-json-output.mjs"

test("live report output is private and never overwrites an existing reservation", async () => {
  const directory = await mkdtemp(join(tmpdir(), "herbatika-live-report-"))
  const outputPath = join(directory, "live-report.json")
  const original = { evidenceHash: "original" }

  try {
    await writePrivateJsonOutput(outputPath, original)

    assert.equal((await stat(outputPath)).mode.toString(8).slice(-3), "600")
    await assert.rejects(
      writePrivateJsonOutput(outputPath, { evidenceHash: "replacement" }),
      { code: "EEXIST" }
    )
    assert.equal(
      await readFile(outputPath, "utf8"),
      `${JSON.stringify(original, null, 2)}\n`
    )
  } finally {
    await rm(directory, { force: true, recursive: true })
  }
})
