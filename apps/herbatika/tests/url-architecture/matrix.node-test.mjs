import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { REQUIRED_ROWS, ROW_ASSERTIONS } from "./contract-matrix.mjs"
import { SOURCE_ASSERTIONS, WIRE_ASSERTIONS } from "./evidence-catalog.mjs"

const appRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)))
const knownAssertions = new Set([
  ...Object.keys(SOURCE_ASSERTIONS),
  ...WIRE_ASSERTIONS,
])
const EXECUTABLE_TEST =
  /\b(?:(?:it|test)(?:\.each)?|run[A-Za-z]+(?:Suite|Contract))\s*\(/
const SHARED_SUITE = /run[A-Za-z]+(?:Suite|Contract)\s*\(/
const ASSERTION = /\b(?:expect|assert)\s*[.(]/

test("issue #545 U/I/E matrix is exhaustive and has executable evidence", () => {
  assert.deepEqual(
    Object.keys(ROW_ASSERTIONS).sort(),
    [...REQUIRED_ROWS].sort()
  )

  for (const row of REQUIRED_ROWS) {
    const assertions = ROW_ASSERTIONS[row]
    assert.ok(assertions.length > 0, `${row} has no acceptance assertion`)
    for (const assertion of assertions) {
      assert.ok(
        knownAssertions.has(assertion),
        `${row} references unknown assertion ${assertion}`
      )
    }
  }
})

test("source evidence points at real assertion-bearing test files", async () => {
  for (const [assertion, relativeFiles] of Object.entries(SOURCE_ASSERTIONS)) {
    assert.ok(relativeFiles.length > 0, `${assertion} has no source tests`)
    for (const relativeFile of relativeFiles) {
      const source = await readFile(resolve(appRoot, relativeFile), "utf8")
      assert.match(
        source,
        EXECUTABLE_TEST,
        `${assertion}: ${relativeFile} has no executable test`
      )
      if (!SHARED_SUITE.test(source)) {
        assert.match(
          source,
          ASSERTION,
          `${assertion}: ${relativeFile} has no assertion`
        )
      }
    }
  }
})

test("the live runner implements every declared wire assertion", async () => {
  const sources = await Promise.all(
    ["release-wire.node-test.mjs", "release-browser.node-test.mjs"].map(
      (filename) =>
        readFile(resolve(appRoot, "tests/url-architecture", filename), "utf8")
    )
  )
  const source = sources.join("\n")
  for (const assertion of WIRE_ASSERTIONS) {
    assert.ok(
      source.includes(`test("${assertion}"`),
      `live runner is missing ${assertion}`
    )
  }
})
