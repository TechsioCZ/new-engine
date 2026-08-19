import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  assertNextBuildValues,
  assertNoPrivateClientMarkers,
} from "./assert-next-build.mjs"

const PRIVATE_CLIENT_LEAK_ERROR = /URL_REGISTRY_DATABASE_URL.*product\.js/
const SERVER_SYMBOL_LEAK_ERROR = /getUrlRegistryRuntime.*catalog\.js/
const REDIRECT_AND_CUTOVER_ARTIFACT_ERRORS =
  /redirects.*standalone server.*population CLI/s
const GATE_OFF_STOREFRONT_ERROR =
  /gate-off compatibility route \/p\/\[handle\]\/page is missing/

const validInput = () => ({
  appPathsManifest: Object.fromEntries(
    [
      "/page",
      "/[slug]/page",
      "/account/page",
      "/account/lists/page",
      "/account/orders/page",
      "/account/orders/[id]/page",
      "/account/settings/page",
      "/auth/forgot-password/page",
      "/auth/login/page",
      "/auth/register/page",
      "/auth/reset-password/page",
      "/blog/page",
      "/blog/[slug]/page",
      "/c/[slug]/page",
      "/checkout/page",
      "/checkout/[step]/page",
      "/checkout/platba-navrat/page",
      "/faq/page",
      "/p/[handle]/page",
      "/reklamacie-a-vratenie/page",
      "/reviews/product/[token]/page",
      "/search/page",
      "/znacka/page",
      "/znacka/[slug]/page",
    ].map((route) => [route, `app${route}.js`])
  ),
  artifacts: {
    buildId: true,
    standaloneServer: true,
    urlRegistryMigrationCli: true,
    urlRegistryMigrations: true,
    urlRegistryPopulationCli: true,
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
    input.artifacts.urlRegistryPopulationCli = false

    assert.throws(
      () => assertNextBuildValues(input),
      REDIRECT_AND_CUTOVER_ARTIFACT_ERRORS
    )
  })

  it("rejects a build that drops the gate-off storefront", () => {
    const input = validInput()
    input.appPathsManifest["/p/[handle]/page"] = undefined

    assert.throws(() => assertNextBuildValues(input), GATE_OFF_STOREFRONT_ERROR)
  })

  it("rejects private server configuration markers in client artifacts", () => {
    assert.doesNotThrow(() =>
      assertNoPrivateClientMarkers([
        { content: "console.log('public')", name: "app.js" },
      ])
    )
    assert.throws(
      () =>
        assertNoPrivateClientMarkers([
          {
            content: "process.env.URL_REGISTRY_DATABASE_URL",
            name: "product.js",
          },
        ]),
      PRIVATE_CLIENT_LEAK_ERROR
    )
    assert.throws(
      () =>
        assertNoPrivateClientMarkers([
          {
            content: "getUrlRegistryRuntime()",
            name: "catalog.js",
          },
        ]),
      SERVER_SYMBOL_LEAK_ERROR
    )
  })
})
