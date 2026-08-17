import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { assertNextBuildValues } from "./assert-next-build.mjs"

const REDIRECT_AND_ARTIFACT_ERRORS = /redirects.*standalone server/s

const validInput = () => ({
  artifacts: {
    buildId: true,
    standaloneServer: true,
  },
  requiredServerFiles: {
    config: {
      cacheComponents: false,
      output: "standalone",
      skipProxyUrlNormalize: true,
      skipTrailingSlashRedirect: true,
    },
  },
  routesManifest: { redirects: [] },
})

describe("assertNextBuildValues", () => {
  it("accepts the release artifact contract", () => {
    assert.doesNotThrow(() => assertNextBuildValues(validInput()))
  })

  it("rejects every required config drift", () => {
    for (const [name, value] of [
      ["cacheComponents", true],
      ["output", undefined],
      ["skipProxyUrlNormalize", false],
      ["skipTrailingSlashRedirect", false],
    ]) {
      const input = validInput()
      input.requiredServerFiles.config[name] = value
      assert.throws(() => assertNextBuildValues(input), new RegExp(name))
    }
  })

  it("rejects application redirects and missing standalone artifacts", () => {
    const input = validInput()
    input.routesManifest.redirects.push({ source: "/legacy" })
    input.artifacts.standaloneServer = false

    assert.throws(
      () => assertNextBuildValues(input),
      REDIRECT_AND_ARTIFACT_ERRORS
    )
  })
})
