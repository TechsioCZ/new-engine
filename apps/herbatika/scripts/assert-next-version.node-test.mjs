import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  assertNextVersionValues,
  EXPECTED_NEXT_VERSION,
} from "./assert-next-version.mjs"

const MANIFEST_DRIFT = /manifest requires 16\.3\.0/
const INSTALLED_DRIFT = /installed package is 16\.3\.0/

describe("assertNextVersionValues", () => {
  it("accepts only the required manifest and installed versions", () => {
    assert.doesNotThrow(() =>
      assertNextVersionValues({
        installedVersion: EXPECTED_NEXT_VERSION,
        manifestVersion: EXPECTED_NEXT_VERSION,
      })
    )
  })

  it("rejects a manifest drift", () => {
    assert.throws(
      () =>
        assertNextVersionValues({
          installedVersion: EXPECTED_NEXT_VERSION,
          manifestVersion: "16.3.0",
        }),
      MANIFEST_DRIFT
    )
  })

  it("rejects a resolved package drift", () => {
    assert.throws(
      () =>
        assertNextVersionValues({
          installedVersion: "16.3.0",
          manifestVersion: EXPECTED_NEXT_VERSION,
        }),
      INSTALLED_DRIFT
    )
  })
})
