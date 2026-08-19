import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const PRIVATE_CLIENT_MARKERS = Object.freeze([
  "HERBATIKA_CMS_STATIC_PAGE_IDS",
  "MARKET_PUBLISHABLE_KEY_",
  "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY",
  "URL_REGISTRY_CONTENT_PROJECTION_TOKEN",
  "URL_REGISTRY_DATABASE_URL",
  "URL_REGISTRY_INVALIDATION_TOKEN",
  "createMedusaStorefrontServerReadPreset",
  "getUrlRegistryRuntime",
  "readRequiredPublicEntitySlugs",
  "requireConfiguredMarketRuntimeBinding",
])
const TEXT_CLIENT_ARTIFACT = /\.(?:css|js|json|map)$/
const LEGACY_PUBLIC_APP_ROUTES = Object.freeze([
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
])

const missingLegacyPublicAppRoutes = (appPathsManifest) =>
  LEGACY_PUBLIC_APP_ROUTES.filter((route) => !appPathsManifest?.[route])

export const assertNoPrivateClientMarkers = (artifacts) => {
  for (const artifact of artifacts) {
    const marker = PRIVATE_CLIENT_MARKERS.find((candidate) =>
      artifact.content.includes(candidate)
    )
    if (marker) {
      throw new Error(
        `Private server configuration marker ${marker} leaked into ${artifact.name}`
      )
    }
  }
}

const readClientArtifacts = (directory) =>
  readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && TEXT_CLIENT_ARTIFACT.test(entry.name))
    .map((entry) => {
      const name = resolve(entry.parentPath, entry.name)
      return { content: readFileSync(name, "utf8"), name }
    })

export const assertNextBuildValues = ({
  appPathsManifest,
  artifacts,
  requiredServerFiles,
  routesManifest,
}) => {
  const errors = []
  const config = requiredServerFiles?.config ?? {}

  if (config.output !== "standalone") {
    errors.push('config.output must be "standalone"')
  }
  if (config.cacheComponents !== false) {
    errors.push("config.cacheComponents must be false")
  }
  if (config.skipProxyUrlNormalize !== true) {
    errors.push("config.skipProxyUrlNormalize must be true")
  }
  if (config.skipTrailingSlashRedirect !== true) {
    errors.push("config.skipTrailingSlashRedirect must be true")
  }
  if (!Array.isArray(routesManifest?.redirects)) {
    errors.push("routes manifest redirects must be an array")
  } else if (routesManifest.redirects.length > 0) {
    errors.push("application redirects must be empty")
  }
  if (!artifacts?.buildId) {
    errors.push("BUILD_ID is missing")
  }
  if (!artifacts?.standaloneServer) {
    errors.push("standalone server is missing")
  }
  if (!artifacts?.urlRegistryMigrationCli) {
    errors.push("URL registry migration CLI is missing")
  }
  if (!artifacts?.urlRegistryPopulationCli) {
    errors.push("URL registry population CLI is missing")
  }
  if (!artifacts?.urlRegistryMigrations) {
    errors.push("URL registry SQL migrations are missing")
  }
  errors.push(
    ...missingLegacyPublicAppRoutes(appPathsManifest).map(
      (route) => `gate-off compatibility route ${route} is missing`
    )
  )

  if (errors.length > 0) {
    throw new Error(
      `Invalid Next.js production artifact:\n- ${errors.join("\n- ")}`
    )
  }
}

export const assertActualNextBuild = () => {
  const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
  const nextRoot = resolve(appRoot, ".next")
  const readJson = (name) =>
    JSON.parse(readFileSync(resolve(nextRoot, name), "utf8"))

  assertNextBuildValues({
    appPathsManifest: readJson("server/app-paths-manifest.json"),
    artifacts: {
      buildId: existsSync(resolve(nextRoot, "BUILD_ID")),
      standaloneServer: existsSync(
        resolve(nextRoot, "standalone/apps/herbatika/server.js")
      ),
      urlRegistryMigrationCli: existsSync(
        resolve(
          nextRoot,
          "standalone/apps/herbatika/scripts/url-registry/migrate.mjs"
        )
      ),
      urlRegistryPopulationCli: existsSync(
        resolve(
          nextRoot,
          "standalone/apps/herbatika/scripts/url-registry/populate.mjs"
        )
      ),
      urlRegistryMigrations: existsSync(
        resolve(
          nextRoot,
          "standalone/apps/herbatika/src/lib/url-registry/migrations/0004_add_invalidation_delivery_diagnostics.sql"
        )
      ),
    },
    requiredServerFiles: readJson("required-server-files.json"),
    routesManifest: readJson("routes-manifest.json"),
  })
  assertNoPrivateClientMarkers(readClientArtifacts(resolve(nextRoot, "static")))
}

const entrypoint = process.argv[1]
const isEntrypoint =
  entrypoint !== undefined &&
  pathToFileURL(resolve(entrypoint)).href ===
    pathToFileURL(fileURLToPath(import.meta.url)).href

if (isEntrypoint) {
  assertActualNextBuild()
  process.stdout.write("Verified Next.js standalone production artifact\n")
}
